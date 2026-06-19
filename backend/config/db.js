import mongoose from "mongoose";

const isDevelopment = process.env.NODE_ENV !== "production";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI environment variable is not set. Please set it in your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const isAtlas = mongoUri.includes("mongodb+srv") || mongoUri.includes("mongodb.net");
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`MongoDB connected${isAtlas ? " (Atlas)" : " (local)"}`);
    }
  } catch (error) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("MongoDB connection failed:", error.message);
    }
    throw error;
  }
};

export default connectDB;
