import { Router } from "express";

import {
  getProfile,
  updateProfile,
  updatePassword
} from "../controllers/userController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/profile",
  authMiddleware,
  getProfile
);

router.put(
  "/profile",
  authMiddleware,
  updateProfile
);

router.put(
  "/update-password",
  authMiddleware,
  updatePassword
);

export default router;