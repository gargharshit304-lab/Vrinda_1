import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CART_LOGIN_REQUIRED_MESSAGE, getCartItems, removeCartItem, updateCartItemQuantity } from "../data/cartStorage";
import { fetchProducts } from "../data/productApi";
import { AUTH_STORAGE_KEY, USER_STORAGE_KEY, clearAuthSession, getAuthToken } from "../data/authStorage";
import { showToast } from "../data/toastEvents";

const navLinkClass = ({ isActive }) =>
  `group relative rounded-full px-1 py-1 text-sm font-semibold tracking-[0.04em] transition-all duration-300 ease-in-out ${
    isActive ? "text-[#1f3d2b]" : "text-sage-700/75 hover:text-[#1f3d2b]"
  }`;

export default function SiteNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [cartPulse, setCartPulse] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [searchProducts, setSearchProducts] = useState([]);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const previousCartCountRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncCart = () => setCartItems(getCartItems());
    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("vrinda-cart-changed", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("vrinda-cart-changed", syncCart);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchInput(params.get("q") || "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadSearchProducts = async () => {
      try {
        const products = await fetchProducts();
        if (!cancelled) {
          setSearchProducts(products);
        }
      } catch {
        if (!cancelled) {
          setSearchProducts([]);
        }
      }
    };

    loadSearchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCartDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const currentCount = cartItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
    const previousCount = previousCartCountRef.current;
    previousCartCountRef.current = currentCount;

    if (currentCount !== previousCount) {
      setCartPulse(true);
      const timeoutId = window.setTimeout(() => setCartPulse(false), 360);
      return () => window.clearTimeout(timeoutId);
    }

    if (!currentCount) {
      setCartPulse(false);
    }
  }, [cartItems]);

  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        setCurrentUser(raw ? JSON.parse(raw) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === USER_STORAGE_KEY || event.key === AUTH_STORAGE_KEY) {
        readUser();
      }
    };

    readUser();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("vrinda-auth-changed", readUser);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vrinda-auth-changed", readUser);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (target instanceof Element && !target.closest("[data-cart-dropdown-root]")) {
        setCartDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
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
    const handlePointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
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

  const handleLogout = () => {
    clearAuthSession();
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const userName = currentUser?.name || "Profile";
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0),
    [cartItems]
  );
  const searchResults = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return searchProducts
      .filter((product) => product.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [searchInput, searchProducts]);

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);
    setSearchOpen(true);

    const trimmedValue = nextValue.trim();
    navigate(trimmedValue ? `/shop?q=${encodeURIComponent(trimmedValue)}` : "/shop", { replace: true });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedValue = searchInput.trim();
    navigate(trimmedValue ? `/shop?q=${encodeURIComponent(trimmedValue)}` : "/shop");
    setSearchOpen(false);
    setMobileOpen(false);
  };

  const handleSuggestionClick = (product) => {
    navigate(`/product/${product.id}`);
    setSearchInput(product.name);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  const updateCartView = () => setCartItems(getCartItems());

  const handleCartQuantityChange = (productId, direction) => {
    const item = cartItems.find((entry) => entry.id === productId);
    if (!item) {
      return;
    }

    const nextQuantity = Math.max(1, Number(item.quantity || 1) + direction);
    updateCartItemQuantity(productId, nextQuantity);
    updateCartView();
  };

  const handleCartRemove = (productId) => {
    removeCartItem(productId);
    updateCartView();
  };

  const toggleCartDropdown = () => {
    if (!getAuthToken()) {
      showToast(CART_LOGIN_REQUIRED_MESSAGE, "neutral");
      navigate("/login");
      return;
    }
    setCartDropdownOpen((open) => !open);
  };

  const handleMobileCartAccess = () => {
    if (!getAuthToken()) {
      showToast(CART_LOGIN_REQUIRED_MESSAGE, "neutral");
      navigate("/login");
      setMobileOpen(false);
      return;
    }
    setMobileOpen(false);
    navigate("/cart");
  };

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  );

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const isAdminUser = currentUser?.role === "admin";

  return (
    <header
      className={`sticky top-3 z-30 mx-auto w-[min(1120px,94vw)] rounded-[28px] border px-4 py-2.5 backdrop-blur-2xl transition-all duration-300 ease-in-out md:px-5 md:py-3 ${
        scrolled
          ? "border-white/70 bg-white/78 shadow-[0_20px_50px_rgba(31,61,43,0.16)]"
          : "border-white/40 bg-white/55 shadow-[0_12px_35px_rgba(31,61,43,0.08)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <Link to="/" className="flex items-start gap-2 md:gap-3" onClick={() => {
          setMobileOpen(false);
          setMobileSearchExpanded(false);
        }}>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-sage-700 to-sage-400 text-white shadow-md shadow-sage-800/15 md:h-10 md:w-10 md:rounded-2xl">
            <span className="h-5 w-5 md:h-6 md:w-6">
              <LeafIcon />
            </span>
          </span>
          <span className="flex flex-col">
            <span className="font-display text-lg font-semibold tracking-[0.08em] text-[#1f3d2b] md:text-[2.05rem]">
              Vrinda
            </span>
            <span className="text-[0.55rem] font-extrabold uppercase tracking-[0.34em] text-sage-700/75 md:text-[0.68rem]">
              Botanical Rituals
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <nav className="items-center gap-3 md:flex lg:gap-4">
            <NavLink to="/" className={navLinkClass}>
              <span className="relative inline-flex items-center pb-1.5">
                Home
                <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
              </span>
            </NavLink>
            <NavLink to="/shop" className={navLinkClass}>
              <span className="relative inline-flex items-center pb-1.5">
                Shop
                <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
              </span>
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              <span className="relative inline-flex items-center pb-1.5">
                About
                <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
              </span>
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              <span className="relative inline-flex items-center pb-1.5">
                Contact
                <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
              </span>
            </NavLink>
          </nav>

          <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative w-full max-w-[280px]">
            <label className="sr-only" htmlFor="navbar-search">
              Search products
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sage-700/70">
              <SearchIcon />
            </span>
            <input
              id="navbar-search"
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search products"
              className="w-full rounded-full border border-sage-200/80 bg-white/80 py-2.5 pl-11 pr-4 text-sm font-medium text-sage-800 shadow-sm outline-none transition duration-300 placeholder:text-sage-600/60 focus:border-sage-400 focus:bg-white focus:shadow-md"
              autoComplete="off"
            />

            {searchOpen && searchResults.length > 0 ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-3xl border border-sage-100/90 bg-[#faf7f1]/98 p-2 shadow-[0_20px_40px_rgba(24,47,33,0.16)] backdrop-blur-xl">
                <div className="px-3 pb-2 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-sage-700/70">
                  Suggestions
                </div>
                <div className="space-y-1">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition duration-200 hover:bg-sage-700/8"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-sage-100 bg-white">
                        <img src={product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl} alt={product.name} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-sage-800">{product.name}</span>
                        <span className="block text-xs text-sage-600">{product.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="mt-2 w-full rounded-2xl bg-sage-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition duration-300 hover:bg-sage-800"
                >
                  View all results
                </button>
              </div>
            ) : null}
          </form>

          {!currentUser ? (
            <div className="flex items-center gap-3">
                <div data-cart-dropdown-root className="relative">
                <CartLink count={cartCount} pulse={cartPulse} onClick={toggleCartDropdown} />
                {cartDropdownOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] max-w-none sm:w-[350px] sm:max-w-[350px]">
                    <CartDropdown
                      cartItems={cartItems}
                      cartTotal={cartTotal}
                      onClose={() => setCartDropdownOpen(false)}
                      onQuantityChange={handleCartQuantityChange}
                      onRemove={handleCartRemove}
                    />
                  </div>
                ) : null}
              </div>
              <Link
                to="/login"
                className="group relative text-sm font-semibold tracking-[0.03em] text-sage-700/85 transition duration-300 hover:text-[#1f3d2b]"
              >
                Login
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link
                to="/login?mode=signup"
                className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-4 py-2 text-sm font-bold tracking-[0.03em] text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)] transition duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_14px_28px_rgba(31,61,43,0.3)]"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div ref={profileRef} className="relative">
              <div className="flex items-center gap-1.5">
                {!isAdminUser ? (
                  <div data-cart-dropdown-root className="relative">
                    <CartLink count={cartCount} pulse={cartPulse} onClick={toggleCartDropdown} />
                    {cartDropdownOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] max-w-none sm:w-[350px] sm:max-w-[350px]">
                        <CartDropdown
                          cartItems={cartItems}
                          cartTotal={cartTotal}
                          onClose={() => setCartDropdownOpen(false)}
                          onQuantityChange={handleCartQuantityChange}
                          onRemove={handleCartRemove}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <Link
                  to="/profile"
                  className="group flex items-center gap-2.5 rounded-full border border-sage-200/80 bg-white/75 px-2.5 py-1.5 text-sage-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <span className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage-700 to-sage-500 text-xs font-extrabold text-white">
                    {initials}
                    <span className="absolute -right-0.5 top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
                  </span>
                  <span className="max-w-[110px] truncate text-sm font-semibold tracking-[0.02em] text-sage-800/95">{userName}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-sage-200/80 bg-white/75 text-sage-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 transition duration-300 ${profileOpen ? "rotate-180" : ""}`}
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
              </div>

              <div
                className={`absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-sage-100/80 bg-[#faf6ef]/95 p-1.5 shadow-[0_20px_40px_rgba(24,47,33,0.14)] backdrop-blur-xl transition-all duration-200 ease-out ${
                  profileOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                }`}
              >
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-sage-700 transition duration-200 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                >
                  My Profile
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setProfileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-sage-700 transition duration-200 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                >
                  Orders
                </Link>
                <Link
                  to="/wishlist"
                  onClick={() => setProfileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-sage-700 transition duration-200 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                >
                  Wishlist
                </Link>
                <Link
                  to="/profile?tab=settings"
                  onClick={() => setProfileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-sage-700 transition duration-200 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                >
                  Settings
                </Link>
                {isAdminUser ? (
                  <Link
                    to="/admin"
                    onClick={() => setProfileOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-sage-700 transition duration-200 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                  >
                    Admin Dashboard
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    navigate("/");
                  }}
                  className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition duration-200 hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 lg:hidden">
          {!isAdminUser ? (
            <div data-cart-dropdown-root className="relative">
              <CartLink count={cartCount} pulse={cartPulse} onClick={toggleCartDropdown} />
              {cartDropdownOpen ? (
                <div className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] max-w-none sm:w-[350px] sm:max-w-[350px]">
                  <CartDropdown
                    cartItems={cartItems}
                    cartTotal={cartTotal}
                    onClose={() => setCartDropdownOpen(false)}
                    onQuantityChange={handleCartQuantityChange}
                    onRemove={handleCartRemove}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {currentUser && (
            <Link
              to="/profile"
              className="grid h-9 w-9 place-items-center rounded-full border border-sage-200/80 bg-white/75 text-xs font-extrabold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:h-10 md:w-10 md:rounded-full"
              title={userName}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-sage-700 to-sage-500">
                {initials}
              </span>
            </Link>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sage-200/70 bg-white/60 p-1.5 text-sage-800 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((value) => !value);
              setMobileSearchExpanded(false);
            }}
          >
            <span className="relative h-5 w-5">
              <span
                className={`absolute left-0 top-1 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                  mobileOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-4 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                  mobileOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          mobileOpen ? "mt-4 max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-2 pb-1 pt-1">
          <div className="relative mb-2" ref={mobileSearchRef}>
            <button
              type="button"
              onClick={() => setMobileSearchExpanded(!mobileSearchExpanded)}
              className="flex w-full items-center gap-3 rounded-2xl border border-sage-200/80 bg-white/75 px-4 py-3 text-sm font-medium text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              aria-label="Search products"
            >
              <span className="h-5 w-5 shrink-0">
                <SearchIcon />
              </span>
              <span className={`transition-all duration-300 ${mobileSearchExpanded ? "opacity-0" : "opacity-100"}`}>Search products</span>
            </button>

            {mobileSearchExpanded && (
              <form onSubmit={handleSearchSubmit} className="absolute left-0 right-0 top-0 z-50">
                <input
                  type="search"
                  value={searchInput}
                  onChange={handleSearchChange}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search products"
                  autoFocus
                  className="w-full rounded-2xl border border-sage-400 bg-white py-3 pl-12 pr-4 text-sm font-medium text-sage-800 shadow-md outline-none transition duration-300 focus:border-sage-500 focus:shadow-lg"
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sage-700/70 h-4 w-4">
                  <SearchIcon />
                </span>
              </form>
            )}

            {mobileSearchExpanded && searchOpen && searchResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-3xl border border-sage-100/90 bg-[#faf7f1]/98 p-2 shadow-[0_20px_40px_rgba(24,47,33,0.16)] backdrop-blur-xl">
                <div className="px-3 pb-2 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-sage-700/70">
                  Suggestions
                </div>
                <div className="space-y-1">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition duration-200 hover:bg-sage-700/8"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-sage-100 bg-white">
                        <img src={product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl} alt={product.name} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-sage-800">{product.name}</span>
                        <span className="block text-xs text-sage-600">{product.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <MobileLink to="/" onClick={() => {
            setMobileOpen(false);
            setMobileSearchExpanded(false);
          }}>
            Home
          </MobileLink>
          <MobileLink to="/shop" onClick={() => {
            setMobileOpen(false);
            setMobileSearchExpanded(false);
          }}>
            Shop
          </MobileLink>
          <MobileLink to="/about" onClick={() => {
            setMobileOpen(false);
            setMobileSearchExpanded(false);
          }}>
            About
          </MobileLink>
          <MobileLink to="/contact" onClick={() => {
            setMobileOpen(false);
            setMobileSearchExpanded(false);
          }}>
            Contact
          </MobileLink>
          {!isAdminUser ? (
            <button
              type="button"
              onClick={handleMobileCartAccess}
              aria-label="Cart"
              className="rounded-2xl border border-sage-200/80 bg-white/75 px-4 py-3 text-left text-sm font-semibold tracking-[0.03em] text-sage-800 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              <span className="inline-flex items-center gap-2">
                <CartIcon />
                <span>Cart</span>
                {cartCount > 0 && <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sage-700 text-xs font-bold text-white">{cartCount}</span>}
              </span>
            </button>
          ) : null}
          {!currentUser ? (
            <div className="mt-3 space-y-2 border-t border-sage-100 pt-3">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl border border-sage-200/80 bg-white/75 px-4 py-3 text-center text-sm font-semibold tracking-[0.03em] text-sage-800 transition duration-300 hover:bg-white"
              >
                Login
              </Link>
              <Link
                to="/login?mode=signup"
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl bg-gradient-to-r from-sage-800 to-sage-600 px-4 py-3 text-center text-sm font-bold tracking-[0.03em] text-white shadow-[0_12px_22px_rgba(31,61,43,0.26)] transition duration-300 hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2 border-t border-sage-100 pt-3">
              <div className="flex items-center gap-2 rounded-xl px-2 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage-700 to-sage-500 text-xs font-extrabold text-white">
                  {initials}
                </span>
                <p className="text-sm font-semibold text-sage-800">{userName}</p>
              </div>
              <div className="space-y-1">
                <MobileLink to="/profile" onClick={() => {
                  setMobileOpen(false);
                  setMobileSearchExpanded(false);
                }}>
                  My Profile
                </MobileLink>
                <MobileLink to="/orders" onClick={() => {
                  setMobileOpen(false);
                  setMobileSearchExpanded(false);
                }}>
                  Orders
                </MobileLink>
                <MobileLink to="/wishlist" onClick={() => {
                  setMobileOpen(false);
                  setMobileSearchExpanded(false);
                }}>
                  Wishlist
                </MobileLink>
                <MobileLink to="/profile?tab=settings" onClick={() => {
                  setMobileOpen(false);
                  setMobileSearchExpanded(false);
                }}>
                  Settings
                </MobileLink>
                {isAdminUser ? (
                  <MobileLink to="/admin" onClick={() => {
                    setMobileOpen(false);
                    setMobileSearchExpanded(false);
                  }}>
                    Admin Dashboard
                  </MobileLink>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    navigate("/");
                    setMobileOpen(false);
                    setMobileSearchExpanded(false);
                  }}
                  className="w-full rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition duration-300 hover:bg-rose-100"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>

    </header>
  );
}

function MobileLink({ to, onClick, children, ariaLabel }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      aria-label={ariaLabel}
      className={({ isActive }) =>
        `rounded-2xl border px-4 py-3 text-sm font-semibold tracking-[0.03em] transition duration-300 ease-in-out ${
          isActive
            ? "border-sage-700/20 bg-sage-700 text-white shadow-md"
            : "border-sage-200/80 bg-white/75 text-sage-800 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function LeafIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 4s-7 0-12 5S3 20 3 20s7 0 12-5 5-11 5-11Z" />
      <path d="M8 16c2-2 5-5 9-7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-sage-800"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h7.8a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-inherit"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CartDropdown({ cartItems, cartTotal, onClose, onQuantityChange, onRemove }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-sage-100/90 bg-[#fffdf8] shadow-[0_22px_40px_rgba(24,47,33,0.18)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-sage-100/80 px-4 py-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-sage-700/70">Your Cart</p>
          <p className="mt-0.5 text-sm font-semibold text-sage-800">Items ready to review</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full border border-sage-200/80 bg-white text-sage-700 transition duration-300 hover:-translate-y-0.5 hover:bg-sage-700 hover:text-white"
          aria-label="Close cart dropdown"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[min(54vh,360px)] overflow-y-auto px-3 py-3 scroll-smooth">
        {cartItems.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-sage-200/80 bg-white px-4 py-8 text-center">
            <p className="text-sm font-semibold text-sage-800">Your cart is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-sage-600">Add items to see them here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cartItems.map((item) => (
              <article
                key={item.id}
                className="group flex gap-3 rounded-[14px] border border-sage-100/90 bg-white px-3 py-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(24,47,33,0.10)]"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-sage-100 bg-[#fbf7ef]">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-sage-800">{item.name}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-sage-700">Rs {item.price}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition duration-300 hover:-translate-y-0.5 hover:bg-rose-100"
                      aria-label={`Remove ${item.name}`}
                    >
                      <span className="text-sm font-bold leading-none">×</span>
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-full border border-sage-200/80 bg-[#fbf7ef] px-1.5 py-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => onQuantityChange(item.id, -1)}
                        className="grid h-7 w-7 place-items-center rounded-full text-base font-bold text-sage-700 transition duration-200 hover:scale-105 hover:bg-sage-700 hover:text-white"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        -
                      </button>
                      <span className="min-w-8 px-2 text-center text-xs font-extrabold text-sage-800">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange(item.id, 1)}
                        className="grid h-7 w-7 place-items-center rounded-full text-base font-bold text-sage-700 transition duration-200 hover:scale-105 hover:bg-sage-700 hover:text-white"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-sage-100/80 bg-[#f8f3ea] px-4 py-3 shadow-[0_-8px_20px_rgba(24,47,33,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-sage-700">Total</span>
          <span className="text-base font-extrabold text-sage-800">Rs {cartTotal}</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-2">
          <Link
            to="/cart"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-sage-200/80 bg-white px-4 py-2.5 text-xs font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            View Cart
          </Link>
          <Link
            to="/checkout"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-4 py-2.5 text-xs font-extrabold text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(31,61,43,0.22)]"
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function CartLink({ count, pulse, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative grid h-9 w-9 place-items-center rounded-full border border-sage-200/80 bg-white/75 text-sage-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:h-10 md:w-10 ${
        pulse ? "cart-icon-pulse" : ""
      }`}
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
    >
      <CartIcon />
      {count > 0 ? (
        <span className={`absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-sage-800 px-1 text-[0.6rem] font-extrabold leading-none text-white shadow-[0_6px_12px_rgba(31,61,43,0.28)] md:text-[0.65rem] ${pulse ? "cart-badge-pulse" : ""}`}>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
