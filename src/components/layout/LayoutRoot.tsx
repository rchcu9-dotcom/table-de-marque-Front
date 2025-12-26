import React from "react";
import TopBar from "./TopBar";
import Tabs from "../navigation/Tabs";

type Props = {
  children: React.ReactNode;
  topBarContent?: React.ReactNode;
};

export default function LayoutRoot({ children, topBarContent }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="sticky top-0 z-[200] bg-slate-950/95 backdrop-blur">
        <TopBar>{topBarContent}</TopBar>
      </div>
      <main className="flex-1 p-4 pb-24 md:pb-8">
        <div className="w-full max-w-6xl mx-auto">{children}</div>
      </main>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="px-2 pb-safe pt-2">
          <Tabs variant="bottom" />
        </div>
      </div>
    </div>
  );
}
