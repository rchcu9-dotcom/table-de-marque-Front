import React from "react";

type Props = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function Page({ title, actions, children }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
