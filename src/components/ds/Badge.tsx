import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  color?: "default" | "accent";
};

export default function Badge({ children, color = "default" }: Props) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  const variants = {
    default: "bg-slate-800 text-slate-100",
    accent: "bg-emerald-500 text-slate-900",
  };

  return <span className={clsx(base, variants[color])}>{children}</span>;
}
