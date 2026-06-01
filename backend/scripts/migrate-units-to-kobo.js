const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User.model');

// Each unit = 250 Naira
const KOBO_PER_UNIT = 25000;

async function migrate() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Aborting migration.');
    process.exit(1);
  }

  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const users = await User.find({ units: { $gt: 0 } }).session(session);
    console.log(`Found ${users.length} users with legacy units.`);

    for (const user of users) {
      const additionalKobo = (user.units || 0) * KOBO_PER_UNIT;
      if (!user.walletBalanceKobo) user.walletBalanceKobo = 0;
      user.walletBalanceKobo += additionalKobo;
      console.log(`User ${user._id}: units=${user.units} => add ${additionalKobo} kobo`);
      user.units = 0;
      await user.save({ session });
    }

    await session.commitTransaction();
    console.log('Migration completed successfully.');
    session.endSession();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await session.abortTransaction();
    session.endSession();
    process.exit(1);
  }
}

migrate();
