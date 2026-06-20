import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { fetchProductById, fetchProducts, fetchSimilarProducts } from "../data/productApi";
import { addToCart } from "../data/cartStorage";
import { getAuthToken } from "../data/authStorage";

const infoTabs = [
  { id: "ingredients", label: "Ingredients" },
  { id: "how-to-use", label: "How to use" },
  { id: "details", label: "Product details" }
];

const ratingLabelMap = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};



const isAdminAccount = () => {
  try {
    return JSON.parse(localStorage.getItem("user"))?.role === "admin";
  } catch {
    return false;
  }
};

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeInfoTab, setActiveInfoTab] = useState("ingredients");
  const [cartNotice, setCartNotice] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: "5", comment: "" });
  const [hoverRating, setHoverRating] = useState(0);
  const [clickedRating, setClickedRating] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);
  const isAdminUser = isAdminAccount();
  const scrollContainerRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 280; // product width + gap
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [selectedProduct, products] = await Promise.all([fetchProductById(productId), fetchProducts()]);
        if (cancelled) {
          return;
        }

        setProduct(selectedProduct);
        setAllProducts(products);
        setActiveImageIndex(0);
        setActiveInfoTab("ingredients");
        setReviews(selectedProduct?.reviews || []);
        setReviewForm({ name: "", rating: "5", comment: "" });
        setHoverRating(0);
        setClickedRating(0);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setAllProducts([]);
          setErrorMessage(error.message || "Unable to load product details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    let cancelled = false;

    const loadSimilarProducts = async () => {
      if (!productId) {
        if (!cancelled) {
          setSimilarProducts([]);
        }
        return;
      }

      try {
        const data = await fetchSimilarProducts(productId);
        if (!cancelled) {
          setSimilarProducts(data);
        }
      } catch {
        if (!cancelled) {
          setSimilarProducts([]);
        }
      }
    };

    loadSimilarProducts();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[product/similar]", similarProducts);
    }
  }, [similarProducts]);

  const mainImage = product?.images?.[0] || product?.image || "/images/soap-golden-tiger.jpeg";

  const infoContent = useMemo(() => {
    if (!product) {
      return "";
    }

    if (activeInfoTab === "how-to-use") {
      return product.howToUse || "Apply to clean skin, massage gently, and rinse with water";
    }
    if (activeInfoTab === "details") {
      const type = product.type || "Natural Soap";
      const weight = product.weightVolume || "100g";
      const concern = product.skinConcern || "All skin types";
      return `Type: ${type} | Weight/Volume: ${weight} | Skin Type/Concern: ${concern}`;
    }
    return product.ingredients || "100% plant-derived, natural ingredients";
  }, [activeInfoTab, product]);

  const displayPrice = useMemo(() => {
    if (!product) {
      return "Rs 0";
    }
    const basePrice = Number(product.price) || 0;
    if (!basePrice) return "Rs 0";
    
    const onSale = Boolean(product.onSale);
    const salePercent = Number(product.salePercent) || 0;
    
    if (onSale && salePercent > 0) {
      const discounted = Math.max(1, Math.round(basePrice * (1 - salePercent / 100)));
      return `Rs ${discounted}`;
    }
    return `Rs ${basePrice}`;
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    return allProducts
      .filter((item) => {
        if (item.id === product.id) return false;
        const sameCategory = item.category && product.category && item.category === product.category;
        const sameType = item.type && product.type && item.type === product.type;
        return sameCategory || sameType;
      })
      .sort((a, b) => {
        const aCategoryScore = a.category === product.category ? 2 : 0;
        const bCategoryScore = b.category === product.category ? 2 : 0;
        const aTypeScore = a.type && product.type && a.type === product.type ? 2 : 0;
        const bTypeScore = b.type && product.type && b.type === product.type ? 2 : 0;
        const aPriceGap = Math.abs((Number(a.price) || 0) - (Number(product.price) || 0));
        const bPriceGap = Math.abs((Number(b.price) || 0) - (Number(product.price) || 0));

        return (bCategoryScore + bTypeScore) - (aCategoryScore + aTypeScore) || aPriceGap - bPriceGap;
      })
      .slice(0, 4);
  }, [allProducts, product]);

  const fallbackSimilarProducts = useMemo(() => {
    const backendList = Array.isArray(similarProducts) ? similarProducts : [];

    if (backendList.length > 0) {
      return backendList;
    }

    if (!product) {
      return [];
    }

    const randomPool = allProducts
      .filter((item) => item.id !== product.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    return relatedProducts.length > 0 ? relatedProducts : randomPool;
  }, [allProducts, product, relatedProducts, similarProducts]);

  const handleAddToCart = () => {
    if (isAdminUser) {
      return;
    }

    if (!product) {
      return;
    }

    if (!getAuthToken()) {
      addToCart(product, 1);
      return;
    }

    addToCart(product, 1);
    setCartNotice("Added to cart");
    window.setTimeout(() => setCartNotice(""), 1800);
  };

  const handleBuyNow = () => {
    if (isAdminUser) {
      return;
    }

    if (!product) {
      return;
    }

    if (!getAuthToken()) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }

    addToCart(product, 1);
    navigate("/checkout");
  };

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((current) => ({ ...current, [name]: value }));
  };

  const handleRatingSelect = (value) => {
    setReviewForm((current) => ({ ...current, rating: String(value) }));
    setClickedRating(value);
    window.setTimeout(() => setClickedRating(0), 220);
  };

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    const trimmedName = reviewForm.name.trim();
    const trimmedComment = reviewForm.comment.trim();
    if (!trimmedName || !trimmedComment) {
      return;
    }

    const rating = Math.min(5, Math.max(1, Number(reviewForm.rating) || 5));
    setReviews((current) => [
      {
        id: `review-${Date.now()}`,
        name: trimmedName,
        rating,
        comment: trimmedComment
      },
      ...current
    ]);
    setReviewForm({ name: "", rating: "5", comment: "" });
    setHoverRating(0);
    setClickedRating(0);
  };

  const selectedRating = Math.min(5, Math.max(1, Number(reviewForm.rating) || 5));
  const visibleRating = hoverRating || selectedRating;

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  if (loading) {
    return (
      <div className="pb-12">
        <SiteNav />
        <main className="mx-auto mt-6 w-[min(1000px,94vw)]">
          <section className="glass-card rounded-3xl p-10 text-center">
            <h1 className="font-display text-4xl font-semibold text-sage-800">Loading product...</h1>
            <p className="mt-3 text-sage-700">Fetching latest details from the store.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pb-12">
        <SiteNav />
        <main className="mx-auto mt-6 w-[min(1000px,94vw)]">
          <section className="glass-card rounded-3xl p-10 text-center">
            <h1 className="font-display text-4xl font-semibold text-sage-800">Product not found</h1>
            <p className="mt-3 text-sage-700">
              {errorMessage || "This product is unavailable right now. Explore our shop for more herbal essentials."}
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-sage-700 px-5 py-2.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Back to Shop
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <SiteNav />
      <main className="mx-auto mt-6 w-[min(1200px,94vw)] space-y-5">
        <Link to="/shop" className="inline-flex text-sm font-semibold text-sage-700 transition duration-300 hover:text-sage-900">
          {"<- Back to Shop"}
        </Link>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/88 p-4 sm:p-5">
            <div className="group overflow-hidden rounded-2xl border border-white/70 bg-white/70">
              <img
                key={mainImage}
                src={mainImage}
                alt={product?.name || "Product"}
                className="h-[360px] w-full object-cover transition duration-700 ease-out group-hover:scale-105 sm:h-[460px]"
                onError={(e) => {
                  e.target.src = "/images/soap-golden-tiger.jpeg";
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
              {(product?.images || []).map((image, idx) => (
                <button
                  key={`${image}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`overflow-hidden rounded-xl border bg-white/80 transition duration-300 ${
                    activeImageIndex === idx
                      ? "border-sage-500 shadow-[0_10px_20px_rgba(31,61,43,0.18)]"
                      : "border-sage-200/80 hover:-translate-y-0.5 hover:border-sage-300"
                  }`}
                >
                  <img src={image || "/images/soap-golden-tiger.jpeg"} alt={`${product?.name || "Product"} ${idx + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft sm:p-8">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/80">Vrinda Signature</p>
              <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-sage-900 sm:text-5xl">{product?.name || "Premium Product"}</h1>
              <p className="mt-2 text-sm font-semibold tracking-[0.02em] text-sage-700">{product?.tagline || "Premium herbal essential"}</p>

              <div className="mt-4 flex items-center gap-3">
                <p className="text-2xl font-extrabold text-sage-800">{displayPrice}</p>
                {reviews.length > 0 ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-sage-700/8 px-3 py-1 text-xs font-bold text-sage-700">
                    <span className="text-amber-500">
                      {"★".repeat(Math.round(averageRating)) + "☆".repeat(5 - Math.round(averageRating))}
                    </span>
                    <span>{averageRating}</span>
                    <span className="text-sage-600/80">({reviews.length})</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-sage-600/80">(No reviews yet)</span>
                )}
              </div>

              {cartNotice ? (
                <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {cartNotice}
                </p>
              ) : null}

              <p className="mt-4 text-sm leading-relaxed text-sage-700">{product?.description || "Premium herbal product for natural skincare."}</p>

              <ul className="mt-5 grid gap-2 text-sm font-medium text-sage-800 sm:grid-cols-2">
                {(product?.features || []).map((feature, idx) => (
                  <li key={`${feature}-${idx}`} className="flex items-center gap-2 rounded-xl bg-[#f4ecde]/80 px-3 py-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-sage-600" />
                    {feature || "Premium Quality"}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3">
                {isAdminUser ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Admin accounts cannot purchase products
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-5 py-3 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(31,61,43,0.28)] transition duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_16px_30px_rgba(31,61,43,0.34)]"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="rounded-full border border-sage-300 bg-white/85 px-5 py-3 text-sm font-extrabold tracking-[0.04em] text-sage-800 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:border-sage-500 hover:bg-white"
                    >
                      Buy Now
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap gap-2">
                {infoTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveInfoTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition duration-300 ${
                      activeInfoTab === tab.id
                        ? "bg-sage-700 text-white shadow-[0_10px_18px_rgba(31,61,43,0.24)]"
                        : "bg-[#f4ecde]/85 text-sage-700 hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p key={activeInfoTab} className="mt-4 animate-fadeUp text-sm leading-relaxed text-sage-700">
                {infoContent}
              </p>
            </section>
          </div>
        </section>

        {fallbackSimilarProducts.length > 0 ? (
          <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-sage-800">Similar Products</h2>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700/70">You may also like</p>
            </div>

            <div className="group relative">
              {/* Scroll Container */}
              <div
                ref={scrollContainerRef}
                className="scrollbar-hide flex gap-5 overflow-x-auto scroll-smooth"
              >
                {fallbackSimilarProducts.map((item, index) => {
                  if (!item) return null;
                  
                  const basePrice = Number(item.price) || 0;
                  const onSale = Boolean(item.onSale);
                  const salePercent = Number(item.salePercent) || 0;
                  
                  const itemPrice = onSale && salePercent > 0 && basePrice > 0
                    ? Math.max(1, Math.round(basePrice * (1 - salePercent / 100)))
                    : basePrice;

                  return (
                    <article
                      key={item?.id || `product-${index}`}
                      tabIndex={0}
                      onClick={() => navigate(`/product/${item?.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/product/${item?.id}`);
                        }
                      }}
                      className="group/card relative min-w-[260px] flex-shrink-0 overflow-hidden rounded-2xl border border-sage-100/90 bg-[#faf7f0]/92 transition-all duration-300 hover:shadow-lg hover:shadow-sage-800/15"
                    >
                      {/* Image Container */}
                      <div className="h-40 overflow-hidden bg-white/50">
                        <img
                          src={item?.images?.[0] || item?.image || item?.mainImageDataUrl || item?.imageDataUrl || "/images/soap-golden-tiger.jpeg"}
                          alt={item?.name || "Product"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          onError={(e) => {
                            e.target.src = "/images/soap-golden-tiger.jpeg";
                          }}
                        />
                      </div>

                      {/* Content Container */}
                      <div className="space-y-2 p-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-sage-700/75">{item?.category || "Product"}</p>
                        <h3 className="line-clamp-1 text-sm font-extrabold text-sage-800">{item?.name || "Product"}</h3>
                        <p className="line-clamp-2 text-xs text-sage-600">{item?.tagline || item?.copy || "Premium product"}</p>
                        <p className="pt-1 text-sm font-extrabold text-sage-800">Rs {itemPrice}</p>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
                        <div className="absolute inset-0 bg-gradient-to-t from-sage-900/20 to-transparent" />
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Left Scroll Arrow */}
              <button
                type="button"
                onClick={() => scrollCarousel("left")}
                className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-110 group-hover:opacity-100 opacity-0 hover:-left-3"
                aria-label="Scroll left"
              >
                <svg className="h-5 w-5 text-sage-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Right Scroll Arrow */}
              <button
                type="button"
                onClick={() => scrollCarousel("right")}
                className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-110 group-hover:opacity-100 opacity-0 hover:-right-3"
                aria-label="Scroll right"
              >
                <svg className="h-5 w-5 text-sage-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>
        ) : (
          <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 text-center shadow-soft sm:p-6">
            <h2 className="font-display text-3xl text-sage-800">Similar Products</h2>
            <p className="mt-2 text-sm text-sage-600">No similar products available</p>
          </section>
        )}

        <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-sage-800">Reviews</h2>
            {reviews.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-sage-700/8 px-3 py-1 text-sm font-bold text-sage-700">
                <span className="text-amber-500">
                  {"★".repeat(Math.round(averageRating)) + "☆".repeat(5 - Math.round(averageRating))}
                </span>
                <span>{averageRating}</span>
                <span className="text-sage-600/80">({reviews.length})</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-sage-600/80">(No reviews yet)</span>
            )}
          </div>

          {/* Scrollable Reviews Container */}
          <div className="relative mt-4">
            {/* Top Fade Overlay */}
            {reviews.length > 3 && (
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-12 bg-gradient-to-b from-white/65 to-transparent" />
            )}

            {/* Reviews List */}
            <div className="scrollbar-hide space-y-3 overflow-y-auto scroll-smooth" style={{ maxHeight: "350px" }}>
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-sage-100/90 bg-[#faf7f0]/90 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-sage-800">{review.name}</p>
                    <p className="text-sm text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-sage-700">{review.comment}</p>
                </article>
              ))}
            </div>

            {/* Bottom Fade Overlay */}
            {reviews.length > 3 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-12 bg-gradient-to-t from-white/65 to-transparent" />
            )}
          </div>

          <form onSubmit={handleReviewSubmit} className="mt-5 rounded-2xl border border-sage-100/90 bg-white/80 p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-sage-700">Add Review</h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Name</span>
                <input
                  name="name"
                  value={reviewForm.name}
                  onChange={handleReviewChange}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-sage-200/85 bg-white px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Rating</span>
                <div
                  className="rounded-xl border border-sage-200/85 bg-white px-3 py-2.5"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = value <= visibleRating;
                      return (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverRating(value)}
                          onClick={() => handleRatingSelect(value)}
                          className={`grid h-9 w-9 place-items-center rounded-full transition duration-200 ease-out sm:h-8 sm:w-8 ${
                            clickedRating === value ? "review-star-pop" : ""
                          } ${active ? "text-amber-400" : "text-sage-300"}`}
                          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6 transition duration-200 hover:scale-110"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.5 1.09 6.36L12 17.34 6.28 20.4l1.09-6.36L2.74 9.53l6.4-.93L12 2.8Z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-sage-700">
                    {selectedRating} - {ratingLabelMap[selectedRating]}
                  </p>
                </div>
              </label>
            </div>

            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Comment</span>
              <textarea
                name="comment"
                value={reviewForm.comment}
                onChange={handleReviewChange}
                placeholder="Share your experience"
                rows={4}
                required
                className="w-full resize-none rounded-xl border border-sage-200/85 bg-white px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
              />
            </label>

            <button
              type="submit"
              className="mt-4 rounded-full bg-sage-700 px-5 py-2.5 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Submit Review
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
