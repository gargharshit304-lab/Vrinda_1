import "./env.js";
import cors from "cors";
import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import passport from "passport";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const BODY_LIMIT = "10mb";
const isDevelopment = process.env.NODE_ENV !== "production";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isDevelopment) {
  ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"].forEach((origin) => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

if (isDevelopment) {
  // eslint-disable-next-line no-console
  console.log("[startup] GOOGLE_CLIENT_ID:", googleClientId || "undefined");
}

if (!googleClientId && isDevelopment) {
  // eslint-disable-next-line no-console
  console.error("Missing Google OAuth environment variables");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));
app.use(passport.initialize());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, message: "Server is running" });
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ ok: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payment", paymentRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/payment", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    // Surface Razorpay env on startup
    console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Loaded" : "Missing");
    console.log("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Loaded" : "Missing");
    app.listen(PORT, () => {
      if (isDevelopment) {
        // eslint-disable-next-line no-console
        console.log(`Backend server listening on http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("Server startup failed:", error.message);
    }
    process.exit(1);
  }
};

startServer();
