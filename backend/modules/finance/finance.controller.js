const Transaction = require("../../models/Transaction"); 
const User = require("../users/User.model");

// Submit a payment for Admin approval
exports.submitPaymentReceipt = async (req, res) => {
    try {
        const { amount, reference, paymentMethod, proof } = req.body;
        const userId = req.user._id;

        const newTransaction = new Transaction({
            userId,
            type: "credit",
            amount,
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

// Fetch pending payments for Admin
exports.getPendingPayments = async (req, res) => {
    try {
        // Querying pending payments to populate in the admin dashboard
        const pendingPayments = await Transaction.find({ status: "pending" })
            .populate("userId", "username email walletBalance");
        res.status(200).json(pendingPayments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching pending payments", error: error.message });
    }
};

// Approve payment and update user wallet
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);
        
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.status === "approved") return res.status(400).json({ message: "Transaction already processed" });

        // Update User Balance
        // We use $inc to safely add the transaction amount to the current balance
        await User.findByIdAndUpdate(transaction.userId, {
            $inc: { walletBalance: transaction.amount }
        });

        // Update Transaction Status
        transaction.status = "approved";
        await transaction.save();

        res.status(200).json({ message: "Payment approved and wallet credited" });
    } catch (error) {
        res.status(500).json({ message: "Error approving payment", error: error.message });
    }
};