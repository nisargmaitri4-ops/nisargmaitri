import React from "react";

const StatCard = ({ label, value, sub, icon }) => (
  <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-5 hover:border-gray-300/80 transition-colors duration-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-[#1A3329] mt-2 tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
    </div>
  </div>
);

export default StatCard;
