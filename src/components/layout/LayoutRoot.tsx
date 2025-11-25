import React from "react";
import TopBar from "./TopBar";

export default function LayoutRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar />
      <main className="p-4">{children}</main>
    </div>
  );
}
