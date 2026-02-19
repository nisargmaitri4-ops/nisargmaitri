import React from "react";
import StatCard from "./StatCard";
import { money, fmt, cls, paymentLabel } from "./helpers";

const OverviewTab = ({
  orders,
  totalRevenue,
  todayOrders,
  stats,
  products,
  setActiveTab,
  setSelectedOrder,
}) => (
  <div className="space-y-6">
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Revenue"
        value={money(totalRevenue)}
        icon={
          <span className="text-base font-semibold">₹</span>
        }
      />
      <StatCard
        label="Orders"
        value={orders.length}
        sub={todayOrders + " today"}
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <path d="M2 9h20" />
          </svg>
        }
      />
      <StatCard
        label="Products"
        value={stats ? stats.totalProducts : products.length}
        sub={(stats ? stats.activeProducts : "—") + " active"}
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 8v13H3V8" />
            <path d="M1 3h22v5H1z" />
          </svg>
        }
      />
      <StatCard
        label="Out of Stock"
        value={stats ? stats.outOfStock : 0}
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        }
      />
    </div>

    {/* Recent Orders */}
    <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <h3 className="text-sm font-semibold text-[#1A3329]">Recent Orders</h3>
        <button
          onClick={() => setActiveTab("orders")}
          className="text-xs text-gray-400 hover:text-gray-700 transition"
        >
          View all →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">
                Order
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">
                Customer
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">
                Date
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">
                Amount
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden sm:table-cell">
                Method
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 7).map((o) => (
              <tr
                key={o.orderId}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedOrder({...o});
                  setActiveTab("orders");
                }}
              >
                <td className="px-5 py-3 font-medium text-[#1A3329]">
                  {o.orderId}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {o.customer.firstName} {o.customer.lastName}
                </td>
                <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                  {fmt(o.createdAt)}
                </td>
                <td className="px-5 py-3 font-medium text-[#1A3329] text-right">
                  {money(o.total)}
                </td>
                <td className="px-5 py-3 hidden sm:table-cell">
                  <span
                    className={cls(
                      "text-[11px] font-medium px-2 py-0.5 rounded",
                      o.paymentMethod === "COD"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600",
                    )}
                  >
                    {paymentLabel(o)}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-gray-400"
                >
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>


  </div>
);

export default OverviewTab;
