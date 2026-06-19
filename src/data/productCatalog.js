export const ADMIN_PRODUCTS_KEY = "products";

export const defaultProducts = [
  {
    id: "botanical-face-serum",
    name: "Botanical Face Serum",
    category: "Bath & Body",
    price: 899,
    tagline: "Gentle. Nourishing. Naturally radiant.",
    description:
      "This handcrafted herbal formula is infused with rosehip, saffron, and skin-restoring botanicals to deeply nourish, balance hydration, and reveal a naturally healthy glow.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Rosehip oil, saffron extract, aloe vera, vitamin E, jojoba oil",
    howToUse:
      "Apply 2-3 drops on cleansed skin, gently press into face and neck, and follow with your moisturizer. Use morning and night.",
    type: "Serum",
    weightVolume: "30 ml",
    skinConcern: "Dullness, dryness",
    rating: 4.8,
    reviewCount: 162,
    unitsAvailable: 34,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "calm-soy-candle",
    name: "Calm Soy Candle",
    category: "Candles",
    price: 649,
    tagline: "Slow evenings. Soft glow. Pure calm.",
    description:
      "A clean-burning soy candle with lavender and cedarwood notes that transforms your room into a calming wellness corner.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Soy wax, lavender essential oil, cedarwood essential oil, cotton wick",
    howToUse: "Trim wick to 5 mm. Burn for 2-3 hours per session for even wax pool.",
    type: "Aromatherapy Candle",
    weightVolume: "180 g",
    skinConcern: "Mood and relaxation",
    rating: 4.6,
    reviewCount: 97,
    unitsAvailable: 41,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1607602132700-0682583a8f87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1631214540242-656d0d0f7f16?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "evening-herbal-tea",
    name: "Evening Herbal Tea",
    category: "Gift Sets / Accessories",
    price: 399,
    tagline: "Unwind naturally before bedtime.",
    description:
      "A soothing infusion of chamomile and tulsi crafted for calm evenings, relaxation, and gentle nighttime ritual.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Chamomile flowers, tulsi leaves, lemongrass, rose petals",
    howToUse: "Steep one teaspoon in hot water for 3-4 minutes. Enjoy warm.",
    type: "Herbal Tea Blend",
    weightVolume: "100 g",
    skinConcern: "Relaxation",
    rating: 4.7,
    reviewCount: 131,
    unitsAvailable: 52,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1594631661960-7767fbd9f5f6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "coffee-body-scrub",
    name: "Coffee Body Scrub",
    category: "Bath & Body",
    price: 499,
    tagline: "Polish, smooth, and energize.",
    description:
      "An energizing blend of arabica coffee and brown sugar that gently exfoliates dead skin and leaves your body soft and refreshed.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Arabica coffee, brown sugar, coconut oil, shea butter",
    howToUse: "Massage on damp skin in circular motions and rinse off thoroughly.",
    type: "Body Scrub",
    weightVolume: "200 g",
    skinConcern: "Tan and rough texture",
    rating: 4.5,
    reviewCount: 88,
    unitsAvailable: 37,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1601049531096-8f8e98ff8f5b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1620878438779-56b4125f6f8f?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "detox-clay-mask",
    name: "Detox Clay Mask",
    category: "Soaps",
    price: 579,
    tagline: "Purify pores. Restore clarity.",
    description:
      "A purifying neem and kaolin blend that draws out impurities, controls excess oil, and helps refine skin texture.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Neem extract, kaolin clay, tea tree oil, glycerin",
    howToUse: "Apply an even layer and leave for 10 minutes. Rinse with lukewarm water.",
    type: "Clay Mask",
    weightVolume: "80 g",
    skinConcern: "Oily to combination",
    rating: 4.7,
    reviewCount: 119,
    unitsAvailable: 43,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1620912189866-5ec5345d5f0a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1620683518579-c30e2c2f43eb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1611080541599-8c6dbde6ed28?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "aroma-oil-duo",
    name: "Aroma Oil Duo",
    category: "Gift Sets / Accessories",
    price: 799,
    tagline: "Elevate your everyday rituals.",
    description:
      "A thoughtfully curated duo of lemongrass and bergamot oils designed for refreshing aroma therapy and mindful relaxation.",
    features: ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"],
    ingredients: "Lemongrass essential oil, bergamot essential oil",
    howToUse: "Add 3-5 drops to diffuser or dilute in carrier oil before topical use.",
    type: "Essential Oil Set",
    weightVolume: "2 x 15 ml",
    skinConcern: "Aroma and massage",
    rating: 4.6,
    reviewCount: 76,
    unitsAvailable: 28,
    onSale: false,
    salePercent: 0,
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1608571423539-e951a5f2f25f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

const defaultFeatureList = ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"];

export const normalizeCatalogProduct = (product) => {
  const mainImage = product?.mainImageDataUrl || product?.imageDataUrl || product?.image || product?.images?.[0] || "";
  const additionalImages = Array.isArray(product?.additionalImageDataUrls)
    ? product.additionalImageDataUrls.filter(Boolean)
    : [];
  const images = Array.isArray(product?.images) && product.images.length
    ? product.images.filter(Boolean)
    : [mainImage, ...additionalImages].filter(Boolean);

  const features = Array.isArray(product?.features)
    ? product.features.map((feature) => String(feature).trim()).filter(Boolean)
    : [];

  return {
    id: String(product?.id || ""),
    status: String(product?.status || "active"),
    isDeleted: Boolean(product?.isDeleted),
    name: String(product?.name || "Unnamed Product"),
    category: String(product?.category || "Bath & Body"),
    price: Number(product?.price) || 0,
    tagline: String(product?.tagline || product?.copy || "Gentle. Nourishing. Naturally radiant."),
    description: String(product?.description || ""),
    features: features.length ? features : defaultFeatureList,
    ingredients: String(product?.ingredients || "Natural botanicals and essential oils."),
    howToUse: String(product?.howToUse || "Apply gently on damp skin and rinse thoroughly."),
    type: String(product?.type || "Herbal Care"),
    weightVolume: String(product?.weightVolume || "100 g"),
    skinConcern: String(product?.skinConcern || "All skin types"),
    rating: Number(product?.rating) || 4.6,
    reviewCount: Number(product?.reviewCount) || 0,
    unitsAvailable: Number.isFinite(Number(product?.unitsAvailable)) ? Math.max(0, Number(product.unitsAvailable)) : 0,
    onSale: Boolean(product?.onSale),
    salePercent: Number.isFinite(Number(product?.salePercent)) ? Math.max(0, Number(product.salePercent)) : 0,
    mainImageDataUrl: mainImage,
    additionalImageDataUrls: additionalImages,
    images: images.length ? images : [""],
    imageDataUrl: mainImage,
    copy: String(product?.copy || product?.tagline || "")
  };
};

const readAdminProductsRaw = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const readAdminProducts = () => readAdminProductsRaw().map(normalizeCatalogProduct);

export const getAllCatalogProducts = () => {
  return readAdminProducts();
};

export const getCatalogProductById = (productId) => {
  if (!productId) {
    return null;
  }
  return getAllCatalogProducts().find((product) => product.id === productId) || null;
};

export const makeProductId = (name) => {
  const base = String(name || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${base || "product"}-${Date.now().toString(36)}`;
};
