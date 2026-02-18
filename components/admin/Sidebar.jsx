import React from "react";
import { cls } from "./helpers";
import { IconGrid, IconClipboard, IconBox, IconLogout, IconX, IconSettings } from "./Icons";

const navItems = [
  { id: "overview", label: "Overview", Icon: IconGrid },
  { id: "orders", label: "Orders", Icon: IconClipboard },
  { id: "products", label: "Products", Icon: IconBox },
  { id: "settings", label: "Settings", Icon: IconSettings },
];

const Sidebar = ({
  activeTab,
  sidebarOpen,
  sseConnected,
  onLogout,
  onNav,
  onClose,
}) => (
  <aside
    className={cls(
      "fixed inset-y-0 left-0 z-40 w-[250px] flex flex-col transition-transform duration-300 lg:translate-x-0",
      "bg-[#1A3329]",
      sidebarOpen ? "translate-x-0" : "-translate-x-full",
    )}
  >
    {/* Brand */}
    <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-white/[.06]">
      <img
        src="/logo2.jpeg"
        className="w-9 h-9 rounded-lg object-cover"
        alt="Logo"
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-white truncate leading-tight">
          Nisarg Maitri
        </h1>
        <p className="text-[10px] text-white/30 leading-tight mt-px">Admin</p>
      </div>
      <button
        className="lg:hidden p-1 text-white/30 hover:text-white transition"
        onClick={onClose}
      >
        <IconX />
      </button>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-3 pt-6 pb-3 overflow-y-auto">
      <div className="space-y-0.5">
        {navItems.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={cls(
                "w-full flex items-center gap-3 px-3 py-[10px] rounded-lg text-[13px] transition-all duration-150",
                active
                  ? "bg-white text-[#1A3329] font-semibold"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[.05] font-normal",
              )}
            >
              <span className={active ? "text-[#1A3329]" : "text-white/40"}>
                <Icon />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>

    {/* Footer */}
    <div className="px-3 pb-4 space-y-2 border-t border-white/[.06] pt-3">
      <div className="mx-3 flex items-center gap-2">
        <span
          className={cls(
            "w-1.5 h-1.5 rounded-full",
            sseConnected ? "bg-green-400" : "bg-red-400",
          )}
        />
        <span className="text-[11px] text-white/25">
          {sseConnected ? "Live" : "Offline"}
        </span>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-[10px] rounded-lg text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/[.06] transition-all duration-150"
      >
        <IconLogout />
        Sign out
      </button>
    </div>
  </aside>
);

export default Sidebar;
