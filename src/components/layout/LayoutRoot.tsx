import React from "react";
import TopBar from "./TopBar";

type Props = {
  children: React.ReactNode;
  topBarContent?: React.ReactNode;
};

export default function LayoutRoot({ children, topBarContent }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar>{topBarContent}</TopBar>
      <main className="p-4">{children}</main>
    </div>
  );
}
