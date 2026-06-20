import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      default: "All Products",
      trim: true
    },
    type: {
      type: String,
      default: "",
      trim: true
    },
    tagline: {
      type: String,
      default: "",
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    images: {
      type: [String],
      default: []
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    onSale: {
      type: Boolean,
      default: false
    },
    salePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    ingredients: {
      type: String,
      default: "100% plant-derived, natural ingredients"
    },
    howToUse: {
      type: String,
      default: "Apply to clean skin, massage gently, and rinse with water"
    },
    features: {
      type: [String],
      default: ["Natural & Organic", "Cruelty Free", "Eco-friendly", "Dermatologist Tested"]
    },
    weightVolume: {
      type: String,
      default: "100g/100ml"
    },
    skinConcern: {
      type: String,
      default: "All skin types"
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sold: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
