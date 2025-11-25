import React from "react";
import Card from "../ds/Card";

type Props<T> = {
  item: T;
  render: (item: T) => React.ReactNode;
};

export default function ResponsiveCard<T>({ item, render }: Props<T>) {
  return (
    <Card className="w-full">{render(item)}</Card>
  );
}
