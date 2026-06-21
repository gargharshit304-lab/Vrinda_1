import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { apiRequest } from "../data/apiClient";
import { fetchProducts as fetchProductsApi } from "../data/productApi";
import { ADMIN_PRODUCTS_KEY } from "../data/productCatalog";
import { addToCart, getCartItems, removeCartItem, updateCartItemQuantity } from "../data/cartStorage";
import { getAuthToken } from "../data/authStorage";
import { getWishlistItems, toggleWishlistItem } from "../data/wishlistStorage";
import { showToast } from "../data/toastEvents";

const sortOptions = [
  { value: "popular", label: "Popular" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "new-arrivals", label: "New Arrivals" }
];

const getEffectivePrice = (product) => {
  const base = Number(product.price) || 0;
  const discount = Number(product.salePercent) || 0;
  if (!product.onSale || discount <= 0) {
    return base;
  }
  return Math.max(1, Math.round(base * (1 - discount / 100)));
};

const formatInr = (amount) => `Rs ${Math.round(amount)}`;

const isAdminAccount = () => {
  try {
    return JSON.parse(localStorage.getItem("user"))?.role === "admin";
  } catch {
    return false;
  }
};

export default function ShopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [wishlistItems, setWishlistItems] = useState(() => getWishlistItems());
  const [lastChangedProductId, setLastChangedProductId] = useState("");
  const [lastHeartProductId, setLastHeartProductId] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const initialLoadDoneRef = useRef(false);
  const isAdminUser = isAdminAccount();
  const searchQuery = useMemo(() => new URLSearchParams(location.search).get("q")?.trim() || "", [location.search]);

  const loadLatestProducts = async (query) => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const products = await fetchProductsApi(query);
      setAllProducts(products);
    } catch (error) {
      setProductsError(error.message || "Unable to load products right now.");
      setAllProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    const refreshCart = () => setCartItems(getCartItems());
    const refreshWishlist = () => setWishlistItems(getWishlistItems());
    const refreshProducts = () => setRefreshKey((current) => current + 1);
    const handleStorage = (event) => {
      if (!event.key || event.key === ADMIN_PRODUCTS_KEY) {
        refreshProducts();
      }
    };
    window.addEventListener("vrinda-cart-changed", refreshCart);
    window.addEventListener("vrinda-wishlist-changed", refreshWishlist);
    window.addEventListener("vrinda-products-changed", refreshProducts);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("vrinda-cart-changed", refreshCart);
      window.removeEventListener("vrinda-wishlist-changed", refreshWishlist);
      window.removeEventListener("vrinda-products-changed", refreshProducts);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    loadLatestProducts(searchQuery);
    initialLoadDoneRef.current = true;
    // Run on component mount to always fetch latest products from backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      return;
    }
    loadLatestProducts(searchQuery);
    // Search/filter URL changes and explicit refreshes should re-fetch latest data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, refreshKey]);

  const categories = useMemo(() => {
    const values = [...new Set(allProducts.map((product) => product.category).filter(Boolean))];
    return ["All Products", ...values];
  }, [allProducts]);

  const [activeCategory, setActiveCategory] = useState("All Products");
  const [sortBy, setSortBy] = useState("popular");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All Products");
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setQuickViewProduct(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const filteredProducts = useMemo(() => {
    const categoryFiltered =
      activeCategory === "All Products"
        ? allProducts
        : allProducts.filter((product) => product.category === activeCategory);

    if (!searchQuery) {
      return categoryFiltered;
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return categoryFiltered.filter((product) => product.name.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, allProducts, searchQuery]);

  const sortedProducts = useMemo(() => {
    if (sortBy === "popular") {
      return filteredProducts;
    }

    const clonedProducts = [...filteredProducts];
    if (sortBy === "price-low-high") {
      return clonedProducts.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    }

    return clonedProducts.reverse();
  }, [filteredProducts, sortBy]);

  const selectedSortOption = sortOptions.find((option) => option.value === sortBy) || sortOptions[0];

  const cartQuantityById = useMemo(() => {
    return cartItems.reduce((accumulator, item) => {
      accumulator[item.id] = Math.max(1, Number(item.quantity) || 1);
      return accumulator;
    }, {});
  }, [cartItems]);

  const wishlistIdSet = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);

  const handleIncrement = async (product) => {
    if (isAdminUser) {
      return;
    }

    const productId = product.id || product._id || "";
    console.log("Adding to cart:", productId);

    if (!getAuthToken()) {
      addToCart(product, 1);
      return;
    }

    try {
      await apiRequest("/cart", {
        method: "POST",
        auth: true,
        body: {
          productId,
          quantity: 1
        }
      });

      addToCart(product, 1);
      setLastChangedProductId(productId);
      setTimeout(() => setLastChangedProductId((current) => (current === productId ? "" : current)), 280);
      setCartItems(getCartItems());
    } catch (error) {
      console.error("Failed to add to cart:", error);
      showToast(error.message || "Failed to add to cart", "error");
    }
  };

  const handleDecrement = (product) => {
    if (isAdminUser) {
      return;
    }

    const productId = product.id || product._id || "";
    const currentQuantity = cartQuantityById[productId] || 0;
    if (currentQuantity <= 1) {
      removeCartItem(productId);
    } else {
      updateCartItemQuantity(productId, currentQuantity - 1);
    }
    setLastChangedProductId(productId);
    setTimeout(() => setLastChangedProductId((current) => (current === productId ? "" : current)), 280);
    setCartItems(getCartItems());
  };

  const handleWishlistToggle = (product) => {
    toggleWishlistItem(product);
    setWishlistItems(getWishlistItems());
    setLastHeartProductId(product.id);
    setTimeout(() => setLastHeartProductId((current) => (current === product.id ? "" : current)), 280);
  };

  const openQuickView = (product) => setQuickViewProduct(product);
  const closeQuickView = () => setQuickViewProduct(null);

  return (
    <div className="pb-14">
      <SiteNav />
      <main className="mx-auto w-[min(1200px,94vw)] pt-6">
        <section className="grid items-start gap-5 lg:grid-cols-[268px_minmax(0,1fr)]">
          <aside className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/90 p-5 shadow-[0_16px_30px_rgba(31,61,43,0.08)] lg:sticky lg:top-28">
            <h2 className="font-display text-2xl font-semibold text-[#1f3d2b]">Categories</h2>
            <ul className="mt-4 hidden space-y-1.5 lg:block">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold tracking-[0.02em] transition duration-300 ease-in-out ${
                        isActive
                          ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]"
                          : "text-sage-800 hover:bg-white/75 hover:text-[#1f3d2b]"
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 lg:hidden">
              <label htmlFor="category-filter" className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-sage-700/80">
                Browse Category
              </label>
              <select
                id="category-filter"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="w-full rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm font-semibold text-sage-800 shadow-sm outline-none transition focus:border-sage-400"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </aside>

          <section key={activeCategory} className="animate-fadeUp space-y-4 transition-all duration-300">
            <div className="relative z-40 flex flex-wrap items-center justify-between gap-2 overflow-visible rounded-2xl border border-white/65 bg-white/60 px-4 py-3 backdrop-blur-xl sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage-700/80">{activeCategory}</p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-sage-700">{sortedProducts.length} products</p>
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sage-700/75">
                  Sort by
                </span>
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className="rounded-full border border-sage-200/80 bg-white/85 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-sage-700 transition duration-300 hover:border-sage-300 hover:bg-white"
                >
                  Refresh
                </button>
                <div ref={sortDropdownRef} className="relative z-50 min-w-[190px] sm:min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((open) => !open)}
                    className={`flex w-full items-center justify-between rounded-full border bg-[#f8f3ea]/95 px-3.5 py-2 text-xs font-semibold tracking-[0.03em] text-sage-800 shadow-sm transition duration-300 ${
                      sortMenuOpen
                        ? "border-sage-400 shadow-[0_12px_22px_rgba(31,61,43,0.12)]"
                        : "border-sage-200/80 hover:border-sage-300 hover:shadow-md"
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={sortMenuOpen}
                    aria-label="Sort products"
                  >
                    <span>{selectedSortOption.label}</span>
                    <svg
                      viewBox="0 0 20 20"
                      className={`h-4 w-4 text-sage-700 transition duration-300 ${sortMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 7 5 6 5-6" />
                    </svg>
                  </button>

                  <div
                    className={`absolute right-0 top-full z-[70] mt-2 w-full overflow-hidden rounded-2xl border border-sage-100/90 bg-[#f9f5ed]/98 p-1.5 shadow-[0_22px_45px_rgba(24,47,33,0.14)] backdrop-blur-xl transition-all duration-200 ease-out ${
                      sortMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                    }`}
                  >
                    <ul className="space-y-1" role="listbox" aria-label="Sort by options">
                      {sortOptions.map((option) => {
                        const isSelected = option.value === sortBy;
                        return (
                          <li key={option.value}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSortBy(option.value);
                                setSortMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium tracking-[0.02em] transition duration-200 ${
                                isSelected
                                  ? "bg-sage-700/10 text-[#1f3d2b]"
                                  : "text-sage-700 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                              }`}
                            >
                              <span>{option.label}</span>
                              <span className={`transition ${isSelected ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
                                <svg
                                  viewBox="0 0 20 20"
                                  className="h-4 w-4 text-sage-700"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m4 10 4 4 8-8" />
                                </svg>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {searchQuery ? (
              <div className="rounded-2xl border border-sage-200/70 bg-white/60 px-4 py-3 text-sm font-medium text-sage-700 shadow-sm backdrop-blur-xl sm:px-5">
                Showing results for <span className="font-bold text-sage-800">"{searchQuery}"</span>
              </div>
            ) : null}

            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productsLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <article
                      key={`skeleton-${index}`}
                      className="glass-card overflow-hidden rounded-3xl border border-white/70"
                      aria-hidden="true"
                    >
                      <div className="skeleton-shimmer h-56 w-full bg-slate-200/75" />
                      <div className="space-y-3 p-5">
                        <div className="skeleton-shimmer h-3 w-20 rounded-full bg-slate-200/75" />
                        <div className="skeleton-shimmer h-5 w-4/5 rounded-xl bg-slate-200/75" />
                        <div className="skeleton-shimmer h-4 w-full rounded-xl bg-slate-200/75" />
                        <div className="flex items-center justify-between pt-2">
                          <div className="skeleton-shimmer h-4 w-16 rounded-xl bg-slate-200/75" />
                          <div className="skeleton-shimmer h-9 w-28 rounded-full bg-slate-200/75" />
                        </div>
                      </div>
                    </article>
                  ))
                : sortedProducts.map((product) => (
                    <article
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/product/${product.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/product/${product.id}`);
                        }
                      }}
                      className="glass-card group cursor-pointer overflow-hidden rounded-3xl border border-white/70 transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_26px_44px_rgba(31,61,43,0.18)] h-full flex flex-col"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleWishlistToggle(product);
                          }}
                          className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border bg-white/90 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                            wishlistIdSet.has(product.id)
                              ? "border-rose-300 text-rose-600"
                              : "border-sage-200 text-sage-700"
                          } ${lastHeartProductId === product.id ? "wishlist-heart-pop" : ""}`}
                          aria-label={wishlistIdSet.has(product.id || product._id) ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        >
                              <HeartIcon filled={wishlistIdSet.has(product.id || product._id)} />
                        </button>

                        <img
                          src={product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                        />
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sage-800 opacity-0 transition duration-300 group-hover:opacity-100">
                          View Product
                        </span>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openQuickView(product);
                          }}
                          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-white/96 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-sage-800 opacity-0 shadow-[0_12px_20px_rgba(31,61,43,0.18)] transition duration-300 group-hover:opacity-100 hover:-translate-y-[54%] hover:bg-white"
                        >
                          Quick View
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col justify-between p-5 space-y-2.5">
                        <div className="space-y-2">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">{product.category}</p>
                          <h2 className="text-lg font-extrabold text-sage-800 break-words">{product.name}</h2>
                          <p className="text-sm text-sage-600 break-words">{product.tagline || product.copy}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-2">
                          <span className="font-bold text-sage-700">{formatInr(getEffectivePrice(product))}</span>
                          {isAdminUser ? (
                            <span className="text-right text-xs font-semibold text-sage-700">Admin accounts cannot purchase products</span>
                          ) : cartQuantityById[product.id || product._id] > 0 ? (
                            <div className={`inline-flex items-center rounded-full border border-sage-200/80 bg-[#f8f5ee] p-1 shadow-sm ${lastChangedProductId === (product.id || product._id) ? "cart-stepper-pop" : ""}`}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDecrement(product);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-bold text-sage-700 transition duration-300 hover:bg-sage-700 hover:text-white"
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                -
                              </button>
                              <span className="min-w-8 px-2 text-center text-sm font-extrabold text-sage-800">
                                {cartQuantityById[product.id || product._id]}
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleIncrement(product);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-sage-700 text-lg font-bold text-white transition duration-300 hover:bg-sage-800"
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            (() => {
                              const stock = Number(product.stock || product.unitsAvailable || 0);
                              if (stock > 0) {
                                return (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleIncrement(product);
                                    }}
                                    className={`rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white shadow-[0_8px_16px_rgba(31,61,43,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800 ${
                                      lastChangedProductId === (product.id || product._id) ? "cart-stepper-pop" : ""
                                    }`}
                                  >
                                    Add to Cart
                                  </button>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-full bg-gray-200 px-4 py-2 text-xs font-extrabold text-slate-500 shadow-sm cursor-not-allowed"
                                >
                                  Out of Stock
                                </button>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
            </div>

            {!productsLoading && productsError ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-sm font-semibold text-rose-700">{productsError}</p>
              </div>
            ) : null}

            {!productsLoading && !productsError && sortedProducts.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-sm font-semibold text-sage-700">
                  {searchQuery ? "No products match your search." : "No products available in this category yet."}
                </p>
              </div>
            )}
          </section>
        </section>
      </main>

      {quickViewProduct ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[1px] sm:items-center sm:p-5"
          onClick={closeQuickView}
          aria-hidden={false}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Quick view for ${quickViewProduct.name}`}
            onClick={(event) => event.stopPropagation()}
            className="quick-view-pop relative h-[100dvh] w-full overflow-hidden rounded-none border border-white/70 bg-[#fdfaf4] shadow-[0_26px_60px_rgba(24,47,33,0.26)] sm:h-auto sm:max-h-[90vh] sm:max-w-[760px] sm:rounded-[24px]"
          >
            <button
              type="button"
              onClick={closeQuickView}
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-sage-200/80 bg-white/90 text-sage-700 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-sage-900"
              aria-label="Close quick view"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>

            <div className="grid h-full overflow-y-auto sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative min-h-[38vh] overflow-hidden sm:min-h-[420px]">
                <img
                  src={quickViewProduct.images?.[0] || quickViewProduct.mainImageDataUrl || quickViewProduct.imageDataUrl}
                  alt={quickViewProduct.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-between p-5 sm:p-7">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-sage-700/75">Quick View</p>
                  <h2 className="mt-2 font-display text-3xl text-sage-800 sm:text-4xl">{quickViewProduct.name}</h2>
                  <p className="mt-3 text-sm font-semibold text-sage-700">{formatInr(getEffectivePrice(quickViewProduct))}</p>
                  <p className="mt-4 text-sm leading-relaxed text-sage-600">{quickViewProduct.tagline || quickViewProduct.copy || quickViewProduct.description || "A premium herbal essential crafted for your daily ritual."}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:mt-8">
                  {isAdminUser ? (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-semibold text-amber-800">
                      Admin accounts cannot purchase products
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleIncrement(quickViewProduct);
                      }}
                      className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-5 py-3 text-sm font-extrabold tracking-[0.05em] text-white shadow-[0_14px_24px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(31,61,43,0.3)]"
                    >
                      Add to Cart
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeQuickView();
                      navigate(`/product/${quickViewProduct.id || quickViewProduct._id}`);
                    }}
                    className="rounded-full border border-sage-200/80 bg-white px-5 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
                  >
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 7.4a5 5 0 0 0-8 0L12 8.2l-.8-.8a5 5 0 1 0-7 7.1l.8.8L12 22l7-6.7.8-.8a5 5 0 0 0 0-7.1Z" />
    </svg>
  );
}
