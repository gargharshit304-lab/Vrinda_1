import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AboutContactPage from "./pages/AboutContactPage";
import ContactPage from "./pages/ContactPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import WishlistPage from "./pages/WishlistPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import MyOrders from "./pages/MyOrders";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { getToastEventName } from "./data/toastEvents";

export default function App() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    const handleToast = (event) => {
      const detail = event.detail || {};
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast = {
        id,
        message: detail.message || "Updated",
        tone: detail.tone || "neutral"
      };

      setToasts((current) => [toast, ...current].slice(0, 3));

      const timeoutId = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        timersRef.current.delete(id);
      }, 2600);

      timersRef.current.set(id, timeoutId);
    };

    window.addEventListener(getToastEventName(), handleToast);
    return () => {
      window.removeEventListener(getToastEventName(), handleToast);
      timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timersRef.current.clear();
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/about" element={<AboutContactPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/product/:productId" element={<ProductDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-3 sm:bottom-5 sm:right-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-pop rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_36px_rgba(24,47,33,0.18)] backdrop-blur-xl ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
                : "border-sage-200/80 bg-[#fbf7ef]/96 text-sage-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${toast.tone === "success" ? "bg-emerald-100 text-emerald-700" : "bg-sage-700/10 text-sage-700"}`}>
                {toast.tone === "success" ? "✓" : "•"}
              </span>
              <p className="pt-0.5 leading-relaxed">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
