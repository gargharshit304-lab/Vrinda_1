import { Router } from "express";
import { createRazorpayOrder, markRazorpayPaymentFailure, verifyRazorpayPayment } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/create-order", authMiddleware, createRazorpayOrder);
router.post("/verify", authMiddleware, verifyRazorpayPayment);
router.post("/failure", authMiddleware, markRazorpayPaymentFailure);

export default router;
