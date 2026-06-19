import Razorpay from "razorpay";

const key_id = String(process.env.RAZORPAY_KEY_ID || "").trim();
const key_secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

// Log presence of keys (do not log the secret value itself)
console.log("[razorpay.config] KEY:", key_id ? "Loaded" : "Missing");
console.log("[razorpay.config] SECRET EXISTS:", !!key_secret);

let razorpay = null;
try {
  if (key_id && key_secret) {
    razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
    console.log("[razorpay.config] RAZORPAY INSTANCE initialized: true");
  } else {
    console.warn("[razorpay.config] Razorpay keys missing - instance not initialized");
  }
} catch (err) {
  console.error("[razorpay.config] Error initializing Razorpay instance:", err && err.message);
  razorpay = null;
}

export default razorpay;
export { key_id as razorpayKeyId };
