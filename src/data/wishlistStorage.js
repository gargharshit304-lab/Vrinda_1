import { showToast } from "./toastEvents";

const WISHLIST_STORAGE_KEY = "vrinda.wishlist.items";

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const getWishlistItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed)
    ? parsed.filter((item) => item && item.id).map((item) => ({ ...item }))
    : [];
};

export const setWishlistItems = (items) => {
  if (typeof window === "undefined") {
    return [];
  }

  const nextItems = Array.isArray(items) ? items : [];
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new Event("vrinda-wishlist-changed"));
  return nextItems;
};

export const addWishlistItem = (product) => {
  if (!product?.id) {
    return getWishlistItems();
  }

  const current = getWishlistItems();
  if (current.some((item) => item.id === product.id)) {
    return current;
  }

  const basePrice = Number(product.price) || 0;
  const salePercent = Number(product.salePercent) || 0;
  const effectivePrice = product.onSale && salePercent > 0
    ? Math.max(1, Math.round(basePrice * (1 - salePercent / 100)))
    : basePrice;

  const nextItem = {
    id: product.id,
    name: product.name,
    price: effectivePrice,
    image: product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl || product.image || "",
    category: product.category || "",
    tagline: product.tagline || product.copy || ""
  };

  const nextItems = setWishlistItems([...current, nextItem]);
  showToast("Item added to wishlist", "success");
  return nextItems;
};

export const removeWishlistItem = (productId) => {
  const nextItems = getWishlistItems().filter((item) => item.id !== productId);
  return setWishlistItems(nextItems);
};

export const toggleWishlistItem = (product) => {
  const exists = getWishlistItems().some((item) => item.id === product?.id);
  return exists ? removeWishlistItem(product.id) : addWishlistItem(product);
};

export const isWishlisted = (productId) => getWishlistItems().some((item) => item.id === productId);