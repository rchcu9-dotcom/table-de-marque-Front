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
        variant === "bottom"
          ? "justify-around px-2 py-2"
          : "justify-start gap-1 px-3 py-2"
      }`}
    >
      {tabsConfig.map((tab) => {
        const active = isActive(tab.path);
        const iconOnly = tab.id === "tournament"; // 5v5 tab: icon-only, no text
        const commonClasses =
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors";
        const activeClasses = "bg-slate-800 text-white border border-slate-700";
        const inactiveClasses =
          "text-slate-200 hover:bg-slate-800/60 border border-transparent";

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`${commonClasses} ${iconOnly ? "w-14 h-14 justify-center" : ""} ${
              active ? activeClasses : inactiveClasses
            }`}
            style={
              iconOnly && tab.iconUrl
                ? {
                    backgroundImage: `url(${tab.iconUrl})`,
                    backgroundSize: "70%",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }
                : undefined
            }
            aria-label={tab.label}
          >
            {tab.iconUrl ? (
              <img
                src={tab.iconUrl}
                alt={tab.label}
                className={`object-contain ${iconOnly ? "h-7 w-7 drop-shadow" : "h-5 w-5"} ${
                  active ? "" : "opacity-80"
                }`}
                loading="lazy"
              />
            ) : null}
            {!iconOnly && (
              <span className="whitespace-nowrap">
                {variant === "bottom" ? tab.shortLabel : tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
