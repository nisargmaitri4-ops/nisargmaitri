import React from "react";
import { cls } from "./helpers";
import { IconMenu } from "./Icons";

const Header = ({ activeTab, sseConnected, onMenuClick, adminName }) => {
  const title =
    activeTab === "overview"
      ? "Dashboard"
      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  /* First letter of admin name, fallback to "A" */
  const avatarLetter = adminName?.trim()
    ? adminName.trim().charAt(0).toUpperCase()
    : "A";

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/60">
      <div className="flex items-center justify-between h-14 px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 -ml-1.5 text-gray-400 hover:text-gray-800 rounded-md hover:bg-gray-100 transition"
            onClick={onMenuClick}
          >
            <IconMenu />
          </button>
          <h1 className="text-[15px] font-semibold text-[#1A3329]">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className={cls(
                "w-1.5 h-1.5 rounded-full",
                sseConnected ? "bg-green-500" : "bg-gray-300",
              )}
            />
            {sseConnected ? "Live" : "Offline"}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1A3329] text-white flex items-center justify-center text-xs font-medium">
            {avatarLetter}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
