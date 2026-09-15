import React from "react";
import TopBar from "./TopBar";
import Tabs from "../navigation/Tabs";

type Props = {
  children: React.ReactNode;
  topBarContent?: React.ReactNode;
  /**
   * Rend l'enfant bord à bord et lui donne la hauteur exacte restante entre la
   * TopBar et les Tabs, à lui de gérer son propre défilement. Sans ça, le
   * conteneur `max-w-6xl` + padding découpe la page en blocs — ce qui casse
   * les panneaux plein écran de la page de présentation.
   */
  fullBleed?: boolean;
};

export default function LayoutRoot({ children, topBarContent, fullBleed }: Props) {
  return (
    <div
      className={`bg-slate-950 text-slate-100 flex flex-col ${
        fullBleed ? "h-[100svh] overflow-hidden" : "min-h-screen"
      }`}
    >
      <div className="sticky top-0 z-[200] bg-slate-950/95 backdrop-blur">
        <TopBar>{topBarContent}</TopBar>
      </div>
      {fullBleed ? (
        <main className="flex-1 min-h-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      ) : (
        <main className="flex-1 p-4 pb-24 md:pb-8">
          <div className="w-full max-w-6xl mx-auto">{children}</div>
        </main>
      )}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="px-2 pb-safe pt-2">
          <Tabs variant="bottom" />
        </div>
      </div>
    </div>
  );
}
