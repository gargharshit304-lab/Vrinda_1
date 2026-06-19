import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

export default function OrderConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  return (
    <div className="pb-16">
      <SiteNav />

      <main className="mx-auto w-[min(980px,94vw)] pt-8">
        <section className="glass-card rounded-[30px] border border-emerald-200/75 bg-white/78 p-5 shadow-[0_24px_48px_rgba(31,61,43,0.14)] sm:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-sage-700 text-white shadow-[0_12px_24px_rgba(31,61,43,0.3)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4.2 4.2L19 6.5" />
                </svg>
              </span>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700/80">Order Confirmed</p>
                <h1 className="mt-1 font-display text-4xl leading-tight text-sage-800 sm:text-5xl">Order Placed Successfully 🎉</h1>
                {order?.id ? (
                  <p className="mt-2 text-sm font-semibold text-sage-700">Order ID: <span className="font-extrabold text-sage-800">{order.id}</span></p>
                ) : null}
              </div>
            </div>

            {order?.items?.length ? (
              <>
                <section className="mt-7 rounded-2xl border border-sage-200/80 bg-[#faf7f0]/92 p-4 sm:p-5">
                  <h2 className="font-display text-3xl text-sage-800">Purchased Items</h2>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <article
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-sage-800">{item.name}</p>
                          <p className="mt-1 text-xs font-semibold text-sage-700">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-extrabold text-sage-800">{formatInr(item.price * item.quantity)}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mt-5 grid gap-4 rounded-2xl border border-sage-200/80 bg-white/88 p-4 sm:grid-cols-2 sm:p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700/80">Total Amount</p>
                    <p className="mt-1 text-2xl font-extrabold text-sage-800">{formatInr(order.total || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700/80">Delivery Info</p>
                    <p className="mt-1 text-sm leading-relaxed text-sage-700">
                      Expected delivery in 3-5 business days. You will receive order updates by SMS and email.
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <section className="mt-7 rounded-2xl border border-sage-200/80 bg-[#faf7f0]/92 p-5 text-sm text-sage-700">
                No recent order details were found. Continue shopping to place a new order.
              </section>
            )}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-full border border-sage-200/80 bg-white px-5 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Continue Shopping
              </Link>
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5"
              >
                View Orders
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}