import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const isDevelopment = process.env.NODE_ENV !== "production";

const signToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET is not configured");
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign({ userId, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[auth/signup] Incoming request", {
        hasName: Boolean(name),
        email: email?.toLowerCase?.() || "",
        passwordLength: typeof password === "string" ? password.length : 0,
        role: role || "user"
      });
    }

    if (!name || !email || !password) {
      const error = new Error("name, email, and password are required");
      error.statusCode = 400;
      throw error;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const error = new Error("User already exists");
      error.statusCode = 409;
      throw error;
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: role === "admin" ? "admin" : "user"
    });

    const token = signToken(user._id.toString(), user.role);

    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[auth/signup] User registered", {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });
    }

    res.status(201).json({
      message: "User registered",
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("[auth/signup] Error:", error.message);
    }
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    if (!user.passwordHash) {
      const error = new Error("Please continue with Google to sign in to this account");
      error.statusCode = 401;
      throw error;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const token = signToken(user._id.toString(), user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

export const upsertGoogleUser = async (profile) => {
  const email = profile?.emails?.[0]?.value?.trim().toLowerCase();
  const name = profile?.displayName?.trim() || email?.split("@")[0] || "Google User";

  if (!email) {
    const error = new Error("Google account did not provide an email address");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email });

  if (user) {
    let changed = false;

    if (!user.googleId) {
      user.googleId = profile.id;
      changed = true;
    }

    if (!user.authProvider || user.authProvider !== "google") {
      user.authProvider = "google";
      changed = true;
    }

    if (!user.isGoogleUser) {
      user.isGoogleUser = true;
      changed = true;
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      changed = true;
    }

    if (!user.name && name) {
      user.name = name;
      changed = true;
    }

    if (changed) {
      await user.save();
    }

    return user;
  }

  return User.create({
    name,
    email,
    googleId: profile.id,
    authProvider: "google",
    isGoogleUser: true,
    emailVerified: true,
    role: "user"
  });
};

export const googleLoginComplete = async (req, res, next) => {
  try {
    if (!req.user) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    const token = signToken(req.user._id.toString(), req.user.role);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = new URL("/login", frontendUrl);
    const payload = new URLSearchParams({
      token,
      user: JSON.stringify(req.user.toSafeObject())
    });

    redirectUrl.hash = payload.toString();
    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
};

export const googleOAuthUnavailable = (_req, res) => {
  res.status(503).json({
    message: "Google OAuth is not configured on the server"
  });
};
