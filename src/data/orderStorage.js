const ORDER_STORAGE_KEY = "vrinda.orders";

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const getOrders = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.filter((order) => order && order.id) : [];
};

export const setOrders = (orders) => {
  if (typeof window === "undefined") {
    return [];
  }

  const nextOrders = Array.isArray(orders) ? orders : [];
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
  window.dispatchEvent(new Event("vrinda-orders-changed"));
  return nextOrders;
};

export const addOrder = (order) => {
  if (!order?.id) {
    return getOrders();
  }

  const currentOrders = getOrders();
  return setOrders([order, ...currentOrders]);
};