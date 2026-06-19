import "./env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

const ADMIN_EMAIL = "admin@vrinda.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Admin";

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not set");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL} (role: ${existing.role})`);
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
        console.log("Updated role to admin");
      }
    } else {
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin"
      });

      console.log("Admin user created successfully!");
    }

    console.log("\n=== Admin Credentials ===");
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("=========================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();
