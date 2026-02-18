export const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return "";
  return "http://localhost:5001";
};

export const fmt = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  return isNaN(dt)
    ? "\u2014"
    : dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

export const money = (n) => "\u20B9" + (n || 0).toLocaleString("en-IN");

export const cls = (...args) => args.filter(Boolean).join(" ");

/**
 * Returns a human-readable payment label for an order.
 * COD  → "COD"
 * Razorpay + method known → "Prepaid (UPI)" / "Prepaid (Card)" etc.
 * Razorpay + method unknown → "Prepaid"
 */
export const paymentLabel = (order) => {
  if (!order) return "—";
  if (order.paymentMethod === "COD") return "COD";
  if (order.paymentMethod === "Razorpay") {
    const m = order.razorpayMethod;
    return m ? `Prepaid (${m})` : "Prepaid";
  }
  return order.paymentMethod || "—";
};

/**
 * Returns tailwind class sets for an orderStatus badge.
 * { bg, text, dot }
 */
export const orderStatusStyle = (status) => {
  switch (status) {
    case "Confirmed":
      return { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" };
    case "Delivered":
      return { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" };
    case "Cancelled":
      return { bg: "bg-red-50", text: "text-red-500", dot: "bg-red-500" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" };
  }
};