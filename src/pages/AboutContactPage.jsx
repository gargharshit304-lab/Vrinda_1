import { useEffect } from "react";
import SiteNav from "../components/SiteNav";

const reasons = [
  {
    title: "100% Natural",
    copy: "Pure botanical ingredients selected for gentle, mindful care without harsh additives.",
    icon: "Leaf"
  },
  {
    title: "Handmade",
    copy: "Every batch is crafted by hand in small quantities to preserve quality and freshness.",
    icon: "Palm"
  },
  {
    title: "Eco-friendly",
    copy: "From ingredient sourcing to packaging choices, we design with the planet in mind.",
    icon: "Globe"
  },
  {
    title: "Skin-safe",
    copy: "Formulations are thoughtfully balanced to support all skin types and daily routines.",
    icon: "Shield"
  }
];


export default function AboutContactPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

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

    return () => observer.disconnect();
  }, []);



  return (
    <div className="relative overflow-hidden pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_14%,rgba(86,124,96,0.28),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(170,140,106,0.26),transparent_28%),radial-gradient(circle_at_55%_84%,rgba(31,61,43,0.15),transparent_32%)]"
      />

      <SiteNav />

      <main className="mx-auto w-[min(1120px,94vw)] space-y-8 pt-6 md:space-y-10">
        <section className="section-reveal glass-card relative overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#f8f4ec]/90 via-[#f7f2e9]/82 to-[#eef4eb]/86 p-6 shadow-soft md:p-10">
          <div
            className="pointer-events-none absolute right-0 top-0 h-44 w-44 translate-x-16 -translate-y-14 rounded-full bg-gradient-to-br from-sage-300/45 to-earth-300/35 blur-2xl"
            aria-hidden="true"
          />

          <p className="inline-flex rounded-full border border-sage-200/80 bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-sage-700">
            About Vrinda
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] text-sage-800 md:text-6xl">Our Story</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-sage-700 md:text-base">
            Vrinda was created with a vision to bring nature closer to everyday rituals. Every product is handcrafted using herbal ingredients, inspired by traditional wellness practices.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-sage-200/75 bg-white/70 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sage-700/80">Mission</p>
              <p className="mt-2 text-sm font-medium text-sage-800 md:text-base">Natural, chemical-free living.</p>
            </article>
            <article className="rounded-2xl border border-sage-200/75 bg-white/70 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sage-700/80">Values</p>
              <p className="mt-2 text-sm font-medium text-sage-800 md:text-base">Sustainability, purity, simplicity.</p>
            </article>
          </div>

          <blockquote className="mt-6 rounded-2xl border border-earth-300/50 bg-[#fbf6ee]/85 p-5 text-sm italic leading-relaxed text-sage-700 md:text-base">
            "Vrinda started as a personal promise: create self-care that feels honest, earthy, and quietly luxurious. We still craft every formula with that same intention."
          </blockquote>
        </section>

        <section className="section-reveal">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-4xl leading-none text-sage-800 md:text-5xl">Why Choose Us</h2>
            <span className="hidden text-xs font-extrabold uppercase tracking-[0.2em] text-sage-700/70 sm:inline-flex">
              Crafted with care
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((item, index) => (
              <article
                key={item.title}
                className="glass-card group rounded-3xl border border-white/70 bg-white/66 p-5 transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_22px_40px_rgba(31,61,43,0.16)]"
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-sage-700 to-sage-500 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-white shadow-md">
                  {item.icon}
                </div>
                <h3 className="text-lg font-extrabold text-sage-800">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sage-700">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Contact section removed — About page focuses on brand story and features */}
      </main>
    </div>
  );
}