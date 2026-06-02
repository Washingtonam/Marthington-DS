const axios = require("axios");
const Transaction = require("../models/transaction.model");
const User = require("../models/User.model");
const Payment = require("../models/Payment.model");
const PaymentRequest = require("../models/PaymentRequest.model");
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

// Initiate Paystack payment
exports.initiatePaystackPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id || req.user._id;
        const userEmail = req.user.email;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

        if (!userEmail) {
            return res.status(400).json({ message: "User email is required." });
        }

        if (!paystackSecret) {
            console.error("PAYSTACK_SECRET_KEY is not configured");
            return res.status(500).json({ message: "Payment gateway is not configured." });
        }

        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: "Invalid amount." });
        }

        const amountKobo = Math.round(parsedAmount * 100);
        const callbackUrl = `${process.env.FRONTEND_URL || "https://xcombinator.onrender.com"}/wallet?paystack=success`;

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: userEmail,
                amount: amountKobo,
                callback_url: callbackUrl,
            },
            {
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = response.data;
        if (!data || !data.status || !data.data) {
            throw new Error("Invalid response from Paystack initialization.");
        }

        return res.status(200).json({
            authorizationUrl: data.data.authorization_url,
            reference: data.data.reference,
        });
    } catch (error) {
        console.error("Paystack initialization error:", error.response?.data || error.message || error);
        return res.status(500).json({ message: "Failed to initialize Paystack payment." });
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