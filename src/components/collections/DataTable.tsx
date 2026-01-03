import React from "react";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
};

type Props<T> = {
  items: T[];
  columns: Column<T>[];
};

export default function DataTable<T>({ items, columns }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left py-2 px-3 font-semibold text-slate-300"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-900">
              {columns.map((col) => {
                const value = item[col.key];
                return (
                  <td key={String(col.key)} className="py-2 px-3 text-slate-300">
                    {col.render ? col.render(value, item) : String(value ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
