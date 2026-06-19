import Contact from "../models/Contact.js";

export const createContactMessage = async (req, res, next) => {
  try {
    // Require authenticated user (authMiddleware should attach req.user)
    if (!req.user) {
      const error = new Error("Unauthorized: authentication required");
      error.statusCode = 401;
      throw error;
    }

    const { message } = req.body || {};

    if (!message) {
      const error = new Error("Message is required");
      error.statusCode = 400;
      throw error;
    }

    // Do NOT trust frontend-provided name/email — use authenticated user data
    const created = await Contact.create({
      user: req.user._id,
      name: String(req.user.name || "").trim(),
      email: String(req.user.email || "").trim().toLowerCase(),
      message: String(message).trim()
    });

    res.status(201).json({ success: true, message: "Message sent successfully", data: created });
  } catch (error) {
    next(error);
  }
};

export const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    next(error);
  }
};

export default { createContactMessage, getAllContacts };
