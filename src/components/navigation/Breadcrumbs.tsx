import React from "react";
import { useNavigate } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  path?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: Props) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const parent = [...items]
    .slice(0, -1)
    .reverse()
    .find((item) => item.path);
  const showBack = Boolean(parent);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {showBack && parent?.path && (
        <button
          type="button"
          onClick={() => navigate(parent.path!)}
          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
        >
          Retour
        </button>
      )}
      <nav className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = item.path && !isLast ? (
            <button
              type="button"
              onClick={() => navigate(item.path!)}
              className="hover:text-slate-100 transition"
            >
              {item.label}
            </button>
          ) : (
            <span className={isLast ? "text-slate-100 font-semibold" : ""}>
              {item.label}
            </span>
          );

          return (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              {content}
              {!isLast && <span className="text-slate-500">›</span>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
