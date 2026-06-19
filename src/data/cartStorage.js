import { showToast } from "./toastEvents";
import { getAuthToken } from "./authStorage";

export const CART_LOGIN_REQUIRED_MESSAGE = "Please login to view your cart";

const readJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const getCartKey = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const user = JSON.parse(window.localStorage.getItem("user"));
    const userId = user?._id || user?.id;
    return userId ? `cart_${userId}` : null;
  } catch {
    return null;
  }
};

export const getCart = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const cartKey = getCartKey();
  if (!getAuthToken() || !cartKey) {
    return [];
  }

  const raw = window.localStorage.getItem(cartKey);
  const parsed = readJson(raw, []);
  return Array.isArray(parsed)
    ? parsed
        .filter((item) => item && (item.id || item.productId))
        .map((item) => {
          const normalizedId = String(item.productId || item.id);
          return {
            ...item,
            id: normalizedId,
            productId: normalizedId,
            quantity: Math.max(1, Number(item.quantity) || 1)
          };
        })
    : [];
};

export const saveCart = (items) => {
  if (typeof window === "undefined") {
    return [];
  }

  const cartKey = getCartKey();
  if (!getAuthToken() || !cartKey) {
    return [];
  }

  const nextItems = Array.isArray(items) ? items : [];
  window.localStorage.setItem(cartKey, JSON.stringify(nextItems));
  window.dispatchEvent(new Event("vrinda-cart-changed"));
  return nextItems;
};

export const addToCart = (product, quantity = 1) => {
  const productId = String(product?.id || product?.productId || "");
  if (!productId) {
    return [];
  }

  const cartKey = getCartKey();
  if (!getAuthToken() || !cartKey) {
    showToast(CART_LOGIN_REQUIRED_MESSAGE, "neutral");
    return [];
  }

  const currentItems = getCart();
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const existingIndex = currentItems.findIndex((item) => (item.productId || item.id) === productId);
  const basePrice = Number(product.price) || 0;
  const salePercent = Number(product.salePercent) || 0;
  const effectivePrice = product.onSale && salePercent > 0
    ? Math.max(1, Math.round(basePrice * (1 - salePercent / 100)))
    : basePrice;
  const cartItem = {
    id: productId,
    productId,
    name: product.name,
    price: effectivePrice,
    image: product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl || product.image || "",
    quantity: nextQuantity
  };

  if (existingIndex >= 0) {
    const existingItem = currentItems[existingIndex];
    currentItems[existingIndex] = {
      ...existingItem,
      ...cartItem,
      quantity: existingItem.quantity + nextQuantity
    };
    const nextItems = saveCart(currentItems);
    showToast("Item added to cart", "success");
    return nextItems;
  }

  const nextItems = saveCart([...currentItems, cartItem]);
  showToast("Item added to cart", "success");
  return nextItems;
};

export const updateCartItemQuantity = (productId, quantity) => {
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const normalizedId = String(productId || "");
  const nextItems = getCart().map((item) =>
    (item.productId || item.id) === normalizedId ? { ...item, quantity: nextQuantity } : item
  );
  return saveCart(nextItems);
};

export const removeFromCart = (productId) => {
  const normalizedId = String(productId || "");
  const nextItems = getCart().filter((item) => (item.productId || item.id) !== normalizedId);
  const result = saveCart(nextItems);
  showToast("Item removed", "neutral");
  return result;
};

export const clearCart = () => saveCart([]);

export const getCartStorageKey = () => getCartKey();
export const getCartItems = () => getCart();
export const setCartItems = (items) => saveCart(items);
export const removeCartItem = (productId) => removeFromCart(productId);