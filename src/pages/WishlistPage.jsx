import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { addToCart } from "../data/cartStorage";
import { getAuthToken } from "../data/authStorage";
import { getWishlistItems, removeWishlistItem } from "../data/wishlistStorage";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

export default function WishlistPage() {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState(() => getWishlistItems());

  useEffect(() => {
    const syncWishlist = () => setWishlistItems(getWishlistItems());
    window.addEventListener("storage", syncWishlist);
    window.addEventListener("vrinda-wishlist-changed", syncWishlist);
    return () => {
      window.removeEventListener("storage", syncWishlist);
      window.removeEventListener("vrinda-wishlist-changed", syncWishlist);
    };
  }, []);

  const handleRemove = (productId) => {
    removeWishlistItem(productId);
    setWishlistItems(getWishlistItems());
  };

  const handleMoveToCart = (item) => {
    if (!getAuthToken()) {
      addToCart(item, 1);
      return;
    }

    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        images: [item.image],
        onSale: false,
        salePercent: 0
      },
      1
    );
    removeWishlistItem(item.id);
    setWishlistItems(getWishlistItems());
  };

  return (
    <div className="pb-16">
      <SiteNav />

      <main className="mx-auto w-[min(1200px,94vw)] pt-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700/70">Saved For Later</p>
            <h1 className="mt-2 font-display text-5xl leading-none text-sage-800">Wishlist</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="text-sm font-semibold text-sage-700 transition duration-300 hover:text-sage-900"
          >
            Continue shopping
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <section className="glass-card rounded-[28px] border border-white/70 bg-white/70 p-10 text-center shadow-soft">
            <h2 className="font-display text-4xl text-sage-800">Your wishlist is empty</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sage-700">
              Tap the heart icon on products to save your favorites and revisit them any time.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-sage-700 px-6 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Explore Products
            </Link>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {wishlistItems.map((item) => (
              <article
                key={item.id}
                className="glass-card overflow-hidden rounded-3xl border border-white/70 bg-white/72 p-4 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_40px_rgba(31,61,43,0.16)]"
              >
                <div className="overflow-hidden rounded-2xl border border-sage-100 bg-white">
                  <img src={item.image} alt={item.name} className="h-52 w-full object-cover transition duration-500 hover:scale-105" />
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">{item.category || "Vrinda"}</p>
                  <h2 className="text-lg font-extrabold text-sage-800">{item.name}</h2>
                  <p className="text-sm text-sage-600">{item.tagline || "Herbal essentials for your daily ritual."}</p>
                  <p className="text-sm font-extrabold text-sage-800">{formatInr(item.price)}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item)}
                    className="flex-1 rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_10px_20px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5"
                  >
                    Move to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-rose-700 transition duration-300 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}