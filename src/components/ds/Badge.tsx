import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  color?: "default" | "accent" | "success" | "muted" | "warning" | "info" | "danger";
  variant?: "solid" | "outline";
  className?: string;
};

export default function Badge({ children, color = "default", variant = "solid", className }: Props) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";

  const solid = {
    default: "bg-slate-800 text-slate-100 border-slate-800",
    accent: "bg-emerald-500 text-slate-900 border-emerald-500",
    success: "bg-emerald-500/90 text-slate-900 border-emerald-500/90",
    muted: "bg-slate-700 text-slate-200 border-slate-700",
    warning: "bg-amber-400/90 text-slate-900 border-amber-400/90",
    info: "bg-sky-400/90 text-slate-900 border-sky-400/90",
    danger: "bg-rose-500/90 text-slate-900 border-rose-500/90",
  };

  const outline = {
    default: "bg-transparent text-slate-100 border-slate-700",
    accent: "bg-transparent text-emerald-300 border-emerald-400/70",
    success: "bg-transparent text-emerald-300 border-emerald-400/70",
    muted: "bg-transparent text-slate-300 border-slate-600",
    warning: "bg-transparent text-amber-300 border-amber-300/80",
    info: "bg-transparent text-sky-300 border-sky-300/80",
    danger: "bg-transparent text-rose-300 border-rose-300/80",
  };

  const palette = variant === "outline" ? outline : solid;

  return <span className={clsx(base, palette[color], className)}>{children}</span>;
}
