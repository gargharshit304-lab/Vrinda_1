import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { apiRequest } from "../data/apiClient";
import { showToast } from "../data/toastEvents";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

export default function ContactPage() {
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState("");
  const cooldownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (submitted) setSubmitted(false);
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    // Ensure user is logged in before submitting
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (!token) {
      showToast("Please login to contact support", "warning");
      navigate("/login");
      return;
    }

    const { message } = formData;
    if (!message) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    try {
      // Only send the message; backend will use authenticated user info
      await apiRequest("/contact", { method: "POST", auth: true, body: JSON.stringify({ message }) });
      setSubmitted(true);
      setFormData(initialForm);
      // disable submit button briefly and show toast
      setCooldown(true);
      showToast("Thank you! We will get back to you soon.", "success");
      cooldownRef.current = window.setTimeout(() => setCooldown(false), 5000);
    } catch (err) {
      setError(err?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        window.clearTimeout(cooldownRef.current);
      }
    };
  }, []);

  return (
    <div className="relative overflow-hidden pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_14%,rgba(86,124,96,0.28),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(170,140,106,0.26),transparent_28%),radial-gradient(circle_at_55%_84%,rgba(31,61,43,0.15),transparent_32%)]"
      />

      <SiteNav />

      <main className="mx-auto w-[min(920px,94vw)] pt-8">
        <section className="glass-card mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#edf3ea]/88 via-[#f8f4eb]/88 to-[#f6f1e7]/88 p-6 shadow-soft md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="space-y-4">
              <p className="inline-flex rounded-full border border-sage-200/80 bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-sage-700">
                Contact
              </p>
              <h1 className="font-display text-4xl leading-[0.95] text-sage-800 md:text-5xl">Talk to us</h1>
              <p className="max-w-md text-sm leading-relaxed text-sage-700 md:text-base">
                We’d love to hear from you. Reach out for queries, feedback, or collaborations.
              </p>
              <div className="rounded-2xl border border-sage-200/80 bg-white/70 p-4 text-sm text-sage-700">
                {loading ? "Sending message..." : "We typically respond within 1-2 business days."}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-sage-200/80 bg-white/82 p-5 shadow-[0_18px_34px_rgba(31,61,43,0.1)] md:p-6">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700/90">
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  
                  className="w-full rounded-xl border border-sage-200/85 bg-white px-3.5 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700/90">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  
                  className="w-full rounded-xl border border-sage-200/85 bg-white px-3.5 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700/90">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full resize-none rounded-xl border border-sage-200/85 bg-white px-3.5 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                  placeholder="Tell us how we can help"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="submit" disabled={loading || cooldown} className="premium-btn">
                  {loading ? "Sending..." : cooldown ? "Sent" : "Send Message"}
                </button>
                {submitted ? (
                  <p aria-live="polite" className={`rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ${cooldown ? "animate-pulse" : ""}`}>
                    Thank you! We will get back to you soon.
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
