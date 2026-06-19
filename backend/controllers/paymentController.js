import razorpay, { razorpayKeyId } from "../config/razorpay.js";
import crypto from "crypto";
import Order from "../models/Order.js";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    console.log("[createRazorpayOrder] Incoming request:", req.body);

    const { amount, orderId } = req.body || {};

    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "amount and orderId are required"
      });
    }

    // DEBUG LOGS
    console.log("========== RAZORPAY DEBUG ==========");
    console.log("razorpay:", razorpay);
    console.log("typeof razorpay:", typeof razorpay);
    console.log("razorpayKeyId:", razorpayKeyId);
    console.log("====================================");

    // REMOVE FALSE 503 ISSUE
    if (!razorpay || !razorpay.orders) {
      console.error("[createRazorpayOrder] Razorpay instance invalid");

      return res.status(500).json({
        success: false,
        message: "Razorpay instance invalid"
      });
    }

    const paise = Math.round(Number(amount) * 100);

    const options = {
      amount: paise,
      currency: "INR",
      receipt: `vrinda_order_${Date.now()}`
    };

    console.log("[createRazorpayOrder] Creating order with:", options);

    const rOrder = await razorpay.orders.create(options);

    console.log("[createRazorpayOrder] SUCCESS:", rOrder);

    return res.status(200).json({
      success: true,
      id: rOrder.id,
      amount: rOrder.amount,
      currency: rOrder.currency,
      key: razorpayKeyId,
      order: rOrder
    });

  } catch (error) {
    console.error("[createRazorpayOrder] FULL ERROR:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order"
    });
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    order.paymentStatus = "paid";
    order.isPaid = true;
    order.paidAt = new Date();
    order.orderStatus = "confirmed";
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.paymentMethod = "RAZORPAY";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified",
      order
    });

  } catch (error) {
    console.error("[verifyRazorpayPayment] ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed"
    });
  }
};

export const markRazorpayPaymentFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required"
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Keep order record for audit but mark payment as failed
    order.paymentStatus = "failed";
    order.isPaid = false;
    order.orderStatus = "payment_failed";

    if (!order.razorpayPaymentId && reason) {
      order.razorpayPaymentId = String(reason).slice(0, 100);
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
      order
    });
  } catch (error) {
    console.error("[markRazorpayPaymentFailure] ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark payment failure"
    });
  }
};