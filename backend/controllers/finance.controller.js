const Transaction = require("../models/transaction.model");
const User = require("../models/User.model");
const { ensureUploaded } = require("../shared/cloudinary");

// Submit a payment
exports.submitPaymentReceipt = async (req, res) => {
    try {
        const { amount, reference, paymentMethod, proof } = req.body;
        const userId = req.user.id || req.user._id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: user context missing." });
        }

        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: "Invalid payment amount." });
        }

        if (!proof) {
            return res.status(400).json({ message: "Payment proof is required." });
        }

        const amountKobo = Math.round(parsedAmount * 100);
        const proofUrl = await ensureUploaded(proof, 'payment_proofs');

        const newTransaction = new Transaction({
            userId,
            type: "credit",
            amount: parsedAmount,
            amountKobo,
            reference,
            status: "pending",
            description: `Wallet funding via ${paymentMethod || "bank transfer"}`,
            proof: proofUrl
        });

        await newTransaction.save();
        res.status(201).json({ message: "Payment submitted successfully", transaction: newTransaction });
    } catch (error) {
        console.error("FINANCE SUBMIT PAYMENT ERROR:", error);
        res.status(500).json({ message: "Error submitting payment", error: error.message });
    }
};

// Fetch pending payments
exports.getPendingPayments = async (req, res) => {
    try {
        const pendingPayments = await Transaction.find({ status: "pending" })
            .populate("userId", "email");
        res.status(200).json(pendingPayments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching pending payments", error: error.message });
    }
};

// Approve payment and credit wallet
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);
        
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.status !== "pending") return res.status(400).json({ message: "Transaction already processed" });

        // Update User Balance: Add the Naira amount to walletBalance
        const user = await User.findById(transaction.userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.walletBalanceKobo == null) {
            user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
        }

        // --- CONVERSION LOGIC ---
        // If there are legacy units, convert them to Naira (1 unit = 250 Naira => 25000 kobo)
        if (user.units > 0) {
            user.walletBalanceKobo += user.units * 25000;
            user.units = 0; // Clear legacy units after conversion
        }

        const paymentAmountKobo = transaction.amountKobo || Math.round((transaction.amount || 0) * 100);
        user.walletBalanceKobo += paymentAmountKobo;
        await user.save();

        // Update Transaction Status
        transaction.status = "approved";
        await transaction.save();

        res.status(200).json({ message: "Payment approved and wallet credited" });
    } catch (error) {
        res.status(500).json({ message: "Error approving payment", error: error.message });
    }
};