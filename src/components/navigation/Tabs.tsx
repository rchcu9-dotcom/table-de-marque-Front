import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tabsConfig } from "./tabsConfig";

type Props = {
  variant: "top" | "bottom";
};

export default function Tabs({ variant }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`flex items-center ${
        variant === "bottom" ? "justify-around px-2 py-2" : "justify-start gap-1 px-3 py-2"
      }`}
    >
      {tabsConfig.map((tab) => {
        const active = isActive(tab.path);
        const commonClasses =
          variant === "bottom"
            ? "flex flex-col items-center justify-center rounded-md w-12 h-12 transition-colors"
            : "flex items-center justify-center rounded-md px-3 py-2 text-sm transition-colors";
        const activeClasses = "bg-slate-800 text-white border border-slate-700";
        const inactiveClasses = "text-slate-200 hover:bg-slate-800/60 border border-transparent";
        const label = variant === "bottom" ? tab.shortLabel : tab.label;

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`${commonClasses} ${active ? activeClasses : inactiveClasses} ${
              variant === "bottom" ? "gap-1" : "gap-2"
            }`}
            aria-label={tab.label}
          >
            <div
              className={`flex items-center justify-center ${
                variant === "bottom" ? "h-7 w-7" : "h-6 w-6"
              } rounded-md overflow-hidden`}
            >
              {tab.iconUrl ? (
                <img
                  src={tab.iconUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ transform: "scale(1.4)" }}
                />
              ) : (
                <span className="text-[10px] font-semibold">{label.slice(0, 2)}</span>
              )}
            </div>
            <span
              className={
                variant === "bottom"
                  ? "text-[10px] leading-none text-slate-200"
                  : "whitespace-nowrap"
              }
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
