import Product from "../models/Product.js";

const isDevelopment = process.env.NODE_ENV !== "production";

export const getProducts = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = {
      isDeleted: false,
      isActive: true
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    if (product.isDeleted === true || product.isActive === false) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const getSimilarProducts = async (req, res, next) => {
  try {
    const currentProduct = await Product.findById(req.params.id);

    if (!currentProduct) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // Find similar products in the same category with stock > 0
    const similarProducts = await Product.find({
      category: currentProduct.category,
      _id: { $ne: currentProduct._id },
      stock: { $gt: 0 },
      status: "active",
      isDeleted: { $ne: true }
    })
      .select("name price image category")
      .limit(10)
      .sort({ createdAt: -1 });

    res.status(200).json(similarProducts);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { name, slug, price, stock, description, category } = body;

    if (!Object.keys(body).length) {
      return res.status(400).json({ message: "Invalid form data received" });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const error = new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
      error.statusCode = 500;
      throw error;
    }

    const imageFile = req.files?.image?.[0];
    const additionalFiles = Array.isArray(req.files?.images) ? req.files.images : [];
    const mainImageUrl = imageFile?.path || "";
    const additionalImageUrls = additionalFiles.map((file) => file.path).filter(Boolean);

    const contentLengthHeader = req.headers["content-length"];
    const requestSizeBytes = Number(contentLengthHeader) || 0;
    const mainImageSizeBytes = imageFile?.size || 0;
    const additionalImagesSizeBytes = additionalFiles.reduce((total, file) => total + (file?.size || 0), 0);

    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[product/create] payload", {
        requestSizeBytes,
        hasMainImage: Boolean(mainImageUrl),
        additionalImageCount: additionalImageUrls.length,
        mainImageSizeBytes,
        additionalImagesSizeBytes,
        hasName: Boolean(name),
        hasSlug: Boolean(slug)
      });
    }

    if (typeof body.image === "string" && body.image.startsWith("data:image/")) {
      const error = new Error("Base64 image upload is no longer supported. Please upload files using multipart/form-data.");
      error.statusCode = 400;
      throw error;
    }

    if (!name || !slug || price === undefined) {
      const error = new Error("name, slug, and price are required");
      error.statusCode = 400;
      throw error;
    }

    const exists = await Product.findOne({ slug });
    if (exists) {
      const error = new Error("Product slug already exists");
      error.statusCode = 409;
      throw error;
    }

    const created = await Product.create({
      name,
      slug,
      category: category || "All Products",
      type: body.type || "",
      price,
      stock: stock ?? 0,
      isDeleted: false,
      isActive: true,
      description: description ?? "",
      image: mainImageUrl || additionalImageUrls[0] || "",
      images: [mainImageUrl, ...additionalImageUrls].filter(Boolean)
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // Soft-delete: mark as deleted and inactive so it is excluded from shop queries
    product.isDeleted = true;
    product.isActive = false;
    // Optionally also flip status if older code relies on it
    if (product.status) product.status = "inactive";

    await product.save();

    res.json({ message: "Product soft-deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("[product/stock] req.body", req.body);

    const quantity = Number(req.body?.quantity);
    const action = String(req.body?.action || "").toLowerCase();

    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[product/stock] request", { id, body: req.body, quantity, action });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error("Invalid quantity");
      error.statusCode = 400;
      throw error;
    }

    if (!action || !["increase", "decrease"].includes(action)) {
      const error = new Error("Invalid action");
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findById(id).select("stock sold name");
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    if (action === "increase") {
      product.stock = Number(product.stock || 0) + quantity;
    }

    if (action === "decrease") {
      product.stock = Math.max(0, Number(product.stock || 0) - quantity);
    }

    await product.save();

    const updatedProduct = await Product.findById(id);

    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[product/stock] updated", {
        id,
        name: updatedProduct?.name,
        previousStock: product.stock,
        nextStock: updatedProduct?.stock,
        quantity
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      stock: updatedProduct?.stock ?? product.stock,
      product: updatedProduct
    });
  } catch (error) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("[product/stock] error", {
        message: error?.message,
        statusCode: error?.statusCode || 500
      });
    }
    next(error);
  }
};
