import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void; // <-- ajouté ici
};

export default function Card({ children, className, onClick }: Props) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-4",
        className
      )}
      onClick={onClick} // <-- ajouté ici
    >
      {children}
    </div>
  );
}
