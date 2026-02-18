import React from "react";
import { money, fmt, cls, paymentLabel, orderStatusStyle } from "./helpers";
import { IconSearch, IconRefresh, IconEye, IconDownload } from "./Icons";

const STATUS_FILTERS = [
  { key: "all", label: "All Orders" },
  { key: "Confirmed", label: "New / Confirmed" },
  { key: "Delivered", label: "Delivered" },
  { key: "Cancelled", label: "Cancelled" },
];

const OrdersTab = ({
  orders,
  filteredOrders,
  orderLoading,
  orderSearch,
  setOrderSearch,
  orderDateFilter,
  setOrderDateFilter,
  orderStatusFilter,
  setOrderStatusFilter,
  orderSort,
  setOrderSort,
  fetchOrders,
  setSelectedOrder,
  downloadPDF,
}) => {
  /* counts per status for the pills */
  const counts = {
    all: orders.length,
    Confirmed: orders.filter((o) => (o.orderStatus || "Confirmed") === "Confirmed").length,
    Delivered: orders.filter((o) => o.orderStatus === "Delivered").length,
    Cancelled: orders.filter((o) => o.orderStatus === "Cancelled").length,
  };

  const hasActiveFilters = orderSearch || orderDateFilter || orderStatusFilter !== "all" || orderSort !== "newest";

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const active = orderStatusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setOrderStatusFilter(f.key)}
              className={cls(
                "h-8 px-3.5 rounded-lg text-xs font-medium transition border cursor-pointer",
                active
                  ? "bg-[#1A3329] text-white border-[#1A3329]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              {f.label}
              <span
                className={cls(
                  "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                  active ? "bg-white/20 text-white/80" : "bg-gray-100 text-gray-400",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Date + Sort toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search orders…"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 focus:ring-1 focus:ring-gray-200 outline-none transition placeholder:text-gray-300"
          />
        </div>
        <input
          type="date"
          value={orderDateFilter}
          onChange={(e) => setOrderDateFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
        />
        <select
          value={orderSort}
          onChange={(e) => setOrderSort(e.target.value)}
          className="h-10 px-3 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setOrderSearch("");
              setOrderDateFilter("");
              setOrderStatusFilter("all");
              setOrderSort("newest");
            }}
            className="h-10 px-4 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition cursor-pointer"
          >
            Clear all
          </button>
        )}
        <button
          onClick={fetchOrders}
          className="h-10 px-4 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 flex items-center gap-1.5 transition cursor-pointer"
        >
          <IconRefresh /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {orderLoading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1A3329] rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">
                    Order ID
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden sm:table-cell">
                    Payment
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const st = orderStatusStyle(o.orderStatus);
                  return (
                    <tr
                      key={o.orderId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
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
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span
                          className={cls(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded",
                            st.bg, st.text,
                          )}
                        >
                          <span className={cls("w-1.5 h-1.5 rounded-full", st.dot)} />
                          {o.orderStatus || "Confirmed"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#1A3329] transition"
                            title="View"
                          >
                            <IconEye />
                          </button>
                          <button
                            onClick={() => downloadPDF(o)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#1A3329] transition"
                            title="Download"
                          >
                            <IconDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-sm text-gray-400"
                    >
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {filteredOrders.length} of {orders.length} orders
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;
