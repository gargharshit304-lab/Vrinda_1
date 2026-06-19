import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { fetchMyOrders } from "../data/orderApi";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString();
};

const normalizeStatus = (s) => {
  const n = String(s || "").trim().toLowerCase();
  if (n === "processing") return "pending";
  if (n === "completed") return "delivered";
  return n;
};

const getStatusMeta = (status) => {
  const normalized = normalizeStatus(status || "pending");

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

const getOrderTrackingStatus = (order) => normalizeStatus(order?.status || order?.orderStatus || "Pending");

const getTrackingStatusTone = (status) => {
  const normalized = normalizeStatus(status || "pending");

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

const getTimelineTimestamp = (order, stepLabel) => {
  const history = order?.statusHistory;
  const step = String(stepLabel || "").trim().toLowerCase();

  if (history && typeof history === "object" && !Array.isArray(history)) {
    if (step === "pending") {
      return history.pendingAt || order?.createdAt || "";
    }

    if (step === "packed") {
      return history.packedAt || "";
    }

    if (step === "out for delivery") {
      return history.outForDeliveryAt || "";
    }

    if (step === "delivered") {
      return history.deliveredAt || "";
    }
  }

  if (Array.isArray(history)) {
    const match = history.find((entry) => {
      const entryStatus = String(entry?.status || "").trim().toLowerCase();
      return entryStatus === step || (step === "out for delivery" && entryStatus === "shipped");
    });

    return match?.updatedAt || (step === "pending" ? order?.createdAt || "" : "");
  }

  return step === "pending" ? order?.createdAt || "" : "";
};

// Order Timeline Component
function OrderTimeline({ order, status }) {
  const steps = ["Pending", "Packed", "Out for Delivery", "Delivered"];
  const statusMap = {
    "pending": 0,
    "packed": 1,
    "shipped": 2,
    "out for delivery": 2,
    "delivered": 3
  };

  const normalizedStatus = normalizeStatus(status || "pending");
  const currentStepIndex = statusMap[normalizedStatus] ?? 0;
  const statusTone = getTrackingStatusTone(status);

  return (
    <div className="mt-6 rounded-[28px] border border-emerald-100/70 bg-gradient-to-br from-white via-[#fafcf8] to-emerald-50/70 p-6 shadow-[0_18px_36px_rgba(31,61,43,0.08)] transition duration-500">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-100/70 pb-4">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">Order Timeline</h4>
          <p className="mt-1 text-xs text-sage-500">Live progress from warehouse to doorstep</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${statusTone.className}`}>
          {statusTone.label}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const timestamp = getTimelineTimestamp(order, step);
          const timestampLabel = step === "Pending" ? "Placed on" : `${step} on`;

          return (
            <div
              key={step}
              className={`flex items-start gap-4 rounded-2xl px-1 py-1 transition duration-300 hover:bg-white/70 ${isCurrent ? "bg-emerald-50/50" : ""}`}
            >
              <div className="flex flex-col items-center pt-0.5">
                <div
                  className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.24)]"
                      : "border-sage-300 bg-white"
                  } ${isCurrent ? "scale-105" : ""}`}
                >
                  {isCompleted ? (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className={`h-2.5 w-2.5 rounded-full ${isCurrent ? "bg-emerald-500" : "bg-sage-300"}`} />
                  )}
                </div>

                {index < steps.length - 1 && (
                  <div className={`mt-1 w-0.5 flex-1 rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-sage-200"}`} />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-1.5 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-bold transition-colors duration-300 ${isCompleted ? "text-emerald-700" : "text-sage-600"}`}>
                    {step}
                  </p>
                  <span
                    className={`text-[11px] font-extrabold uppercase tracking-[0.12em] transition-opacity duration-300 ${
                      isCompleted ? "text-emerald-600" : "text-sage-400"
                    }`}
                  >
                    {isCurrent ? "Current" : isCompleted ? "Done" : "Pending"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? "w-full bg-emerald-500" : isCurrent ? "w-1/2 bg-emerald-300" : "w-0 bg-transparent"
                    }`}
                  />
                </div>
                {timestamp ? (
                  <p className="mt-2 text-xs font-medium text-sage-500">{timestampLabel}: {formatDateTime(timestamp)}</p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-sage-400">Pending</p>
                )}
                {isCurrent && <p className="mt-2 text-xs font-medium text-emerald-600">Your order is here now</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);

  // Reusable fetch function
  const fetchOrdersData = async () => {
    try {
      setError("");
      const data = await fetchMyOrders();
      setOrders(data);
      setLastUpdated(new Date());
      return true;
    } catch (requestError) {
      const status = Number(requestError?.status) || 0;

      if (status === 401) {
        setError("You are not logged in");
        navigate("/login", {
          replace: true,
          state: {
            from: "/orders",
            message: "Please login to view your orders"
          }
        });
      } else if (status >= 500) {
        setError("Server error, try again later");
      } else {
        setError("We could not load your orders right now.");
      }

      setOrders([]);
      return false;
    }
  };

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        setLoading(true);
        if (!cancelled) {
          await fetchOrdersData();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!isAutoRefreshing) {
      return;
    }

    const interval = setInterval(async () => {
      await fetchOrdersData();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoRefreshing]);
  // Timer to update "last updated" display
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated((prev) => new Date(prev.getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const orderCards = useMemo(
    () =>
      orders.map((order) => {
        const statusMeta = getStatusMeta(getOrderTrackingStatus(order));
        const orderNumber = order.orderNumber || order._id;
        const items = Array.isArray(order.items) ? order.items : [];
        const totalAmount = order.totalAmount ?? order.totalPrice ?? 0;
        const isExpanded = expandedOrder === (order._id || orderNumber);

        return (
          <article
            key={order._id || orderNumber}
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/orders/${order._id || orderNumber}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/orders/${order._id || orderNumber}`);
              }
            }}
            className="group relative cursor-pointer overflow-hidden rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-[0_16px_34px_rgba(31,61,43,0.08)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-emerald-200/70 hover:shadow-[0_24px_50px_rgba(31,61,43,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-lime-400 opacity-80" />

            {/* Order Header */}
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Order ID</p>
                <p className="text-lg font-extrabold text-sage-800">{orderNumber}</p>
                <p className="text-sm font-medium text-sage-700">Placed on {formatDate(order.createdAt)}</p>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] shadow-sm transition duration-300 group-hover:scale-[1.02] ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
                <button
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedOrder(isExpanded ? null : (order._id || orderNumber));
                  }}
                  className="text-xs font-bold text-sage-700 transition duration-300 hover:text-emerald-700"
                >
                  {isExpanded ? "Hide Timeline" : "View Timeline"}
                </button>
                <Link
                  to={`/orders/${order._id || orderNumber}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-xs font-bold text-emerald-700 transition duration-300 hover:text-emerald-900"
                >
                  View Details
                </Link>
              </div>
            </div>

            {/* Products Section */}
            <div className="mt-5 rounded-[24px] border border-sage-200/70 bg-gradient-to-br from-[#faf7f0]/95 to-white p-4 transition duration-300 group-hover:border-emerald-100/70">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Products</p>
              <div className="mt-3 space-y-3">
                {items.map((item, index) => {
                  const productName = item.product?.name || item.name || "Product";
                  const quantity = Number(item.quantity) || 0;
                  const price = Number(item.price) || 0;

                  return (
                    <div key={`${orderNumber}-${item.product?._id || item.name || index}`} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-sage-800">{productName}</p>
                        <p className="mt-1 text-xs font-medium text-sage-600">Quantity: {quantity}</p>
                      </div>
                      <p className="shrink-0 font-extrabold text-sage-800">{formatInr(price * quantity)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Price */}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-sage-200/70 pt-4">
              <p className="text-sm font-bold text-sage-700">Total Price</p>
              <p className="text-lg font-extrabold text-sage-800">{formatInr(totalAmount)}</p>
            </div>

            {/* Order Timeline (Expandable) */}
            {isExpanded && (
              <div className="mt-4 transition-all duration-500 ease-out">
                <OrderTimeline order={order} status={getOrderTrackingStatus(order)} />
              </div>
            )}
          </article>
        );
      }),
    [orders, expandedOrder, lastUpdated]
  );

  return (
    <div className="pb-12">
      <SiteNav />

      <main className="mx-auto mt-6 w-[min(1120px,94vw)] overflow-hidden">
        <section className="glass-card rounded-[30px] border border-white/70 bg-white/65 p-5 shadow-soft sm:p-7">
          <div className="sticky top-3 z-20 -mx-5 mb-4 border-b border-white/60 bg-white/80 px-5 pb-4 pt-1 backdrop-blur-xl sm:-mx-7 sm:px-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sage-700/75">Order History</p>
                <h1 className="mt-1 font-display text-4xl font-semibold text-sage-800">My Orders</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sage-700">
                  Track every order you have placed, including its current status, products, and real-time delivery timeline.
                </p>
                {!loading && orders.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-full border border-emerald-100/80 bg-white/75 px-4 py-2 shadow-[0_10px_24px_rgba(31,61,43,0.06)] backdrop-blur-sm transition duration-300">
                    <div className={`h-2.5 w-2.5 rounded-full ${isAutoRefreshing ? "animate-pulse bg-emerald-500" : "bg-sage-300"}`} />
                    <p className="text-xs font-medium text-sage-600">
                      {isAutoRefreshing ? "Auto-refreshing" : "Auto-refresh paused"} · Last updated {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago
                    </p>
                    <button
                      onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                      className="ml-auto rounded-full border border-sage-200 bg-white px-3 py-1 text-xs font-bold text-sage-700 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm"
                    >
                      {isAutoRefreshing ? "Pause" : "Resume"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-sage-200/70 bg-[#faf7f0]/90 p-6 text-sm font-medium text-sage-700">
              Loading your orders...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-rose-200/70 bg-rose-50/95 p-6 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : orders.length > 0 ? (
            <div className="orders-scroll mt-6 h-[70vh] overflow-y-auto pb-4 pr-1 lg:max-h-[75vh]">
              <div className="grid gap-4 pb-4">
                {orderCards}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-sage-200/70 bg-[#faf7f0]/90 p-8 text-center">
              <p className="text-base font-semibold text-sage-800">Your orders will appear here</p>
              <p className="mt-2 text-sm text-sage-700">Once you place an order, it will show up in this history view with live tracking.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}