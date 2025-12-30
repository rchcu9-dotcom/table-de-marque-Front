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
            : "flex items-center justify-center rounded-md px-4 py-2 text-sm transition-colors";
        const activeClasses = "bg-slate-800 text-white border border-slate-700";
        const inactiveClasses = "text-slate-200 hover:bg-slate-800/60 border border-transparent";

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`${commonClasses} ${active ? activeClasses : inactiveClasses}`}
            aria-label={tab.label}
          >
            {variant === "bottom" ? (
              tab.iconUrl ? (
                <div className="h-11 w-11 rounded-md overflow-hidden flex items-center justify-center">
                  <img
                    src={tab.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ transform: "scale(1.5)" }}
                  />
                </div>
              ) : (
                <span className="text-xs">{tab.shortLabel}</span>
              )
            ) : (
              <span className="whitespace-nowrap">{tab.label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
