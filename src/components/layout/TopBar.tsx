import React from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "../navigation/Tabs";
import { tabsConfig as tabs } from "../navigation/tabsConfig";

type Props = {
  children?: React.ReactNode;
};

export default function TopBar({ children }: Props) {
  const [open, setOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 64, left: 12 });
  const navigate = useNavigate();
  const menuBtnRef = React.useRef<HTMLButtonElement | null>(null);

  const updateMenuPos = React.useCallback(() => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  return (
    <header className="h-14 md:h-16 border-b border-slate-800 flex items-center px-3 md:px-4 bg-slate-950/80 backdrop-blur relative">
      <div className="flex items-center justify-between w-full gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-100 hover:bg-slate-800"
            onClick={() => {
              setOpen((v) => !v);
              updateMenuPos();
            }}
            ref={menuBtnRef}
          >
            <span className="block w-5 h-0.5 bg-slate-100 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-100 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-100" />
          </button>
          <div className="text-sm md:text-base font-semibold text-white truncate">
            Tournoi RCHC U11 2026 - 10eme edition
          </div>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {children ?? null}
          <div className="hidden md:flex">
            <Tabs variant="top" />
          </div>
        </div>
      </div>
      {open ? (
        <MobileMenu
          top={menuPos.top}
          left={menuPos.left}
          onSelect={(path) => {
            setOpen(false);
            navigate(path);
          }}
        />
      ) : null}
    </header>
  );
}

function MobileMenu({ onSelect, top, left }: { onSelect: (path: string) => void; top: number; left: number }) {
  const [menuWidth, setMenuWidth] = React.useState<number>(360);

  React.useEffect(() => {
    const compute = () => {
      const maxLabel = tabs.reduce((acc, t) => Math.max(acc, t.label.length), 0);
      const estimated = maxLabel * 12 + 48; // char width estimate + padding
      const clamped = Math.max(220, Math.min(estimated, Math.floor(window.innerWidth * 0.95)));
      setMenuWidth(clamped);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return (
    <div className="fixed z-[999]" style={{ top: `${top}px`, left: `${left}px` }}>
      <div
        className="border border-slate-800 bg-slate-950/95 backdrop-blur px-4 pb-3 shadow-lg rounded-b-xl max-h-[70vh] overflow-auto"
        style={{ width: `${menuWidth}px` }}
      >
        <nav className="flex flex-col gap-2 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.path)}
              className="text-left rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/70 border border-slate-800 flex items-center gap-2"
            >
              {tab.iconUrl ? (
                <img
                  src={tab.iconUrl}
                  alt={tab.label}
                  className="h-5 w-5 object-contain"
                  loading="lazy"
                />
              ) : null}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
