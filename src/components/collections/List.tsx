import React from "react";
import Card from "../ds/Card";

export type Field<T> = {
  key: keyof T;
  label?: string;
  render?: (value: any, item: T) => React.ReactNode;
  secondary?: boolean;
  hideLabel?: boolean;
};

export type SortConfig<T> = {
  key: keyof T;
  direction: "asc" | "desc";
  compare?: (a: T, b: T) => number;
};

type Props<T> = {
  items: T[];
  fields: Field<T>[];
  sort?: SortConfig<T>;
  onItemClick?: (item: T) => void;
};

const normalizeValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) return parsedDate;
    return value.toLowerCase();
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value !== "") return numeric;
  return value ?? "";
};

export default function List<T extends { id?: string | number }>({
  items,
  fields,
  sort,
  onItemClick,
}: Props<T>) {
  const sortedItems = React.useMemo(() => {
    if (!sort) return items;
    const { key, direction, compare } = sort;
    const comparator =
      compare ??
      ((a: T, b: T) => {
        const left = normalizeValue((a as any)[key]);
        const right = normalizeValue((b as any)[key]);
        if (left < right) return -1;
        if (left > right) return 1;
        return 0;
      });
    const factor = direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => comparator(a, b) * factor);
  }, [items, sort]);

  return (
    <div className="space-y-3">
      {sortedItems.map((item, idx) => {
        const primary = fields.find((f) => !f.secondary);
        const secondaryFields = fields.filter((f) => f.secondary);

        return (
          <Card
            key={item.id ?? idx}
            className={onItemClick ? "cursor-pointer hover:bg-slate-800/80" : ""}
            onClick={() => onItemClick?.(item)}
          >
            <div className="flex flex-col gap-1">
              {primary && (
                <div className="text-sm font-semibold">
                  {primary.render
                    ? primary.render((item as any)[primary.key], item)
                    : String((item as any)[primary.key])}
                </div>
              )}

              {secondaryFields.length > 0 && (
                <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  {secondaryFields.map((f) => (
                    <span key={String(f.key)} className="inline-flex items-center gap-1">
                      {!f.hideLabel && f.label && (
                        <span className="font-medium text-slate-500 mr-1">{f.label}:</span>
                      )}
                      {f.render
                        ? f.render((item as any)[f.key], item)
                        : String((item as any)[f.key] ?? "")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
