import React from "react";
import Card from "../ds/Card";

type Props<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

export default function Grid<T>({ items, renderItem }: Props<T>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <Card key={idx}>{renderItem(item)}</Card>
      ))}
    </div>
  );
}
