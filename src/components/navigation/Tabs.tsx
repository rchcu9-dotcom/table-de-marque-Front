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
        const commonClasses =
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors";
        const activeClasses = "bg-slate-800 text-white border border-slate-700";
        const inactiveClasses =
          "text-slate-200 hover:bg-slate-800/60 border border-transparent";

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`${commonClasses} ${active ? activeClasses : inactiveClasses}`}
          >
            <span className="whitespace-nowrap">
              {variant === "bottom" ? tab.shortLabel : tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
