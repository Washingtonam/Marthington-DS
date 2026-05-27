const Transaction = require("../models/transaction.model");
const User = require("../modules/users/User.model");

// Submit a payment
exports.submitPaymentReceipt = async (req, res) => {
    try {
        const { amount, reference, paymentMethod, proof } = req.body;
        const userId = req.user._id;

        const newTransaction = new Transaction({
            userId,
            type: "credit",
            amount, // Amount in Naira
            reference,
            status: "pending",
            description: `Wallet funding via ${paymentMethod}`,
            proof
        });

        await newTransaction.save();
        res.status(201).json({ message: "Payment submitted successfully", transaction: newTransaction });
    } catch (error) {
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
        
        // --- CONVERSION LOGIC ---
        // If there are legacy units, convert them to Naira (1 unit = 250 Naira)
        if (user.units > 0) {
            user.walletBalance += (user.units * 250);
            user.units = 0; // Clear units after conversion
        }

        // Add the new transaction amount
        user.walletBalance += transaction.amount;
        await user.save();

        // Update Transaction Status
        transaction.status = "approved";
        await transaction.save();

        res.status(200).json({ message: "Payment approved and wallet credited" });
    } catch (error) {
        res.status(500).json({ message: "Error approving payment", error: error.message });
    }
};