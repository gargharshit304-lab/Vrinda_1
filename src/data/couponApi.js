import { apiRequest } from "./apiClient.js";

// Apply coupon during checkout
export const applyCouponRequest = async (code, cartTotal) => {
  try {
    const response = await apiRequest("/coupons/apply", {
      method: "POST",
      auth: true,
      body: {
        code: code.toUpperCase(),
        cartTotal: Number(cartTotal),
      },
    });

    return {
      success: response.success,
      discount: response.discount || 0,
      finalTotal: response.finalTotal || cartTotal,
      code: response.code,
      message: response.message,
      couponData: response.couponData,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to apply coupon",
      discount: 0,
      finalTotal: cartTotal,
    };
  }
};

// Get public available coupons
export const getPublicCouponsRequest = async () => {
  try {
    const response = await apiRequest("/coupons/public", {
      method: "GET",
      auth: false,
    });

    return {
      success: response.success,
      coupons: response.coupons || [],
      count: response.count || 0,
    };
  } catch (error) {
    console.error("Failed to fetch public coupons:", error.message);
    return {
      success: false,
      coupons: [],
      count: 0,
    };
  }
};

// Admin: Create coupon
export const createCouponRequest = async (couponData) => {
  try {
    const response = await apiRequest("/coupons", {
      method: "POST",
      auth: true,
      body: couponData,
    });

    return {
      success: response.success,
      coupon: response.coupon,
      message: response.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create coupon",
    };
  }
};

// Admin: Get all coupons
export const getAllCouponsRequest = async () => {
  try {
    const response = await apiRequest("/coupons", {
      method: "GET",
      auth: true,
    });

    return {
      success: response.success,
      coupons: response.coupons || [],
      count: response.count || 0,
    };
  } catch (error) {
    return {
      success: false,
      coupons: [],
      count: 0,
      message: error.message,
    };
  }
};

// Admin: Get coupon by ID
export const getCouponByIdRequest = async (id) => {
  try {
    const response = await apiRequest(`/coupons/${id}`, {
      method: "GET",
      auth: true,
    });

    return {
      success: response.success,
      coupon: response.coupon,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Admin: Update coupon
export const updateCouponRequest = async (id, updateData) => {
  try {
    const response = await apiRequest(`/coupons/${id}`, {
      method: "PUT",
      auth: true,
      body: updateData,
    });

    return {
      success: response.success,
      coupon: response.coupon,
      message: response.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Admin: Delete coupon
export const deleteCouponRequest = async (id) => {
  try {
    const response = await apiRequest(`/coupons/${id}`, {
      method: "DELETE",
      auth: true,
    });

    return {
      success: response.success,
      message: response.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
