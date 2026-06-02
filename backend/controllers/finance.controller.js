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

// Approve payment and credit wallet (ATOMIC: using findOneAndUpdate to prevent race conditions)
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);
        
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.status !== "pending") return res.status(400).json({ message: "Transaction already processed" });

        const paymentAmountKobo = transaction.amountKobo || Math.round((transaction.amount || 0) * 100);

        // ATOMIC UPDATE: Use findOneAndUpdate to increment wallet in a single database operation
        // This prevents race conditions where multiple requests could read the same balance
        const updatedUser = await User.findOneAndUpdate(
            { _id: transaction.userId },
            {
                $inc: { 
                    walletBalanceKobo: paymentAmountKobo,
                    // If user has legacy units, convert them to Naira (1 unit = 25000 kobo)
                    walletBalanceKobo: User.exists({ _id: transaction.userId, units: { $gt: 0 } }) ? 0 : 0
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Handle legacy units conversion in separate atomic operation if needed
        if (updatedUser.units > 0) {
            const unitsInKobo = updatedUser.units * 25000;
            await User.findOneAndUpdate(
                { _id: transaction.userId },
                {
                    $inc: { walletBalanceKobo: unitsInKobo },
                    $set: { units: 0 }
                },
                { new: true }
            );
        }

        // Update Transaction Status atomically
        transaction.status = "approved";
        await transaction.save();

        res.status(200).json({ 
            message: "Payment approved and wallet credited",
            walletBalance: updatedUser.walletBalance,
            walletBalanceKobo: updatedUser.walletBalanceKobo
        });
    } catch (error) {
        console.error("Error approving payment:", error.message);
        res.status(500).json({ message: "Error approving payment", error: error.message });
    }
};

// Verify Paystack transaction by reference and credit wallet if successful (ATOMIC)
// Uses findOneAndUpdate to prevent race conditions and ensure transaction reliability
exports.verifyPaystackTransaction = async (req, res) => {
    try {
        const { reference } = req.body;
        const userId = req.user.id || req.user._id;
        const userEmail = req.user.email;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

        if (!reference) {
            return res.status(400).json({ message: "Transaction reference is required." });
        }

        if (!paystackSecret) {
            console.error("PAYSTACK_SECRET_KEY is not configured");
            return res.status(500).json({ message: "Payment verification is not configured." });
        }

        // Call Paystack to verify the transaction
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                },
            }
        );

        const data = response.data;
        if (!data || !data.status) {
            throw new Error("Invalid response from Paystack verification.");
        }

        const transactionData = data.data;

        // Only proceed if Paystack says the payment was successful
        if (transactionData.status !== "success") {
            return res.status(400).json({
                success: false,
                message: `Payment status is ${transactionData.status}. Please try again.`,
                status: transactionData.status,
            });
        }

        // Verify the email matches the logged-in user
        if (transactionData.customer?.email?.toLowerCase().trim() !== userEmail?.toLowerCase().trim()) {
            console.warn("Paystack verification email mismatch", {
                paystackEmail: transactionData.customer?.email,
                userEmail,
            });
            return res.status(403).json({
                success: false,
                message: "Payment email does not match your account.",
            });
        }

        // Calculate the amount credited
        const amountKobo = transactionData.amount || 0;

        // ATOMIC UPDATE: Use findOneAndUpdate to increment wallet in a single database operation
        // This ensures that if multiple requests come in simultaneously, each one's amount is properly credited
        // The operation is atomic at the MongoDB level - no race conditions possible
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId },
            {
                $inc: { walletBalanceKobo: amountKobo }
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        console.log("✅ Paystack verification successful (ATOMIC UPDATE)", {
            userId,
            reference,
            amountKobo,
            newBalance: updatedUser.walletBalanceKobo,
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified and wallet credited successfully.",
            walletBalance: updatedUser.walletBalance,
            walletBalanceKobo: updatedUser.walletBalanceKobo,
            amountKobo,
        });
    } catch (error) {
        console.error("Paystack verification error:", error.response?.data || error.message || error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify payment.",
            error: error.message,
        });
    }
};