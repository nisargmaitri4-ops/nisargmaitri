import React from "react";
import { money, fmt, cls, paymentLabel, orderStatusStyle } from "./helpers";
import { IconChevronLeft, IconDownload } from "./Icons";

const OrderDetail = ({ order, onBack, onDownload, onUpdateStatus }) => {
  const sub = (order.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
  const currentStatus = order.orderStatus || "Confirmed";
  const isFinal = currentStatus === "Delivered" || currentStatus === "Cancelled";
  const style = orderStatusStyle(currentStatus);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <IconChevronLeft />
          </button>
          <div>
            <h2 className="text-base font-semibold text-[#1A3329]">
              {order.orderId}
            </h2>
            <p className="text-xs text-gray-400">{fmt(order.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={() => onDownload(order)}
          className="inline-flex items-center gap-2 h-9 px-4 bg-[#1A3329] text-white rounded-lg text-sm font-medium hover:bg-[#2F6844] transition"
        >
          <IconDownload />
          Download
        </button>
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Current status badge */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-gray-400">Status</p>
            <span
              className={cls(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
                style.bg, style.text,
              )}
            >
              <span className={cls("w-1.5 h-1.5 rounded-full", style.dot)} />
              {currentStatus}
            </span>
          </div>

          {/* Action buttons — only if order is still Confirmed */}
          {!isFinal && onUpdateStatus && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateStatus(order.orderId, "Delivered")}
                className="inline-flex items-center gap-1.5 h-8 px-4 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Mark as Delivered
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, "Cancelled")}
                className="inline-flex items-center gap-1.5 h-8 px-4 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/60 p-5">
          <p className="text-xs font-medium text-gray-400 mb-3">Customer</p>
          <p className="text-sm font-medium text-[#1A3329]">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-sm text-gray-500 mt-1.5">{order.customer.email}</p>
          <p className="text-sm text-gray-500">{order.customer.phone}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-5">
          <p className="text-xs font-medium text-gray-400 mb-3">Shipping</p>
          <div className="space-y-0.5 text-sm text-gray-600">
            <p>{order.shippingAddress?.address1}</p>
            {order.shippingAddress?.address2 && (
              <p>{order.shippingAddress.address2}</p>
            )}
            <p>
              {order.shippingAddress?.city}, {order.shippingAddress?.state} —{" "}
              {order.shippingAddress?.pincode}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-5">
          <p className="text-xs font-medium text-gray-400 mb-3">Payment</p>
          <p className="text-sm font-medium text-[#1A3329]">
            {paymentLabel(order)}
          </p>
          <span
            className={cls(
              "inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded",
              order.paymentStatus === "Success"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600",
            )}
          >
            {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">
                Item
              </th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">
                Qty
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">
                Price
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-[#1A3329]">
                  {item.name}
                </td>
                <td className="px-5 py-3 text-gray-500 text-center tabular-nums">
                  {item.quantity}
                </td>
                <td className="px-5 py-3 text-gray-500 text-right tabular-nums">
                  {money(item.price)}
                </td>
                <td className="px-5 py-3 font-medium text-[#1A3329] text-right tabular-nums">
                  {money(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-100 px-5 py-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="font-medium text-gray-600 tabular-nums">
              {money(sub)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Shipping</span>
            <span className="font-medium text-gray-600 tabular-nums">
              {order.shippingMethod?.cost === 0
                ? "Free"
                : money(order.shippingMethod?.cost)}
            </span>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-[#1A3329]">Total</span>
            <span className="font-semibold text-[#1A3329] tabular-nums">
              {money(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
