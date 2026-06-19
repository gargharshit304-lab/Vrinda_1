import jwt from "jsonwebtoken";
import User from "../models/User.js";

const extractBearerToken = (authorization = "") => {
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim();
};

export const authMiddleware = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      const error = new Error("Unauthorized: token missing");
      error.statusCode = 401;
      throw error;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const error = new Error("JWT_SECRET is not configured");
      error.statusCode = 500;
      throw error;
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      const error = new Error("Unauthorized: user not found");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      error.statusCode = 401;
      error.message = "Unauthorized: invalid token";
    }
    next(error);
  }
};

export const adminMiddleware = (req, _res, next) => {
  if (!req.user) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.role !== "admin") {
    const error = new Error("Forbidden: admin access required");
    error.statusCode = 403;
    return next(error);
  }

  next();
};
