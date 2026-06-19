import express from "express";
import { createContactMessage, getAllContacts } from "../controllers/contactController.js";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createContactMessage);

// Admin-only: list all contact messages
router.get("/", authMiddleware, adminMiddleware, getAllContacts);

export default router;
