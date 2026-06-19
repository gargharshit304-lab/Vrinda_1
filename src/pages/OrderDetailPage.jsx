import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { fetchOrderById } from "../data/orderApi";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const normalizeStatus = (s) => {
  const n = String(s || "").trim().toLowerCase();
  if (n === "processing") return "pending";
  if (n === "completed") return "delivered";
  return n;
};

const getStatusTone = (status) => {
  const normalized = String(status || "pending").trim().toLowerCase();

  if (normalized === "packed") {
    return { label: "Packed", className: "status-packed" };
  }

  if (normalized === "delivered") {
    return { label: "Delivered", className: "status-delivered" };
  }

  if (normalized === "shipped" || normalized === "out for delivery") {
    return { label: "Out for Delivery", className: "status-out-for-delivery" };
  }

  return { label: "Pending", className: "status-pending" };
};

const getTrackingStatus = (order) => order?.status || order?.orderStatus || "Pending";

const getProgress = (status) => {
  const normalized = normalizeStatus(status || "pending");

  switch (normalized) {
    case "pending":
      return 25;
    case "packed":
      return 50;
    case "shipped":
    case "out for delivery":
      return 75;
    case "delivered":
      return 100;
    default:
      return 0;
  }
};

const getTimelineTimestamp = (order, stepLabel) => {
  const history = order?.statusHistory;
  const normalizedStep = normalizeStatus(stepLabel || "");

  if (history && typeof history === "object" && !Array.isArray(history)) {
    if (normalizedStep === "pending") {
      return history.pendingAt || order?.createdAt || "";
    }

    if (normalizedStep === "packed") {
      return history.packedAt || "";
    }

    if (normalizedStep === "out for delivery") {
      return history.outForDeliveryAt || "";
    }

    if (normalizedStep === "delivered") {
      return history.deliveredAt || "";
    }
  }

  if (Array.isArray(history)) {
    const match = history.find((entry) => {
      const entryStatus = String(entry?.status || "").trim().toLowerCase();
      return entryStatus === normalizedStep || (normalizedStep === "out for delivery" && entryStatus === "shipped");
    });

    return match?.updatedAt || (normalizedStep === "pending" ? order?.createdAt || "" : "");
  }

  return normalizedStep === "pending" ? order?.createdAt || "" : "";
};

const buildTimeline = (status) => {
  const normalized = normalizeStatus(status || "pending");
  const statusOrder = ["pending", "packed", "out for delivery", "delivered"];
  const currentIndex = statusOrder.indexOf(normalized === "shipped" ? "out for delivery" : normalized);

  return [
    { label: "Pending", icon: "📦", tone: "gray" },
    { label: "Packed", icon: "📦", tone: "green" },
    { label: "Out for Delivery", icon: "🚚", tone: "green" },
    { label: "Delivered", icon: "✅", tone: "green" }
  ].map((step, index) => ({
    ...step,
    state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "pending"
  }));
};

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusPulseKey, setStatusPulseKey] = useState(0);
  const previousStatusRef = useRef("");

  const loadOrder = useCallback(async () => {
    try {
      setError("");
      const data = await fetchOrderById(id);
      const nextStatus = getTrackingStatus(data);

      setOrder(data);

      if (previousStatusRef.current && previousStatusRef.current !== nextStatus) {
        setStatusPulseKey((current) => current + 1);
      }

      previousStatusRef.current = nextStatus;
      return data;
    } catch (requestError) {
      const status = Number(requestError?.status) || 0;
      if (status === 401) {
        setError("You are not logged in");
        navigate("/login", {
          replace: true,
          state: {
            from: `/orders/${id}`,
            message: "Please login to view order details"
          }
        });
      } else if (status === 404) {
        setError("Order not found.");
      } else if (status >= 500) {
        setError("Server error, try again later.");
      } else {
        setError(requestError?.message || "We could not load this order right now.");
      }

      setOrder(null);
      return null;
    }
  }, [id, navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialOrder = async () => {
      try {
        setLoading(true);
        if (!cancelled) {
          await loadOrder();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialOrder();

    return () => {
      cancelled = true;
    };
  }, [loadOrder]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadOrder();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadOrder]);

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const totalAmount = order?.totalAmount ?? order?.totalPrice ?? order?.subtotal ?? 0;
  const trackingStatus = getTrackingStatus(order);
  const statusTone = getStatusTone(trackingStatus);
  const timeline = useMemo(() => buildTimeline(trackingStatus), [trackingStatus]);
  const progress = getProgress(trackingStatus);
  const timelineKey = `${trackingStatus}-${statusPulseKey}`;

  return (
    <div className="pb-12">
      <SiteNav />

      <main className="mx-auto mt-6 w-[min(1120px,94vw)]">
        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/70 shadow-[0_18px_44px_rgba(31,61,43,0.08)] backdrop-blur-xl">
          <div className="border-b border-sage-200/70 bg-gradient-to-r from-[#f9fcf7] via-white to-[#f5faf5] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700/70">Order Details</p>
                <h1 className="mt-2 font-display text-4xl font-semibold text-sage-800">Track your order</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sage-700">
                  Review the current status, product list, delivery progress, and timestamps for this order.
                </p>
              </div>

              <Link
                to="/orders"
                className="rounded-full border border-sage-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-sage-700 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm"
              >
                Back to orders
              </Link>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <div className="rounded-3xl border border-sage-200/70 bg-[#faf7f0]/90 p-6 text-sm font-medium text-sage-700">
                Loading order details...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200/70 bg-rose-50/95 p-6 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : order ? (
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <article className="rounded-[28px] border border-sage-200/70 bg-white/80 p-5 shadow-[0_16px_34px_rgba(31,61,43,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/70">Order Info</p>
                        <p className="mt-2 text-2xl font-extrabold text-sage-800">{order.orderNumber || order._id}</p>
                        <p className="mt-1 text-sm text-sage-600">Date placed: {formatDateTime(order.createdAt)}</p>
                      </div>

                      <span className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${statusTone.className}`}>
                        {statusTone.label}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-sage-100 bg-[#faf7f0]/80 p-4">
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage-600">Created</p>
                        <p className="mt-1 text-sm font-semibold text-sage-800">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-sage-100 bg-[#faf7f0]/80 p-4">
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage-600">Updated</p>
                        <p className="mt-1 text-sm font-semibold text-sage-800">{formatDateTime(order.updatedAt)}</p>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-sage-200/70 bg-white/80 p-5 shadow-[0_16px_34px_rgba(31,61,43,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/70">Products</p>
                        <h2 className="mt-1 text-xl font-extrabold text-sage-800">Items in this order</h2>
                      </div>
                      <p className="text-sm font-semibold text-sage-600">{items.length} item{items.length === 1 ? "" : "s"}</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {items.map((item, index) => {
                        const name = item?.product?.name || item?.name || "Product";
                        const quantity = Number(item?.quantity) || 0;
                        const price = Number(item?.price) || 0;

                        return (
                          <div key={`${order._id || order.orderNumber}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl border border-sage-100 bg-[#faf7f0]/85 p-4 transition duration-300 hover:border-emerald-200 hover:bg-white">
                            <div className="min-w-0">
                              <p className="font-semibold text-sage-800">{name}</p>
                              <p className="mt-1 text-sm text-sage-600">Quantity: {quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-sage-600">Price</p>
                              <p className="text-base font-extrabold text-sage-800">{formatInr(price * quantity)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-sage-200/70 pt-4">
                      <p className="text-sm font-bold text-sage-700">Total Price</p>
                      <p className="text-2xl font-extrabold text-sage-800">{formatInr(totalAmount)}</p>
                    </div>
                  </article>
                </div>

                <aside className="space-y-6">
                  <article className="rounded-[28px] border border-emerald-100/80 bg-gradient-to-br from-white via-[#fbfdf9] to-emerald-50/70 p-5 shadow-[0_16px_34px_rgba(31,61,43,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/70">Tracking</p>
                        <h2 className="mt-1 text-xl font-extrabold text-sage-800">Timeline</h2>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                        Live
                      </span>
                    </div>

                    <div key={timelineKey} className="mt-6">
                      <div className="relative overflow-hidden px-1 pb-10 pt-2 sm:px-3">
                        <div className="absolute left-6 right-6 top-8 h-1 rounded-full bg-slate-200/90 sm:left-8 sm:right-8" />
                        <div
                          className="absolute left-6 top-8 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 shadow-[0_0_18px_rgba(34,197,94,0.24)] transition-[width] duration-700 ease-in-out sm:left-8"
                          style={{ 
                            width: `${Math.min(progress, 100)}%`,
                            maxWidth: "100%",
                            boxSizing: "border-box"
                          }}
                        />

                        <div className="relative z-10 grid grid-cols-4 gap-3 sm:gap-4">
                          {timeline.map((step, index) => {
                        const isCompleted = step.state === "completed";
                        const isCurrent = step.state === "current";
                        const stepTimestamp = getTimelineTimestamp(order, step.label);
                        const stepTimestampLabel = step.label === "Pending" ? "Placed on" : `${step.label} on`;

                        return (
                          <div key={step.label} className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center">
                              <div
                                className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg transition-all duration-500 ${
                                  isCompleted
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
                                    : isCurrent
                                      ? "timeline-step-current border-emerald-300 bg-emerald-50 text-emerald-600 shadow-[0_0_0_6px_rgba(52,211,153,0.12),0_10px_24px_rgba(16,185,129,0.18)]"
                                      : "border-sage-300 bg-white text-sage-300"
                                }`}
                              >
                                {isCurrent && (
                                  <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-emerald-300/30" />
                                )}
                                {step.icon}
                              </div>
                            </div>

                            <div className="mt-4 max-w-[11rem] space-y-1">
                              <p className={`text-sm font-bold transition-colors duration-300 ${isCompleted ? "text-emerald-700" : "text-sage-600"}`}>
                                {step.label}
                              </p>
                              <span className={`inline-flex text-[11px] font-extrabold uppercase tracking-[0.12em] ${isCompleted ? "text-emerald-600" : "text-sage-400"}`}>
                                {isCompleted ? "Done" : isCurrent ? "Current" : "Pending"}
                              </span>

                              {stepTimestamp ? (
                                <p className="text-xs font-medium leading-relaxed text-sage-500">
                                  {stepTimestampLabel}: {formatDateTime(stepTimestamp)}
                                </p>
                              ) : (
                                <p className="text-xs font-medium text-sage-400">Pending</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.14em] text-sage-400">
                        <span>Placed</span>
                        <span>Processing</span>
                        <span>On Route</span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[28px] border border-sage-200/70 bg-white/80 p-5 shadow-[0_16px_34px_rgba(31,61,43,0.06)]">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/70">Timestamps</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4 rounded-2xl bg-[#faf7f0]/85 p-4">
                        <div>
                          <p className="font-semibold text-sage-800">Created At</p>
                          <p className="mt-1 text-sage-600">Order was placed</p>
                        </div>
                        <p className="text-right font-bold text-sage-800">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="flex items-start justify-between gap-4 rounded-2xl bg-[#faf7f0]/85 p-4">
                        <div>
                          <p className="font-semibold text-sage-800">Updated At</p>
                          <p className="mt-1 text-sage-600">Latest status update</p>
                        </div>
                        <p className="text-right font-bold text-sage-800">{formatDateTime(order.updatedAt)}</p>
                      </div>
                    </div>
                  </article>
                </aside>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}