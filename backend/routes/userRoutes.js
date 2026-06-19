import { Router } from "express";

import {
  updatePassword
} from "../controllers/userController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.put(
  "/update-password",
  authMiddleware,
  updatePassword
);

export default router;