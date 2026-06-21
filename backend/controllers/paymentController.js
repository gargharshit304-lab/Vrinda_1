import razorpay, { razorpayKeyId } from "../config/razorpay.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { normalizeAddressInput as normalizeShippingAddress, syncUserAddressFromOrder } from "../utils/userProfile.js";

const buildOrderNumber = () => `ORD-${nanoid(10)}`;

/**
 * POST /payment/create-order
 *
 * Creates a Razorpay order only (NO MongoDB order).
 * Body: { amount }
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount } = req.body || {};

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "amount is required"
      });
    }

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

    console.log("[createRazorpayOrder] Creating Razorpay order with:", options);

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

/**
 * POST /payment/verify
 *
 * Verifies Razorpay payment signature, then creates the MongoDB order.
 * This is the ONLY place where a Razorpay order is saved to the database.
 *
 * Body: {
 *   razorpay_order_id, razorpay_payment_id, razorpay_signature,
 *   items, shippingAddress, paymentMethod, couponCode, discount
 * }
 */
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress,
      paymentMethod,
      couponCode,
      discount = 0
    } = req.body || {};

    // --- 1. Validate Razorpay fields ---
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment fields"
      });
    }

    // --- 2. Verify signature ---
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // --- 3. Validate user ---
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    if (req.user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins are not allowed to place orders"
      });
    }

    // --- 4. Validate items ---
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Items are required"
      });
    }

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    const normalizedShippingAddress = normalizeShippingAddress(shippingAddress);

    // --- 5. Validate & normalize each item ---
    const normalizedItems = [];
    let subtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productId = String(item?.productId || item?.product || "").trim();
      const quantity = Number(item?.quantity);
      const price = Number(item?.price);

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: Invalid or missing product ID`
        });
      }

      if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: Quantity must be a positive whole number`
        });
      }

      if (!price || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: Price must be a positive number`
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Item ${i + 1}: Product not found`
        });
      }

      if (product.status !== "active") {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} (${product.name}) is no longer available`
        });
      }

      if (Number(product.stock) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} (${product.name}): Only ${product.stock} in stock`
        });
      }

      const productPrice = Number(product.price) || 0;
      subtotal += productPrice * quantity;

      normalizedItems.push({
        product: product._id,
        name: product.name,
        price: productPrice,
        quantity
      });
    }

    // --- 6. Calculate totals ---
    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 0;
    const subtotalBeforeDiscount = subtotal + deliveryFee;
    const validatedDiscount = Math.max(0, Math.min(discount || 0, subtotalBeforeDiscount));
    const totalPrice = subtotalBeforeDiscount - validatedDiscount;

    if (totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order total must be greater than zero"
      });
    }

    // --- 7. Create the MongoDB order (payment already verified!) ---
    const order = await Order.create({
      orderNumber: buildOrderNumber(),
      user: req.user._id,
      items: normalizedItems,
      shippingAddress: normalizedShippingAddress,
      paymentMethod: "RAZORPAY",
      paymentStatus: "paid",
      isPaid: true,
      paidAt: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      couponCode: couponCode ? couponCode.toUpperCase() : null,
      discount: validatedDiscount,
      status: "Pending",
      statusHistory: {
        pendingAt: new Date(),
        packedAt: null,
        outForDeliveryAt: null,
        deliveredAt: null
      },
      orderStatus: "confirmed",
      subtotal,
      deliveryFee,
      totalAmount: totalPrice
    });

    console.log("[verifyRazorpayPayment] Order created:", order._id);

    // --- 8. Deduct stock ---
    const stockUpdateResults = [];
    const stockUpdateErrors = [];

    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      try {
        const updatedProduct = await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: -item.quantity,
              sold: item.quantity
            }
          },
          { new: true, runValidators: false }
        );

        if (!updatedProduct) {
          stockUpdateErrors.push(`Item ${i + 1} (${item.name}): Product not found during stock update`);
          continue;
        }

        if (updatedProduct.stock < 0) {
          updatedProduct.stock = 0;
          await updatedProduct.save();
        }

        stockUpdateResults.push({
          productId: updatedProduct._id,
          name: updatedProduct.name,
          quantity: item.quantity,
          newStock: updatedProduct.stock,
          newSoldCount: updatedProduct.sold
        });

        console.log(
          `[verifyRazorpayPayment] Stock deducted for ${updatedProduct.name}: ` +
          `qty=${item.quantity}, newStock=${updatedProduct.stock}, sold=${updatedProduct.sold}`
        );
      } catch (stockError) {
        console.error(`[verifyRazorpayPayment] Stock deduction failed for item ${i + 1}:`, stockError.message);
        stockUpdateErrors.push(`Item ${i + 1} (${item.name}): ${stockError.message}`);
      }
    }

    order.stockDeducted = true;
    order.inventoryUpdatedAt = new Date();
    order.inventoryUpdateDetails = {
      updatedItems: stockUpdateResults,
      errors: stockUpdateErrors
    };
    await order.save();

    // --- 9. Increment coupon usage ---
    if (couponCode) {
      try {
        await Coupon.findOneAndUpdate(
          { code: couponCode.toUpperCase() },
          { $inc: { usedCount: 1 } },
          { new: true }
        );
        console.log("[verifyRazorpayPayment] Coupon usage incremented for:", couponCode);
      } catch (couponError) {
        console.warn("[verifyRazorpayPayment] Failed to update coupon usage:", couponError.message);
      }
    }

    // --- 10. Sync user address ---
    try {
      await syncUserAddressFromOrder(req.user._id, normalizedShippingAddress);
    } catch (profileSyncError) {
      console.warn("[verifyRazorpayPayment] Failed to sync user address:", profileSyncError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and order created",
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

/**
 * POST /payment/failure
 *
 * No-op: Since we no longer create an order before payment,
 * there is nothing to mark as failed. Kept for backwards compatibility.
 */
export const markRazorpayPaymentFailure = async (req, res) => {
  console.log("[markRazorpayPaymentFailure] No-op — no pre-payment order exists to mark.");
  return res.status(200).json({
    success: true,
    message: "No action needed — order was not created"
  });
};