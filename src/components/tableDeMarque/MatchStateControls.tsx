import {
  useAnnoncerMatch,
  useDemarrerMatch,
  usePauserMatch,
  useTerminerMatch,
} from "../../hooks/useMatchLive";
import type { MatchLiveEtat } from "../../api/tableDeMarque";

type Props = {
  numMatch: number;
  etat: MatchLiveEtat;
  token: string;
};

type ActionButton = {
  label: string;
  allowedEtats: MatchLiveEtat[];
  className: string;
};

const ACTIONS: ActionButton[] = [
  { label: "Lancer l'annonce", allowedEtats: ["PLANIFIE"], className: "bg-blue-700 hover:bg-blue-600" },
  { label: "Démarrer", allowedEtats: ["ANNONCE", "EN_PAUSE"], className: "bg-emerald-700 hover:bg-emerald-600" },
  { label: "Pause", allowedEtats: ["EN_COURS"], className: "bg-amber-700 hover:bg-amber-600" },
  { label: "Terminer le match", allowedEtats: ["EN_PAUSE"], className: "bg-red-700 hover:bg-red-600" },
];

export default function MatchStateControls({ numMatch, etat, token }: Props) {
  const { mutate: annoncer, isPending: pendingAnnoncer } = useAnnoncerMatch(numMatch);
  const { mutate: demarrer, isPending: pendingDemarrer } = useDemarrerMatch(numMatch);
  const { mutate: pauser, isPending: pendingPauser } = usePauserMatch(numMatch);
  const { mutate: terminer, isPending: pendingTerminer } = useTerminerMatch(numMatch);

  if (etat === "TERMINE") {
    return (
      <div className="text-slate-400 text-sm text-center py-2">Match terminé — aucune action possible.</div>
    );
  }

  const anyPending = pendingAnnoncer || pendingDemarrer || pendingPauser || pendingTerminer;

  const handleAction = (label: string) => {
    if (label === "Lancer l'annonce") annoncer(token);
    else if (label === "Démarrer") demarrer(token);
    else if (label === "Pause") pauser(token);
    else if (label === "Terminer le match") terminer(token);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.filter((a) => a.allowedEtats.includes(etat)).map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.label)}
          disabled={anyPending}
          className={`px-4 py-2 rounded font-medium text-white text-sm transition disabled:opacity-50 ${action.className}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
