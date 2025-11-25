import React from "react";
import Card from "../ds/Card";

export type Field<T> = {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  secondary?: boolean;
};

type Props<T> = {
  items: T[];
  fields: Field<T>[];
  onItemClick?: (item: T) => void;
};

export default function List<T extends { id?: string | number }>({
  items,
  fields,
  onItemClick,
}: Props<T>) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
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
                    <span key={String(f.key)}>
                      <span className="font-medium text-slate-500 mr-1">{f.label}:</span>
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
