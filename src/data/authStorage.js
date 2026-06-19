export const AUTH_STORAGE_KEY = "vrinda.currentUser";
export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "user";

export const getStoredAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuthToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const directToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (directToken) {
    return directToken;
  }

  return getStoredAuth()?.token || "";
};

export const setAuthSession = ({ token, user }) => {
  if (typeof window === "undefined") {
    return;
  }

  const storedUser = {
    ...(user || {}),
    _id: user?._id || user?.id || ""
  };

  const payload = {
    token: token || "",
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "user",
    _id: storedUser._id,
    signedInAt: Date.now()
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(storedUser));
  if (payload.token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
  }
  window.dispatchEvent(new Event("vrinda-auth-changed"));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("vrinda-cart-changed"));
  window.dispatchEvent(new Event("vrinda-auth-changed"));
};
