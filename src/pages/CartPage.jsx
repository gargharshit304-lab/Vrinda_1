import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { CART_LOGIN_REQUIRED_MESSAGE, clearCart, getCartItems, removeCartItem, updateCartItemQuantity } from "../data/cartStorage";
import { getAuthToken } from "../data/authStorage";

const deliveryFee = 49;

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export default function CartPage() {
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [hasToken, setHasToken] = useState(() => Boolean(getAuthToken()));
  const user = getStoredUser();
  const isAdminUser = user?.role === "admin";

  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    const syncCart = () => {
      const tokenExists = Boolean(getAuthToken());
      setHasToken(tokenExists);
      setCartItems(tokenExists ? getCartItems() : []);
    };
    window.addEventListener("storage", syncCart);
    window.addEventListener("vrinda-cart-changed", syncCart);
    window.addEventListener("vrinda-auth-changed", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("vrinda-cart-changed", syncCart);
      window.removeEventListener("vrinda-auth-changed", syncCart);
    };
  }, []);

  if (!hasToken) {
    return (
      <div className="pb-16">
        <SiteNav />
        <main className="mx-auto w-[min(1200px,94vw)] pt-6">
          <section className="glass-card rounded-[28px] border border-white/70 bg-white/70 p-10 text-center shadow-soft">
            <h2 className="font-display text-4xl text-sage-800">{CART_LOGIN_REQUIRED_MESSAGE}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sage-700">
              Sign in to save items and continue your checkout securely.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex rounded-full bg-sage-700 px-6 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
              >
                Login
              </Link>
              <Link
                to="/login?mode=signup"
                className="inline-flex rounded-full border border-sage-200/80 bg-white px-6 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
              >
                Sign Up
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  );

  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  const handleQuantityChange = (productId, direction) => {
    const item = cartItems.find((entry) => entry.id === productId);
    if (!item) {
      return;
    }
    const nextQuantity = Math.max(1, item.quantity + direction);
    updateCartItemQuantity(productId, nextQuantity);
    setCartItems(getCartItems());
  };

  const handleRemove = (productId) => {
    removeCartItem(productId);
    setCartItems(getCartItems());
  };

  return (
    <div className="pb-16">
      <SiteNav />

      <main className="mx-auto w-[min(1200px,94vw)] pt-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700/70">Your Bag</p>
            <h1 className="mt-2 font-display text-5xl leading-none text-sage-800">Cart</h1>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-sage-700 transition duration-300 hover:text-sage-900">
            Continue shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <section className="glass-card rounded-[28px] border border-white/70 bg-white/70 p-10 text-center shadow-soft">
            <h2 className="font-display text-4xl text-sage-800">Your cart is empty</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sage-700">
              Add a few Vrinda essentials to your cart and come back to review your order.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-sage-700 px-6 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Browse Shop
            </Link>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <article
                  key={item.id}
                  className="glass-card flex flex-col gap-4 rounded-[26px] border border-white/70 bg-white/72 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-sage-100 bg-white">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold text-sage-800">{item.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-sage-700">{formatInr(item.price)}</p>
                      <div className="mt-3 inline-flex items-center rounded-full border border-sage-200/80 bg-white px-2 py-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-sage-700 transition duration-200 hover:bg-sage-700 hover:text-white"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          -
                        </button>
                        <span className="min-w-10 px-3 text-center text-sm font-extrabold text-sage-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-sage-700 transition duration-200 hover:bg-sage-700 hover:text-white"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:text-right">
                    <p className="text-lg font-extrabold text-sage-800">{formatInr(item.price * item.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-700 transition duration-300 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="glass-card h-fit rounded-[28px] border border-white/70 bg-white/74 p-5 shadow-soft lg:sticky lg:top-28">
              <h2 className="font-display text-3xl text-sage-800">Order Summary</h2>

              <div className="mt-5 space-y-3 rounded-2xl border border-sage-200/70 bg-[#faf7f0]/90 p-4">
                <SummaryRow label="Subtotal" value={formatInr(subtotal)} />
                <SummaryRow label="Delivery fee" value={subtotal > 0 ? formatInr(deliveryFee) : formatInr(0)} />
                <div className="h-px bg-sage-200/80" />
                <SummaryRow label="Total" value={formatInr(total)} strong />
              </div>

              <Link
                to="/checkout"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-5 py-3.5 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_14px_28px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(31,61,43,0.3)]"
              >
                Proceed to Checkout
              </Link>

              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setCartItems(getCartItems());
                }}
                className="mt-3 w-full rounded-full border border-sage-200/80 bg-white/80 px-5 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:bg-white"
              >
                Clear Cart
              </button>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-base" : "text-sm"}`}>
      <span className={`font-medium text-sage-700 ${strong ? "font-bold text-sage-800" : ""}`}>{label}</span>
      <span className={`font-extrabold text-sage-800 ${strong ? "text-lg" : ""}`}>{value}</span>
    </div>
  );
}