import React from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "../navigation/Tabs";
import { menuConfig } from "../navigation/tabsConfig";
import { useSelectedTeam } from "../../providers/SelectedTeamProvider";
import { useTeams } from "../../hooks/useTeams";

type Props = {
  children?: React.ReactNode;
};

export default function TopBar({ children }: Props) {
  const [open, setOpen] = React.useState(false);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 64, left: 12 });
  const [selectorPos, setSelectorPos] = React.useState<{ top: number; right: number }>({ top: 64, right: 12 });
  const navigate = useNavigate();
  const menuBtnRefMobile = React.useRef<HTMLButtonElement | null>(null);
  const menuBtnRefDesktop = React.useRef<HTMLButtonElement | null>(null);
  const selectorBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const { selectedTeam, setSelectedTeam, toggleMuted } = useSelectedTeam();
  const { data: teams } = useTeams();
  const uniqueTeams = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; logoUrl?: string | null }>();
    (teams ?? []).forEach((t) => {
      if (!map.has(t.id)) {
        map.set(t.id, { id: t.id, name: t.name, logoUrl: t.logoUrl });
      }
    });
    return Array.from(map.values()).slice(0, 16);
  }, [teams]);

  const updateMenuPos = React.useCallback((ref: React.RefObject<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  const updateSelectorPos = React.useCallback(() => {
    const rect = selectorBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectorPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right - 4),
    });
  }, []);

  React.useEffect(() => {
    if (!selectorOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (selectorBtnRef.current && selectorBtnRef.current.contains(e.target as Node)) return;
      setSelectorOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [selectorOpen]);

  const onSelectTeam = (id: string | null) => {
    setSelectorOpen(false);
    if (!id) {
      setSelectedTeam(null);
      return;
    }
    const team = teams?.find((t) => t.id === id);
    if (team) {
      setSelectedTeam({ id: team.id, name: team.name, logoUrl: team.logoUrl ?? undefined, muted: false });
    }
  };

  return (
    <header className="h-14 md:h-16 border-b border-slate-800 flex items-center px-3 md:px-4 bg-slate-950/80 backdrop-blur relative">
      <div className="flex items-center justify-between w-full gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="md:hidden rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-100 hover:bg-slate-800 flex items-center gap-2"
            onClick={() => {
              setOpen((v) => !v);
              updateMenuPos(menuBtnRefMobile);
            }}
            ref={menuBtnRefMobile}
          >
            <span className="flex flex-col gap-1">
              <span className="block w-5 h-0.5 bg-slate-100" />
              <span className="block w-5 h-0.5 bg-slate-100" />
              <span className="block w-5 h-0.5 bg-slate-100" />
            </span>
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
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="hidden md:flex rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-100 hover:bg-slate-800 items-center gap-2"
            onClick={() => {
              setOpen((v) => !v);
              updateMenuPos(menuBtnRefDesktop);
            }}
            ref={menuBtnRefDesktop}
          >
            <span className="flex flex-col gap-1">
              <span className="block w-5 h-0.5 bg-slate-100" />
              <span className="block w-5 h-0.5 bg-slate-100" />
              <span className="block w-5 h-0.5 bg-slate-100" />
            </span>
            <span className="text-xs font-semibold">Plus</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Mon équipe</span>
            <button
              type="button"
              ref={selectorBtnRef}
              onClick={() => {
                setSelectorOpen((v) => !v);
                updateSelectorPos();
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleMuted();
              }}
              className="h-10 w-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800/70 hover:border-slate-400 transition relative"
              title={selectedTeam ? `Équipe sélectionnée : ${selectedTeam.name}` : "Sélectionner une équipe"}
            >
              {selectedTeam ? (
                selectedTeam.logoUrl ? (
                  <img
                    src={selectedTeam.logoUrl}
                    alt={selectedTeam.name}
                    className={`h-full w-full object-cover ${selectedTeam.muted ? "grayscale opacity-70" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-white">
                    {selectedTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg font-semibold text-white">?</div>
              )}
            </button>
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
      {selectorOpen ? (
        <TeamSelectorDropdown
          top={selectorPos.top}
          right={selectorPos.right}
          teams={uniqueTeams}
          onSelect={onSelectTeam}
          selectedId={selectedTeam?.id ?? null}
        />
      ) : null}
    </header>
  );
}

function MobileMenu({ onSelect, top, left }: { onSelect: (path: string) => void; top: number; left: number }) {
  const [menuWidth, setMenuWidth] = React.useState<number>(360);

  React.useEffect(() => {
    const compute = () => {
      const maxLabel = menuConfig.reduce((acc, t) => Math.max(acc, t.label.length), 0);
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
          {menuConfig.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.path)}
              className="text-left rounded-lg px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/70 border border-slate-800 flex items-center gap-3"
            >
              <span className="h-7 w-7 rounded-md overflow-hidden flex items-center justify-center bg-slate-900">
                {tab.iconUrl ? (
                  <img
                    src={tab.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ transform: "scale(1.4)" }}
                  />
                ) : (
                  <span className="text-[10px] font-semibold">{tab.label.slice(0, 2)}</span>
                )}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

type TeamSelectorProps = {
  teams: { id: string; name: string; logoUrl?: string | null }[];
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  top: number;
  right: number;
};

function TeamSelectorDropdown({ teams, onSelect, selectedId, top, right }: TeamSelectorProps) {
  return (
    <div className="fixed z-[998]" style={{ top: `${top}px`, right: `${right}px` }}>
      <div className="border border-slate-800 bg-slate-950/95 backdrop-blur px-3 py-2 shadow-lg rounded-lg max-h-[70vh] overflow-auto min-w-[220px]">
        <div className="text-xs font-semibold text-slate-300 mb-2 px-1">Choisir une équipe</div>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`h-10 w-10 rounded-full border border-slate-700 bg-slate-800/70 flex items-center justify-center text-white font-bold hover:border-slate-400 ${
              selectedId === null ? "ring-2 ring-amber-400" : ""
            }`}
            title="Aucune sélection"
          >
            ?
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelect(team.id)}
              className={`h-10 w-10 rounded-full border border-slate-700 bg-slate-800/70 overflow-hidden hover:border-slate-400 ${
                selectedId === team.id ? "ring-2 ring-amber-400" : ""
              }`}
              title={team.name}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-white font-semibold">
                  {team.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
