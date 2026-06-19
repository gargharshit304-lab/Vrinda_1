import { Router } from "express";
import { addToCart } from "../controllers/cartController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", authMiddleware, addToCart);

export default router;