import bcrypt from "bcryptjs";
import User from "../models/User.js";



export const updatePassword = async (req, res) => {
  try {
    console.log("==== UPDATE PASSWORD HIT ====");

    console.log("req.user:", req.user);

    console.log("req.body:", req.body);

    const userId = req.user?._id || req.user?.id;

    console.log("userId:", userId);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user"
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const user = await User.findById(userId).select("+password");

    console.log("user found:", !!user);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    console.log("user.password exists:", !!user.password);

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    console.log("password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("UPDATE PASSWORD FULL ERROR:");
    console.error(error);

    return res.status(500).json({
      message: error.message || "Server error"
    });
  }
};