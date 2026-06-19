import "../env.js";
import { Router } from "express";
import passport from "passport";
import { configureGooglePassport, isGoogleOAuthConfigured } from "../config/googlePassport.js";
import {
	googleLoginComplete,
	googleOAuthUnavailable,
	loginUser,
	registerUser
} from "../controllers/authController.js";

const router = Router();

configureGooglePassport();

router.post("/signup", registerUser);
router.post("/register", registerUser);
router.post("/login", loginUser);

if (isGoogleOAuthConfigured()) {
	router.get(
		"/google",
		passport.authenticate("google", {
			scope: ["profile", "email"],
			session: false,
			prompt: "select_account"
		})
	);

	router.get(
		"/google/callback",
		passport.authenticate("google", {
			session: false,
			failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?mode=signin&google=error`
		}),
		googleLoginComplete
	);
} else {
	if (process.env.NODE_ENV !== "production") {
		// eslint-disable-next-line no-console
		console.error("Missing Google OAuth environment variables");
	}
	router.get("/google", googleOAuthUnavailable);
	router.get("/google/callback", googleOAuthUnavailable);
}

export default router;
