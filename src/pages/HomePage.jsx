import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteNav from "../components/SiteNav";

// ====== DATA ======
const highlights = [
  "100% plant-derived blends",
  "Slow-poured small batches",
  "Mindfully sourced ingredients"
];

const taglines = [
  "Handcrafted Herbal Rituals",
  "Pure Botanical Self Care",
  "Ancient Ingredients, Modern Care",
  "Slow Living Essentials"
];

const ingredients = [
  { name: "Saffron", benefit: "Brightens and revitalizes skin naturally", image: "/images/saffron.webp", icon: "✨" },
  { name: "Neem", benefit: "Deep cleansing and healing properties", image: "/images/neem.webp", icon: "🌿" },
  { name: "Lavender", benefit: "Soothes and promotes relaxation", image: "/images/lavender.jpg", icon: "💜" },
  { name: "Turmeric", benefit: "Anti-inflammatory and skin brightening", image: "/images/turmeric.jpg", icon: "🟡" },
  { name: "Aloe Vera", benefit: "Hydrates and cools irritated skin", image: "/images/aloe.jpg", icon: "💚" }
];

const bestSellers = [
  {
    title: "Lemon Zest Revival",
    tagline: "Bright citrus-inspired herbal soap",
    image: "/images/soap-lemon.jpeg",
    rating: 4.8,
    price: 299,
    badge: "Best Seller"
  },
  {
    title: "Almond Essence Bar",
    tagline: "Nourishing almond milk blend",
    image: "/images/soap-almond.jpeg",
    rating: 4.9,
    price: 349,
    badge: "Luxury"
  },
  {
    title: "Golden Glow Tiger",
    tagline: "Haldi-infused artisan bar",
    image: "/images/soap-golden-tiger.jpeg",
    rating: 4.7,
    price: 319,
    badge: "New"
  },
  {
    title: "Velvet Rose",
    tagline: "Rose and silk therapy blend",
    image: "/images/soap-velvet-rose.jpeg",
    rating: 4.9,
    price: 359,
    badge: "Most Loved"
  }
];

const whyVrinda = [
  { title: "Handmade in Small Batches", description: "Each product is carefully crafted with attention to detail and quality control.", icon: "✋" },
  { title: "Cruelty Free", description: "We believe in ethical practices and never test on animals.", icon: "🐰" },
  { title: "Plant Based Ingredients", description: "100% botanical extracts without harmful chemicals or synthetics.", icon: "🌱" },
  { title: "Eco Conscious Packaging", description: "Sustainable, recyclable, and plastic-minimal packaging solutions.", icon: "🌍" }
];

const herbalWisdom = [
  {
    title: "Benefits of Saffron for Skin",
    excerpt: "Discover how saffron, the golden spice, can transform your skincare routine with its brightening and anti-inflammatory properties.",
    image: "/images/saffron.jpeg",
    category: "Ingredients"
  },
  {
    title: "Why Herbal Soaps Are Better",
    excerpt: "Learn the difference between herbal and commercial soaps, and why natural ingredients matter for your skin health.",
    image: "/images/soap-golden-tiger.jpeg",
    category: "Wellness"
  },
  {
    title: "Morning Wellness Rituals",
    excerpt: "Start your day right with a mindful morning ritual using herbal products and intention-setting practices.",
    image: "/images/soap-velvet-rose.jpeg",
    category: "Rituals"
  }
];

const collections = [
  {
    title: "Lemon Zest Revival",
    copy: "Bright citrus-inspired herbal soap crafted for a fresh and radiant cleanse.",
    metaA: "Vitamin Boost",
    metaB: "Refreshing",
    image: "/images/soap-lemon.jpeg"
  },
  {
    title: "Almond Essence Bar",
    copy: "Nourishing almond milk blend for soft, hydrated, and comforted skin.",
    metaA: "Rich Moisture",
    metaB: "Best Seller",
    image: "/images/soap-almond.jpeg"
  },
  {
    title: "Golden Glow Tiger",
    copy: "Haldi-infused artisan bar designed to uplift skin tone with earthy warmth.",
    metaA: "Haldi Extract",
    metaB: "New",
    image: "/images/soap-golden-tiger.jpeg"
  }
];

export default function HomePage() {
  const [parallaxY, setParallaxY] = useState(0);
  const [currentTagline, setCurrentTagline] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // ====== ANIMATIONS & INTERACTIONS ======
  useEffect(() => {
    // Parallax scroll effect
    const handleScroll = () => {
      const value = window.scrollY * 0.2;
      setParallaxY(Math.min(value, 130));
    };

    // Reveal elements on scroll
    const revealElements = Array.from(document.querySelectorAll(".section-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((element) => observer.observe(element));
    
    // Rotating taglines
    const taglineInterval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 4000);

    // Auto-scroll carousel
    const carouselInterval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % bestSellers.length);
    }, 6000);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
      clearInterval(taglineInterval);
      clearInterval(carouselInterval);
    };
  }, []);

  const scrollCarousel = (direction) => {
    if (direction === "next") {
      setCarouselIndex((prev) => (prev + 1) % bestSellers.length);
    } else {
      setCarouselIndex((prev) => (prev - 1 + bestSellers.length) % bestSellers.length);
    }
  };

  return (
    <div className="pb-20">
      <SiteNav />
      <main className="space-y-0">
        {/* ====== 1. HERO SECTION ====== */}
        <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-b from-[#fefdfb] via-[#fdfbf7] to-[#fbf9f3]">
          <div
            className="hero-bg-layer absolute inset-0 opacity-40"
            style={{ transform: `translateY(${parallaxY}px) scale(1.08)` }}
            aria-hidden="true"
          />
          {/* Premium dark overlay for cinematic effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/50" aria-hidden="true" />
          
          {/* Floating botanical elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-5 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-100/20 to-sage-100/10 blur-3xl animate-float" />
            <div className="absolute top-1/2 right-10 w-40 h-40 rounded-full bg-gradient-to-br from-amber-100/15 to-sage-100/10 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
            <div className="absolute bottom-20 left-1/3 w-36 h-36 rounded-full bg-gradient-to-br from-rose-100/15 to-emerald-100/10 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
          </div>

          <div className="relative mx-auto flex min-h-[90vh] w-[min(1120px,94vw)] items-center py-10 md:py-16 z-10">
            <section className="section-reveal glass-card hero-float max-w-3xl overflow-hidden rounded-[28px] border border-white/45 bg-white/16 p-8 shadow-2xl backdrop-blur-xl md:p-14">
              <div className="mb-6 inline-flex rounded-full border border-white/45 bg-white/25 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-earth-100 animate-pulse">
                Botanical Rituals
              </div>

              <div className="min-h-24 mb-6">
                <h1 className="max-w-3xl font-display text-4xl font-bold leading-[0.9] text-white transition-all duration-700 md:text-6xl">
                  {taglines[currentTagline]}
                </h1>
              </div>

              <p className="mt-4 max-w-2xl text-base text-earth-100/95 md:text-lg leading-relaxed">
                Handcrafted herbal essentials and artisan candles for mindful living. Experience the transformative power of nature in every ritual.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/shop" className="premium-btn">
                  Explore Collection
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-earth-100">
                {highlights.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <i className="h-2 w-2 rounded-full bg-emerald-200" />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </section>

        {/* ====== 2. INGREDIENT PHILOSOPHY SECTION ====== */}
        <section className="relative py-20 md:py-28 bg-gradient-to-b from-[#fbf9f3] to-[#f5f3ed]">
          <div className="mx-auto w-[min(1120px,94vw)]">
            <div className="section-reveal text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-sage-900 mb-4">Rooted in Nature</h2>
              <p className="max-w-2xl mx-auto text-sage-700 leading-relaxed">
                Each ingredient is selected for its botanical benefits and sustainability. We honor ancient wisdom combined with modern wellness science.
              </p>
            </div>

            {/* Responsive Grid - Mobile: 2 cols, Tablet: 3 cols, Desktop: 4-5 cols with scroll */}
            <div className="section-reveal ingredients-container overflow-x-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 min-w-min">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={ingredient.name}
                    className="ingredient-card group glass-card overflow-hidden rounded-[20px] border border-white/60 bg-gradient-to-br from-white/80 to-[#f9f5ed]/60 p-4 shadow-soft hover:shadow-lg cursor-pointer"
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="ingredient-image-wrapper mb-4">
                      <img 
                        src={ingredient.image} 
                        alt={ingredient.name}
                      />
                    </div>
                    <h3 className="font-display text-base md:text-lg font-semibold text-sage-900 line-clamp-1">{ingredient.name}</h3>
                    <p className="mt-2 text-xs md:text-sm text-sage-700 leading-relaxed line-clamp-2">{ingredient.benefit}</p>
                    <div className="ingredient-accent-line mt-3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ====== 3. RITUAL EXPERIENCE SECTION ====== */}
        <section className="relative py-20 md:py-28 bg-gradient-to-b from-[#f5f3ed] to-[#fefdfb]">
          <div className="mx-auto w-[min(1120px,94vw)]">
            <div className="section-reveal grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-[28px] border border-white/60 shadow-lg">
                <div className="h-96 md:h-[500px] bg-gradient-to-br from-emerald-100/40 to-sage-100/30 flex items-center justify-center relative overflow-hidden">
                  <img
                    src="/images/soap-velvet-rose.jpeg"
                    alt="Wellness ritual"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>

              <div className="space-y-5">
                <p className="inline-flex rounded-full border border-sage-200/80 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-sage-700">
                  Self Care
                </p>

                <h2 className="font-display text-4xl md:text-5xl font-bold leading-[0.95] text-sage-900">
                  More than skincare — a daily ritual
                </h2>

                <p className="text-base text-sage-700 leading-relaxed max-w-xl">
                  Vrinda invites you to slow down. To pause. To transform your daily shower or evening wind-down into a sacred moment of botanical care and self-love.
                </p>

                <div className="space-y-3 pt-3">
                  {[
                    { icon: "✋", title: "Slow Crafted", desc: "Each batch is thoughtfully prepared" },
                    { icon: "🌿", title: "Sulfate Free", desc: "Gentle on all skin types" },
                    { icon: "📦", title: "Small Batch", desc: "Limited production, premium quality" },
                    { icon: "🔮", title: "Ayurvedic Inspired", desc: "Ancient wisdom meets modern care" }
                  ].map((feature) => (
                    <div key={feature.title} className="flex gap-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <h4 className="font-semibold text-sage-900">{feature.title}</h4>
                        <p className="text-sm text-sage-600">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link to="/shop" className="inline-block mt-4 premium-btn">
                  Explore Rituals
                </Link>
              </div>
            </div>
          </div>
        </section>



        {/* ====== 8. PREMIUM FOOTER ====== */}
        <footer className="relative bg-gradient-to-b from-[#2a3f35] via-[#1f3830] to-[#1a2f2a] text-white pt-16 pb-8">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />

          <div className="relative mx-auto w-[min(1120px,94vw)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 pb-12 border-b border-white/20">
              {/* Brand */}
              <div>
                <h4 className="font-display text-lg font-semibold mb-4">Vrinda</h4>
                <p className="text-sm text-white/70 leading-relaxed">Premium herbal essentials for mindful living and botanical self-care.</p>
                <div className="flex gap-3 mt-4">
                  {["f", "i", "t", "p"].map((icon) => {
                    if (icon === "i") {
                      return (
                        <a
                          key={icon}
                          href="https://www.instagram.com/vrinda.organics/?hl=en"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-emerald-600 transition"
                        >
                          {icon}
                        </a>
                      );
                    }

                    return (
                      <a key={icon} href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-emerald-600 transition">
                        {icon}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold mb-4">Shop</h4>
                <ul className="space-y-2 text-sm">
                  {["Herbal Soaps", "Candles", "Gift Sets", "Best Sellers"].map((link) => (
                    <li key={link}>
                      <a href="#" className="text-white/70 hover:text-white transition">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learn */}
              <div>
                <h4 className="font-semibold mb-4">Learn</h4>
                <ul className="space-y-2 text-sm">
                  {["About Us", "Ingredients", "Blog", "Sustainability"].map((link) => (
                    <li key={link}>
                      <a href="#" className="text-white/70 hover:text-white transition">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter */}
              <div>
                <h4 className="font-semibold mb-4">Newsletter</h4>
                <p className="text-sm text-white/70 mb-3">Get wellness tips and exclusive offers.</p>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 text-xs rounded-l-lg bg-white/10 border border-white/20 text-white placeholder-white/50 outline-none"
                  />
                  <button className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-r-lg transition">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/60">
              <div>
                <p>© 2026 Vrinda Botanical Rituals. All rights reserved.</p>
              </div>
              <div className="flex gap-4 md:justify-end">
                <a href="#" className="hover:text-white transition">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white transition">
                  Terms of Service
                </a>
                <Link to="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </div>
            </div>

            {/* Sustainability statement */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-xs text-white/70 text-center leading-relaxed">
                Vrinda is committed to sustainable practices. Every purchase supports eco-friendly packaging and fair-trade sourcing of botanical ingredients.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
