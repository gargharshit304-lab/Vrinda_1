import { Router } from "express";
import { createOrder, getOrderById, getOrders, updateOrderStatus, getMyOrders } from "../controllers/orderController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.route("/").get(authMiddleware, getOrders).post(authMiddleware, createOrder);
router.get("/my", authMiddleware, getMyOrders);
router.route("/:id").get(authMiddleware, getOrderById).patch(authMiddleware, adminMiddleware, updateOrderStatus).put(authMiddleware, adminMiddleware, updateOrderStatus);
router.put("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);

export default router;
