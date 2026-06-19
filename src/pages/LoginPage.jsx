import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { apiRequest } from "../data/apiClient";
import { setAuthSession } from "../data/authStorage";

const slides = [
  "/images/login_1.jpg",
  "/images/login_2.jpg",
  "/images/login_3.jpg"
];

const slideTexts = [
  "Handcrafted Botanical Rituals",
  "Luxury Wellness Inspired by Nature",
  "Pure Ingredients. Timeless Care."
];

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const [tab, setTab] = useState("signin");
  const [slideIndex, setSlideIndex] = useState(0);
  const [signinStatus, setSigninStatus] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [signinLoading, setSigninLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, kind: "success", text: "" });

  const [signinForm, setSigninForm] = useState({ email: "", password: "", rememberMe: false });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });

  const panelMeta = useMemo(
    () =>
      tab === "signin"
        ? { title: "Welcome back", copy: "Sign in with your email and password to continue." }
        : { title: "Create your account", copy: "Set up a new Vrinda account with your email and password." },
    [tab]
  );

  const redirectTo = location.state?.from || "/";

  useEffect(() => {
    // Allow Login/Signup page to be accessible even when already authenticated.
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, 6000); // show each slide ~6s for a calm, premium feel
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "signup") {
      setTab("signup");
    }
    if (mode === "signin") {
      setTab("signin");
    }
    if (params.get("google") === "error") {
      setSigninStatus("Google sign-in was not completed.");
      showToast("error", "Google sign-in failed");
    }
  }, [location.search]);

  useEffect(() => {
    const incomingMessage = location.state?.message;
    if (incomingMessage) {
      setSigninStatus(incomingMessage);
    }
  }, [location.state]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const token = params.get("token");
    const userJson = params.get("user");

    if (!token || !userJson) {
      return;
    }

    try {
      const user = JSON.parse(userJson);
      setAuthSession({ token, user });
      showToast("success", "Signed in with Google");
      navigate(redirectTo, { replace: true });
    } catch {
      setSigninStatus("Google sign-in could not be completed.");
      showToast("error", "Google sign-in failed");
    }
  }, [location.hash, navigate, redirectTo]);

  useEffect(() => {
    if (!toast.show) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast((old) => ({ ...old, show: false })), 2200);
    return () => window.clearTimeout(timer);
  }, [toast.show]);

  const showToast = (kind, text) => {
    setToast({ show: true, kind, text });
  };

  const handleGoogleLogin = () => {
    window.location.href = `${backendBaseUrl}/auth/google`;
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    const { name, email, password, confirmPassword, acceptTerms } = signupForm;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setSignupStatus("Please complete every field.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (!acceptTerms) {
      setSignupStatus("Please agree to the terms before creating an account.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (password.length < 8) {
      setSignupStatus("Password must be at least 8 characters long.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (password !== confirmPassword) {
      setSignupStatus("Passwords do not match.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    try {
      setSignupLoading(true);
      // eslint-disable-next-line no-console
      console.log("[signup] Sending request", {
        endpoint: "/api/auth/signup",
        payload: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordLength: password.length
        }
      });

      const payload = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      setAuthSession({ token: payload?.token, user: payload?.user });
      setSignupStatus(`Account created for ${name.trim()}. You can sign in now.`);
      showToast("success", "Signup successful");
      setSignupForm({ name: "", email: "", password: "", confirmPassword: "", acceptTerms: false });

      window.setTimeout(() => {
        setTab("signin");
        setSigninForm((prev) => ({ ...prev, email: email.trim().toLowerCase(), password: "" }));
      }, 1200);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[signup] Request failed", {
        endpoint: "/api/auth/signup",
        status: error?.status,
        message: error?.message
      });
      setSignupStatus(error.message || "Signup failed.");
      showToast("error", "Signup unsuccessful");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSignin = async (event) => {
    event.preventDefault();
    const email = signinForm.email.trim().toLowerCase();

    if (!email || !signinForm.password) {
      setSigninStatus("Enter your email and password.");
      return;
    }

    try {
      setSigninLoading(true);
      const payload = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: signinForm.password })
      });

      setAuthSession({ token: payload?.token, user: payload?.user });
      setSigninStatus(`Signed in as ${payload?.user?.name || "User"}.`);
      showToast("success", "Signin successful");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSigninStatus(error.message || "Email or password is incorrect.");
      showToast("error", "Signin unsuccessful");
    } finally {
      setSigninLoading(false);
    }
  };

  return (
    <div className="pb-10">
      <SiteNav />
      <main className="mx-auto mt-6 grid w-[min(1280px,94vw)] overflow-hidden rounded-[32px] border border-sage-200/80 bg-white/50 shadow-soft backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative min-h-[380px] overflow-hidden p-0">
          <style>{`
            .kenburns { transform-origin: center; will-change: transform; }
            .kenburns-active { animation-name: kenburns; animation-duration: 12s; animation-timing-function: cubic-bezier(0.4,0,0.2,1); animation-fill-mode: both; }
            @keyframes kenburns { from { transform: scale(1) translateY(0); } to { transform: scale(1.06) translateY(-1.5%); } }
            /* Reduce motion for users who prefer it */
            @media (prefers-reduced-motion: reduce) {
              .kenburns-active { animation: none !important; }
              .slide-fade { transition: opacity 600ms ease-in-out !important; }
            }
            /* Slight performance hint for mobile */
            .slide-fade, .kenburns { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          `}</style>

          <div className="relative h-full w-full overflow-hidden rounded-l-[32px]">
            {slides.map((slide, idx) => {
              const active = idx === slideIndex;
              return (
                <div
                  key={slide}
                  className={`absolute inset-0 flex items-center justify-center ${active ? "z-10" : "z-0 pointer-events-none"}`}
                  style={{ transition: "opacity 1200ms cubic-bezier(0.4,0,0.2,1)" }}
                >
                  <img
                    src={slide}
                    alt={`Vrinda slide ${idx + 1}`}
                    className={`absolute inset-0 h-full w-full object-cover object-center kenburns ${active ? "kenburns-active" : ""}`}
                    style={{ opacity: active ? 1 : 0, transition: "opacity 1200ms cubic-bezier(0.4,0,0.2,1)" }}
                  />

                  {/* dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/30 transition-opacity" style={{ opacity: active ? 1 : 0.85, transition: "opacity 1200ms cubic-bezier(0.4,0,0.2,1)" }} />

                  {/* Slide text */}
                  <div className="relative z-20 max-w-[80%] text-center px-6">
                    <h3 className="font-display text-2xl sm:text-3xl md:text-4xl text-white font-bold tracking-wide leading-tight" style={{ textShadow: "0 6px 18px rgba(0,0,0,0.4)" }}>
                      {slideTexts[idx]}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative bg-white/80 p-6 sm:p-10">
          <div
            className={`pointer-events-none absolute right-4 top-4 rounded-xl border px-4 py-2 text-sm font-bold ${
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            } transition ${toast.show ? "opacity-100" : "opacity-0"}`}
          >
            {toast.text}
          </div>

          <h1 className="font-display text-5xl font-bold leading-none text-sage-800">Vrinda</h1>

          <div className="mt-5 inline-flex rounded-full border border-sage-200 bg-white p-1">
            <button
              onClick={() => {
                setTab("signin");
                setSignupStatus("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                tab === "signin" ? "bg-sage-700 text-white" : "text-sage-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setSigninStatus("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                tab === "signup" ? "bg-sage-700 text-white" : "text-sage-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mt-5">
            <h2 className="font-display text-4xl font-semibold leading-[0.95] text-sage-900">{panelMeta.title}</h2>
            <p className="mt-2 text-sm text-sage-600">{panelMeta.copy}</p>
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignin} className="mt-6 space-y-3">
              <label className="block text-sm font-bold text-sage-800">
                Email address
                <input
                  type="email"
                  required
                  value={signinForm.email}
                  onChange={(event) => setSigninForm((old) => ({ ...old, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Password
                <input
                  type="password"
                  required
                  value={signinForm.password}
                  onChange={(event) => setSigninForm((old) => ({ ...old, password: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <button disabled={signinLoading} className="w-full rounded-full bg-gradient-to-r from-sage-700 to-sage-500 px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70">
                {signinLoading ? "Signing In..." : "Sign In"}
              </button>
              <div className="flex items-center gap-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sage-500">
                <span className="h-px flex-1 bg-sage-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-sage-200" />
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-800 transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-lg"
              >
                Continue with Google
              </button>
              <p className="min-h-5 text-sm font-bold text-sage-700">{signinStatus}</p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 space-y-3">
              <label className="block text-sm font-bold text-sage-800">
                Full name
                <input
                  type="text"
                  required
                  value={signupForm.name}
                  onChange={(event) => setSignupForm((old) => ({ ...old, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Email address
                <input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(event) => setSignupForm((old) => ({ ...old, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Create password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupForm.password}
                  onChange={(event) => setSignupForm((old) => ({ ...old, password: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupForm.confirmPassword}
                  onChange={(event) => setSignupForm((old) => ({ ...old, confirmPassword: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-sage-700">
                <input
                  type="checkbox"
                  checked={signupForm.acceptTerms}
                  onChange={(event) => setSignupForm((old) => ({ ...old, acceptTerms: event.target.checked }))}
                />
                I agree to the terms
              </label>

              <button disabled={signupLoading} className="w-full rounded-full bg-gradient-to-r from-sage-700 to-sage-500 px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70">
                {signupLoading ? "Creating Account..." : "Create Account"}
              </button>
              <div className="flex items-center gap-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sage-500">
                <span className="h-px flex-1 bg-sage-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-sage-200" />
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-800 transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-lg"
              >
                Continue with Google
              </button>
              <p className="min-h-5 text-sm font-bold text-sage-700">{signupStatus}</p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
