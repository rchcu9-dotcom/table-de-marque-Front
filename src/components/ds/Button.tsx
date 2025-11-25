import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "accent";
};

const Button: React.FC<Props> = ({ variant = "primary", className, children, ...rest }) => {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    accent: "bg-emerald-500 hover:bg-emerald-400 text-slate-900",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-100 border border-slate-700",
  };

  return (
    <button className={clsx(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
};

export default Button;
