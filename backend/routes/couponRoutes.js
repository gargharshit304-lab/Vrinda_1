import express from "express";
import {
  applyCoupon,
  getPublicCoupons,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getCouponById,
} from "../controllers/couponController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/apply", authMiddleware, applyCoupon); // Apply coupon in checkout
router.get("/public", getPublicCoupons); // Get available coupons for users

// Admin routes
router.post("/", authMiddleware, createCoupon); // Create coupon (admin only)
router.get("/", authMiddleware, getAllCoupons); // Get all coupons (admin only)
router.get("/:id", authMiddleware, getCouponById); // Get coupon by ID (admin only)
router.put("/:id", authMiddleware, updateCoupon); // Update coupon (admin only)
router.delete("/:id", authMiddleware, deleteCoupon); // Delete coupon (admin only)

export default router;
