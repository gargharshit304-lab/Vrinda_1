import Product from "../models/Product.js";

export const addToCart = async (req, res, next) => {
  try {
    console.log("Cart request:", req.body);

    const { productId, quantity = 1 } = req.body || {};
    const normalizedQuantity = Number(quantity);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId and quantity are required"
      });
    }

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0"
      });
    }

    const product = await Product.findById(productId);

    if (!product || product.status !== "active" || product.isDeleted === true) {
      return res.status(404).json({
        success: false,
        message: "Product not available"
      });
    }

    if (Number(product.stock) < normalizedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Out of stock"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product is available",
      product: {
        id: String(product._id),
        name: product.name,
        price: product.price,
        stock: product.stock,
        image: product.image || product.images?.[0] || ""
      }
    });
  } catch (error) {
    next(error);
  }
};