import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    addressLine: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    pincode: {
      type: String,
      default: ""
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,

    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    isGoogleUser: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      default: ""
    },
    addresses: {
      type: [addressSchema],
      default: []
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone || "",
    addresses: Array.isArray(this.addresses)
      ? this.addresses.map((address) => ({
        id: address._id?.toString?.() || address.id || "",
        fullName: address.fullName || "",
        phone: address.phone || "",
        addressLine: address.addressLine || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        isDefault: Boolean(address.isDefault)
      }))
      : [],
    isGoogleUser: this.isGoogleUser,
    role: this.role
  };
};

const User = mongoose.model("User", userSchema);

export default User;
