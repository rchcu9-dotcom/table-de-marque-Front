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
  renderLeading?: (item: T) => React.ReactNode;
  alignCenter?: boolean;
  itemTestIdPrefix?: string;
  cardClassName?: string | ((item: T) => string);
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
  renderLeading,
  alignCenter,
  itemTestIdPrefix,
  cardClassName,
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

  const resolveCardClassName = React.useCallback(
    (item: T) =>
      typeof cardClassName === "function" ? cardClassName(item) : (cardClassName ?? ""),
    [cardClassName]
  );

  return (
    <div className={`space-y-3 ${alignCenter ? "flex flex-col items-center w-full" : ""}`}>
      {sortedItems.map((item, idx) => {
        const primary = fields.find((f) => !f.secondary);
        const secondaryFields = fields.filter((f) => f.secondary);
        const itemCardClass = resolveCardClassName(item);

        return (
          <Card
            key={item.id ?? idx}
            className={`${itemCardClass} ${
              onItemClick ? "cursor-pointer hover:bg-slate-800/80" : ""
            } ${alignCenter ? "flex flex-col items-center text-center w-full" : ""}`}
            data-testid={itemTestIdPrefix ? `${itemTestIdPrefix}${item.id ?? idx}` : undefined}
            onClick={() => onItemClick?.(item)}
          >
            <div
              className={`flex w-full flex-col gap-1 ${
                alignCenter ? "items-center text-center" : ""
              }`}
            >
              {renderLeading && (
                <div
                  className={`mb-2 flex items-center ${
                    alignCenter ? "w-full justify-center" : ""
                  }`}
                >
                  {renderLeading(item)}
                </div>
              )}
              {primary && (
                <div className={`text-sm font-semibold ${alignCenter ? "w-full text-center" : ""}`}>
                  {primary.render
                    ? primary.render((item as any)[primary.key], item)
                    : String((item as any)[primary.key])}
                </div>
              )}

              {secondaryFields.length > 0 && (
                <div
                  className={`text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 ${
                    alignCenter ? "justify-center w-full text-center" : ""
                  }`}
                >
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
