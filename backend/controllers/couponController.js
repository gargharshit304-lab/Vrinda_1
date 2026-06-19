import Coupon from "../models/Coupon.js";

// Apply coupon - Calculate discount for checkout
export const applyCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code || cartTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code and cart total are required",
      });
    }

    // Convert to uppercase
    const upperCode = code.toUpperCase().trim();

    // Find coupon
    const coupon = await Coupon.findOne({ code: upperCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // Check if active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon is no longer active",
      });
    }

    // Check expiry
    if (new Date() > coupon.expiryDate) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired",
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit",
      });
    }

    // Check minimum order amount
    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required to apply this coupon`,
      });
    }

    // Calculate discount
    let discount = 0;

    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.discountValue) / 100;

      // Apply max discount limit if exists
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === "flat") {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed cart total
    discount = Math.min(discount, cartTotal);

    // Calculate final total
    const finalTotal = Math.max(0, cartTotal - discount);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discount: Math.round(discount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      code: upperCode,
      couponData: {
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error applying coupon",
      error: error.message,
    });
  }
};

// Get public coupons - Show available coupons to users
export const getPublicCoupons = async (req, res) => {
  try {
    const now = new Date();

    // Get active, non-expired coupons
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: now },
    }).select("code discountType discountValue minOrderAmount description maxDiscount");

    const formattedCoupons = coupons
      .filter((coupon) => !coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
      .map((coupon) => ({
        code: coupon.code,
        description: coupon.description || `${coupon.discountValue}${coupon.discountType === "percentage" ? "%" : "₹"} off`,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
      }));

    return res.status(200).json({
      success: true,
      coupons: formattedCoupons,
      count: formattedCoupons.length,
    });
  } catch (error) {
    console.error("Error fetching public coupons:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

// Admin: Create coupon
export const createCoupon = async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      expiryDate,
      usageLimit,
      description,
      isActive,
    } = req.body;

    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    const normalizedDiscountValue = Number(discountValue);
    const normalizedExpiryDate = expiryDate ? new Date(expiryDate) : null;

    // Validate required fields
    if (
      !normalizedCode ||
      !discountType ||
      !normalizedDiscountValue ||
      !normalizedExpiryDate ||
      Number.isNaN(normalizedExpiryDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "code, discount type, discount value, and expiry date are required",
      });
    }

    // Check if coupon already exists
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // Validate expiry date
    if (normalizedExpiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    const newCoupon = await Coupon.create({
      code: normalizedCode,
      discountType,
      discountValue: normalizedDiscountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      expiryDate: normalizedExpiryDate,
      usageLimit: usageLimit || null,
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating coupon",
      error: error.message,
    });
  }
};

// Admin: Get all coupons
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

// Admin: Update coupon
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow changing code
    if (updateData.code) {
      delete updateData.code;
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Validate expiry date if being updated
    if (updateData.expiryDate && new Date(updateData.expiryDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating coupon",
      error: error.message,
    });
  }
};

// Admin: Delete coupon
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
      coupon,
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting coupon",
      error: error.message,
    });
  }
};

// Admin: Get coupon by ID
export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching coupon",
      error: error.message,
    });
  }
};
