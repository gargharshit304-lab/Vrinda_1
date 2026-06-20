import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "vrinda/products",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    public_id: `product-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "")}`
  })
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
  }
});

const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 5 }
]);

export const uploadProductImages = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (!err) {
      return next();
    }

    let errorMessage = "";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    } else if (err && typeof err === "object") {
      errorMessage = err.message || err.error?.message || JSON.stringify(err);
    } else {
      errorMessage = "Image upload failed. Please verify Cloudinary configuration and file format.";
    }

    const normalizedError = err instanceof Error ? err : new Error(errorMessage);
    normalizedError.statusCode = normalizedError.statusCode || 400;
    normalizedError.message = errorMessage;
    return next(normalizedError);
  });
};
