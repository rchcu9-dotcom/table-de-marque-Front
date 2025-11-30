import React from "react";
import clsx from "clsx";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  onClick?: () => void;
};

export default function Card({ children, className, onClick, ...rest }: Props) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-4",
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
