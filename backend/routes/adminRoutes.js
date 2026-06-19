import { Router } from "express";
import { getAdminAnalytics } from "../controllers/adminController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/analytics", authMiddleware, adminMiddleware, getAdminAnalytics);

export default router;