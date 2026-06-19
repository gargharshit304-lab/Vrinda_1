import { apiRequest } from "./apiClient";
import { getAuthToken } from "./authStorage";
import { readAdminProducts, normalizeCatalogProduct } from "./productCatalog";

const normalizeApiProduct = (product) => {
  if (!product || typeof product !== "object") {
    return null;
  }

  const id = String(product.id || product._id || "");
  if (!id) {
    return null;
  }

  return {
    ...product,
    id,
    _id: product._id || id,
    image: product.image || product.images?.[0] || "",
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : product.image ? [product.image] : [],
    status: product.status || "active",
    // Add safe defaults for all fields
    name: product.name || "Unnamed Product",
    tagline: product.tagline || product.copy || "Premium herbal essential",
    description: product.description || "Premium herbal product from Vrinda",
    category: product.category || "All Products",
    type: product.type || "",
    price: Number(product.price) || 0,
    stock: Number(product.stock || product.unitsAvailable) || 0,
    onSale: Boolean(product.onSale),
    salePercent: Number(product.salePercent) || 0,
    rating: Number(product.rating) || 4.5,
    reviewCount: Number(product.reviewCount) || 0,
    ingredients: product.ingredients || "100% plant-derived, natural ingredients",
    howToUse: product.howToUse || "Apply to clean skin, massage gently, and rinse with water",
    features: Array.isArray(product.features) ? product.features : ["Natural & Organic", "Cruelty Free", "Eco-friendly", "Dermatologist Tested"],
    weightVolume: product.weightVolume || "100g/100ml",
    skinConcern: product.skinConcern || "All skin types"
  };
};

const normalizeProductForShop = (product) => {
  if (!product) {
    return null;
  }

  const normalized = product._id || product.id ? normalizeApiProduct(product) : normalizeCatalogProduct(product);
  if (!normalized || !normalized.id) {
    return null;
  }

  const status = String(normalized.status || "active").toLowerCase();
  const isDeleted = normalized.isDeleted === true;

  if (status === "inactive" || isDeleted) {
    return null;
  }

  return normalized;
};

const mergeUniqueProducts = (primaryProducts, fallbackProducts) => {
  const map = new Map();

  [...primaryProducts, ...fallbackProducts].forEach((product) => {
    const normalized = normalizeProductForShop(product);
    if (normalized && !map.has(normalized.id)) {
      map.set(normalized.id, normalized);
    }
  });

  return Array.from(map.values());
};

export const fetchProducts = async (search = "") => {
  try {
    // Fetch products from backend API
    console.log("[fetchProducts] Fetching from /api/products...");
    const data = await apiRequest("/products", { method: "GET" });
    console.log("[fetchProducts] API response:", data);
    const backendProducts = Array.isArray(data) ? data : [];
    const products = backendProducts.length > 0
      ? backendProducts.map(normalizeProductForShop).filter(Boolean)
      : mergeUniqueProducts(readAdminProducts(), []);

    // If search query is provided, filter products
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  } catch (error) {
    console.error("[fetchProducts] API call failed:", error.message);
    const localProducts = readAdminProducts();
    return mergeUniqueProducts(localProducts, []);
  }
};

export const fetchProductById = async (productId) => {
  if (!productId) {
    return null;
  }

  try {
    // Fetch specific product from backend API
    const data = await apiRequest(`/products/${encodeURIComponent(productId)}`, {
      method: "GET"
    });
    return normalizeProductForShop(data);
  } catch (error) {
    console.warn(`[fetchProductById] API call failed for ${productId}:`, error.message);
    const localProducts = readAdminProducts();
    return normalizeProductForShop(localProducts.find((product) => String(product.id) === String(productId))) || null;
  }
};

export const deleteProduct = async (productId) => {
  if (!productId) {
    return null;
  }

  return apiRequest(`/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    auth: true
  });
};

export const fetchSimilarProducts = async (productId) => {
  if (!productId) {
    return [];
  }

  const data = await apiRequest(`/products/similar/${encodeURIComponent(productId)}`, {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
};

export const updateProductStock = async (productId, quantity, action) => {
  if (!productId || quantity === undefined || quantity === null) {
    return null;
  }

  const numQuantity = Number(quantity);
  const normalizedAction = String(action || "").toLowerCase();

  if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
    throw new Error("Invalid quantity");
  }

  if (!["increase", "decrease"].includes(normalizedAction)) {
    throw new Error("Invalid action");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Unauthorized: token missing");
  }

  const patchUrl = `/products/${encodeURIComponent(productId)}/stock`;

  // eslint-disable-next-line no-console
  console.log("PATCH URL:", patchUrl);
  // eslint-disable-next-line no-console
  console.log("Payload:", {
    quantity: numQuantity,
    action: normalizedAction
  });

  return apiRequest(patchUrl, {
    method: "PATCH",
    auth: true,
    body: {
      quantity: numQuantity,
      action: normalizedAction
    }
  });
};
