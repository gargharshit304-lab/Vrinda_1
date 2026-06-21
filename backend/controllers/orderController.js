import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { normalizeAddressInput as normalizeShippingAddress, syncUserAddressFromOrder } from "../utils/userProfile.js";

const buildOrderNumber = () => `ORD-${nanoid(10)}`;

const canonicalOrderStatuses = {
  pending: { status: "Pending", orderStatus: "pending" },
  processing: { status: "Pending", orderStatus: "pending" },
  packed: { status: "Packed", orderStatus: "packed" },
  "out for delivery": { status: "Out for Delivery", orderStatus: "shipped" },
  shipped: { status: "Out for Delivery", orderStatus: "shipped" },
  delivered: { status: "Delivered", orderStatus: "delivered" }
};

const buildStrictPendingOrderFilter = () => ({
  $or: [
    { paymentStatus: { $regex: "^pending$", $options: "i" } },
    { orderStatus: { $regex: "^(processing|packed|shipped)$", $options: "i" } }
  ]
});

const normalizeOrderStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return canonicalOrderStatuses[normalized] || null;
};

const getStatusHistory = (order) => {
  const history = order?.statusHistory;

  if (history && typeof history === "object" && !Array.isArray(history)) {
    return history;
  }

  return {
    pendingAt: null,
    packedAt: null,
    outForDeliveryAt: null,
    deliveredAt: null
  };
};

const applyStatusTimestamp = (order, status, timestamp = new Date()) => {
  const history = getStatusHistory(order);

  if (status === "Pending") {
    history.pendingAt = history.pendingAt || timestamp;
  }

  if (status === "Packed") {
    history.packedAt = history.packedAt || timestamp;
  }

  if (status === "Out for Delivery") {
    history.outForDeliveryAt = history.outForDeliveryAt || timestamp;
  }

  if (status === "Delivered") {
    history.deliveredAt = history.deliveredAt || timestamp;
  }

  order.statusHistory = history;
};

const buildDateRange = (month) => {
  if (month !== "current") {
    return null;
  }

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
};

const buildOrderStatusFilter = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (!normalized || normalized === "all") {
    return null;
  }

  if (normalized === "pending") {
    return buildStrictPendingOrderFilter();
  }

  if (normalized === "paid") {
    return { paymentStatus: "paid" };
  }

  if (normalized === "failed") {
    return { paymentStatus: "failed" };
  }

  if (normalized === "delivered") {
    return {
      $or: [{ orderStatus: "delivered" }, { status: "Delivered" }]
    };
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return {
      $or: [{ orderStatus: "cancelled" }, { orderStatus: "canceled" }]
    };
  }

  return null;
};

const buildAdminOrderFilter = ({ month, status }) => {
  const statusFilter = buildOrderStatusFilter(status);

  if (statusFilter) {
    return statusFilter;
  }

  const monthRange = buildDateRange(month);
  if (!monthRange) {
    return {};
  }

  return {
    $or: [
      { createdAt: { $gte: monthRange.start, $lt: monthRange.end } },
      buildStrictPendingOrderFilter()
    ]
  };
};

export const createOrder = async (req, res, next) => {
  try {
    // Debug: Log incoming request
    console.log("[createOrder] Incoming request body:", JSON.stringify(req.body, null, 2));
    console.log("[createOrder] User:", req.user?._id);

    // Admin check
    if (req.user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins are not allowed to place orders"
      });
    }

    // Validate user exists
    if (!req.user?._id) {
      console.log("[createOrder] Validation failed: User ID missing");
      const error = new Error("User not authenticated. Please log in and try again.");
      error.statusCode = 401;
      throw error;
    }

    const { items, shippingAddress, paymentMethod = "COD", couponCode, discount = 0 } = req.body;

    // Log payment method explicitly for debugging
    console.log("[createOrder] PAYMENT METHOD:", paymentMethod);

    // Normalize payment method to canonical uppercase token expected by schema
    const normalizedPaymentMethod = String(paymentMethod || "").trim().toUpperCase();
    const allowedPaymentMethods = new Set(["COD", "RAZORPAY", "ONLINE"]);
    const finalPaymentMethod = allowedPaymentMethods.has(normalizedPaymentMethod) ? normalizedPaymentMethod : "COD";

    // Block Razorpay orders — they must be created via /payment/verify after payment success
    if (finalPaymentMethod === "RAZORPAY" || finalPaymentMethod === "ONLINE") {
      return res.status(400).json({
        success: false,
        message: "Razorpay orders cannot be created directly. Use the payment flow."
      });
    }

    // Validate items array
    if (!Array.isArray(items) || !items.length) {
      console.log("[createOrder] Validation failed: Items array is empty or not an array");
      const error = new Error("Your cart is empty. Please add items before checkout.");
      error.statusCode = 400;
      throw error;
    }

    // Validate shipping address
    if (!shippingAddress || typeof shippingAddress !== "object") {
      console.log("[createOrder] Validation failed: Shipping address missing or invalid");
      const error = new Error("Shipping address is required for checkout.");
      error.statusCode = 400;
      throw error;
    }

    const normalizedShippingAddress = normalizeShippingAddress(shippingAddress);

    const normalizedItems = [];
    let subtotal = 0;

    // Validate and process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[createOrder] Processing item ${i + 1}:`, JSON.stringify(item, null, 2));

      const productId = String(item?.productId || item?.product || "").trim();
      const quantity = Number(item?.quantity);
      const price = Number(item?.price);

      // Validate productId
      if (!productId) {
        console.log(`[createOrder] Validation failed: Item ${i + 1} has no productId`);
        const error = new Error(`Item ${i + 1}: Product ID is missing.`);
        error.statusCode = 400;
        throw error;
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        console.log(`[createOrder] Validation failed: Item ${i + 1} has invalid productId format`);
        const error = new Error(`Item ${i + 1}: Invalid product ID format.`);
        error.statusCode = 400;
        throw error;
      }

      // Validate quantity
      if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
        console.log(`[createOrder] Validation failed: Item ${i + 1} has invalid quantity (${quantity})`);
        const error = new Error(`Item ${i + 1}: Quantity must be a positive whole number.`);
        error.statusCode = 400;
        throw error;
      }

      // Validate price
      if (!price || price <= 0) {
        console.log(`[createOrder] Validation failed: Item ${i + 1} has invalid price (${price})`);
        const error = new Error(`Item ${i + 1}: Price must be a positive number.`);
        error.statusCode = 400;
        throw error;
      }

      // Check if product exists in database
      const product = await Product.findById(productId);

      if (!product) {
        console.log(`[createOrder] Validation failed: Product ${productId} not found in database`);
        const error = new Error(`Product not found. Item ${i + 1} may have been removed.`);
        error.statusCode = 404;
        throw error;
      }

      // Check if product is active
      const isActive = product?.status === "active";
      if (!isActive) {
        console.log(`[createOrder] Validation failed: Product ${productId} is not active (status: ${product.status})`);
        const error = new Error(`Item ${i + 1} (${product.name}) is no longer available.`);
        error.statusCode = 400;
        throw error;
      }

      // Check stock
      const hasEnoughStock = Number(product?.stock) >= quantity;
      if (!hasEnoughStock) {
        console.log(`[createOrder] Validation failed: Product ${productId} insufficient stock (available: ${product.stock}, requested: ${quantity})`);
        const error = new Error(`Item ${i + 1} (${product.name}): Only ${product.stock} in stock.`);
        error.statusCode = 400;
        throw error;
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

    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 0;
    const subtotalBeforeDiscount = subtotal + deliveryFee;
    
    // Validate discount
    const validatedDiscount = Math.max(0, Math.min(discount || 0, subtotalBeforeDiscount));
    
    const totalPrice = subtotalBeforeDiscount - validatedDiscount;

    console.log("[createOrder] Validation passed. Creating order with totals:", { subtotal, deliveryFee, discount: validatedDiscount, totalPrice });

    if (totalPrice <= 0) {
      console.log("[createOrder] Validation failed: Total price is not positive");
      const error = new Error("Order total must be greater than zero.");
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.create({
      orderNumber: buildOrderNumber(),
      user: req.user._id,
      items: normalizedItems,
      shippingAddress: normalizedShippingAddress,
      paymentMethod: finalPaymentMethod,
      paymentStatus: "pending",
      isPaid: false,
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

    console.log("[createOrder] Order created successfully:", order._id);

    // === STOCK DEDUCTION AT ORDER CREATION ===
    // Deduct stock immediately to prevent overselling
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

        // Correct negative stock to 0
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
          `[createOrder] Stock deducted for ${updatedProduct.name}: ` +
          `qty=${item.quantity}, newStock=${updatedProduct.stock}, sold=${updatedProduct.sold}`
        );
      } catch (stockError) {
        console.error(`[createOrder] Stock deduction failed for item ${i + 1}:`, stockError.message);
        stockUpdateErrors.push(`Item ${i + 1} (${item.name}): ${stockError.message}`);
      }
    }

    // Mark stock as deducted on the order
    order.stockDeducted = true;
    order.inventoryUpdatedAt = new Date();
    order.inventoryUpdateDetails = {
      updatedItems: stockUpdateResults,
      errors: stockUpdateErrors
    };
    await order.save();

    console.log(`[createOrder] Stock deduction complete: ${stockUpdateResults.length} items updated, ${stockUpdateErrors.length} errors`);

    // Increment coupon usage if applied
    if (couponCode) {
      try {
        await Coupon.findOneAndUpdate(
          { code: couponCode.toUpperCase() },
          { $inc: { usedCount: 1 } },
          { new: true }
        );
        console.log("[createOrder] Coupon usage incremented for:", couponCode);
      } catch (couponError) {
        console.warn("[createOrder] Failed to update coupon usage:", couponError.message);
        // Don't fail the order if coupon update fails
      }
    }

    try {
      await syncUserAddressFromOrder(req.user._id, normalizedShippingAddress);
    } catch (profileSyncError) {
      console.warn("[createOrder] Failed to sync user address from order:", profileSyncError.message);
    }

    res.status(201).json({
      ...order.toObject(),
      totalPrice
    });
  } catch (error) {
    console.log("[createOrder] Error:", error.message);
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const { month, status } = req.query || {};
    const baseFilter = isAdmin ? buildAdminOrderFilter({ month, status }) : { user: req.user._id };

    // Exclude payment_failed orders so cancelled/failed Razorpay payments never appear
    const filter = { ...baseFilter, paymentStatus: { $ne: "failed" }, orderStatus: { $ne: "payment_failed" } };

    let query = Order.find(filter)
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    if (isAdmin) {
      query = query.populate("user", "name email role");
    }

    const orders = await query;

    // Normalize legacy statuses and ensure statusHistory has pendingAt
    orders.forEach((order) => {
      try {
        if (String(order.status) === "Processing") {
          order.status = "Pending";
        }

        if (String(order.orderStatus).toLowerCase() === "processing") {
          order.orderStatus = "pending";
        }

        if (!order.statusHistory || typeof order.statusHistory !== "object") {
          order.statusHistory = {
            pendingAt: order.createdAt || null,
            packedAt: null,
            outForDeliveryAt: null,
            deliveredAt: null
          };
        } else if (!order.statusHistory.pendingAt) {
          order.statusHistory.pendingAt = order.createdAt || null;
        }
      } catch (err) {
        // ignore normalization failures per-order
      }
    });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    // Exclude payment_failed orders so cancelled/failed Razorpay payments never appear
    const orders = await Order.find({
      user: req.user._id,
      paymentStatus: { $ne: "failed" },
      orderStatus: { $ne: "payment_failed" }
    })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    orders.forEach((order) => {
      try {
        if (String(order.status) === "Processing") {
          order.status = "Pending";
        }

        if (String(order.orderStatus).toLowerCase() === "processing") {
          order.orderStatus = "pending";
        }

        if (!order.statusHistory || typeof order.statusHistory !== "object") {
          order.statusHistory = {
            pendingAt: order.createdAt || null,
            packedAt: null,
            outForDeliveryAt: null,
            deliveredAt: null
          };
        } else if (!order.statusHistory.pendingAt) {
          order.statusHistory.pendingAt = order.createdAt || null;
        }
      } catch (err) {}
    });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email role")
      .populate("items.product", "name image price");
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const orderUserId = order.user?._id ? order.user._id.toString() : order.user?.toString?.() || "";
    const loggedInUserId = req.user?._id?.toString?.() || "";

    // eslint-disable-next-line no-console
    console.log("Order user:", order.user);
    // eslint-disable-next-line no-console
    console.log("Logged in user:", req.user?._id);

    if (orderUserId !== loggedInUserId && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Normalize legacy statuses and ensure statusHistory has pendingAt
    try {
      if (String(order.status) === "Processing") {
        order.status = "Pending";
      }

      if (String(order.orderStatus).toLowerCase() === "processing") {
        order.orderStatus = "pending";
      }

      if (!order.statusHistory || typeof order.statusHistory !== "object") {
        order.statusHistory = {
          pendingAt: order.createdAt || null,
          packedAt: null,
          outForDeliveryAt: null,
          deliveredAt: null
        };
      } else if (!order.statusHistory.pendingAt) {
        order.statusHistory.pendingAt = order.createdAt || null;
      }
    } catch (err) {
      // ignore
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, orderStatus } = req.body;
    const order = await Order.findById(req.params.id).populate("items.product");

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const nextStatus = normalizeOrderStatus(status || orderStatus);

    if (!nextStatus) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    const previousStatus = order.status;
    order.status = nextStatus.status;
    order.orderStatus = nextStatus.orderStatus;
    applyStatusTimestamp(order, nextStatus.status);

    // Update inventory when order is marked as Delivered
    // Only deduct if stock was NOT already deducted at order creation (legacy orders)
    if (nextStatus.status === "Delivered" && previousStatus !== "Delivered" && !order.stockDeducted) {
      console.log(`[updateOrderStatus] Order ${order.orderNumber} marked as Delivered. Updating inventory (legacy order, stock not yet deducted)...`);

      const updateResults = [];
      const errors = [];

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];

        if (!item.product) {
          console.log(`[updateOrderStatus] Item ${i + 1}: Product reference is missing`);
          errors.push(`Item ${i + 1}: Product reference missing`);
          continue;
        }

        try {
          const productId = item.product._id || item.product;
          const quantity = Number(item.quantity) || 0;

          if (quantity <= 0) {
            console.log(`[updateOrderStatus] Item ${i + 1}: Invalid quantity (${quantity})`);
            errors.push(`Item ${i + 1}: Invalid quantity`);
            continue;
          }

          // Use atomic operations to prevent race conditions
          const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
              $inc: {
                stock: -quantity,
                sold: quantity
              }
            },
            {
              new: true,
              runValidators: false
            }
          );

          if (!updatedProduct) {
            console.log(`[updateOrderStatus] Item ${i + 1}: Product ${productId} not found in database`);
            errors.push(`Item ${i + 1}: Product not found`);
            continue;
          }

          // Ensure stock doesn't go negative (post-update check)
          if (updatedProduct.stock < 0) {
            console.log(`[updateOrderStatus] Item ${i + 1}: Stock went negative (${updatedProduct.stock}). Correcting to 0.`);
            updatedProduct.stock = 0;
            await updatedProduct.save();
          }

          console.log(
            `[updateOrderStatus] Item ${i + 1} (${updatedProduct.name}): ` +
            `Stock decreased by ${quantity} (new: ${updatedProduct.stock}), ` +
            `Sold increased by ${quantity} (new: ${updatedProduct.sold})`
          );

          updateResults.push({
            productId: updatedProduct._id,
            name: updatedProduct.name,
            quantity,
            newStock: updatedProduct.stock,
            newSoldCount: updatedProduct.sold
          });
        } catch (itemError) {
          console.error(
            `[updateOrderStatus] Error updating item ${i + 1}:`,
            itemError.message
          );
          errors.push(`Item ${i + 1}: ${itemError.message}`);
        }
      }

      // Log summary
      console.log(`[updateOrderStatus] Inventory update complete for order ${order.orderNumber}:`, {
        itemsProcessed: updateResults.length,
        errors: errors.length,
        results: updateResults
      });

      // Mark stock as deducted and store audit trail
      order.stockDeducted = true;
      if (!order.inventoryUpdatedAt) {
        order.inventoryUpdatedAt = new Date();
        order.inventoryUpdateDetails = {
          updatedItems: updateResults,
          errors: errors
        };
      }
    } else if (nextStatus.status === "Delivered" && previousStatus !== "Delivered" && order.stockDeducted) {
      console.log(`[updateOrderStatus] Order ${order.orderNumber} marked as Delivered. Stock already deducted at order creation — skipping.`);
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email role")
      .populate("items.product", "name image price");

    res.status(200).json(populatedOrder || order);
  } catch (error) {
    next(error);
  }
};
