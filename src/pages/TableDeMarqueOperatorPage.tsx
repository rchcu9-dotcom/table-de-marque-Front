import { useState } from "react";
import { useMatches } from "../hooks/useMatches";
import { useMatchLive } from "../hooks/useMatchLive";
import { useEffectifsMatch } from "../hooks/useEffectifsMatch";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import ScoreBoard from "../components/tableDeMarque/ScoreBoard";
import MatchStateControls from "../components/tableDeMarque/MatchStateControls";
import ChronoDisplay from "../components/tableDeMarque/ChronoDisplay";
import ChronoEditForm from "../components/tableDeMarque/ChronoEditForm";
import AnnonceEffectifs from "../components/tableDeMarque/AnnonceEffectifs";
import ButForm from "../components/tableDeMarque/ButForm";
import ButList from "../components/tableDeMarque/ButList";
import PenaliteForm from "../components/tableDeMarque/PenaliteForm";
import PenaliteList from "../components/tableDeMarque/PenaliteList";
import Spinner from "../components/ds/Spinner";

const OPERATOR_ROLES = new Set(["TABLE_DE_MARQUE", "ORGANISATEUR"]);

function MatchPicker({
  onSelect,
}: {
  onSelect: (numMatch: number, label: string) => void;
}) {
  const { data: matches, isLoading } = useMatches();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <Spinner />
        <span>Chargement des matchs…</span>
      </div>
    );
  }

  const list = (matches ?? []).filter((m) => m.competitionType === "5v5" || m.competitionType === "3v3");

  return (
    <div className="space-y-2">
      <p className="text-slate-300 text-sm font-medium">Sélectionner un match</p>
      <select
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;
          const [id, label] = val.split("|");
          onSelect(parseInt(id, 10), label);
        }}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
      >
        <option value="">— Choisir un match —</option>
        {list.map((m) => (
          <option key={m.id} value={`${m.id}|${m.teamA} vs ${m.teamB}`}>
            #{m.id} — {m.teamA} vs {m.teamB}
          </option>
        ))}
      </select>
    </div>
  );
}

function OperatorPanel({
  numMatch,
  matchLabel,
  token,
}: {
  numMatch: number;
  matchLabel: string;
  token: string;
}) {
  const { data: liveData, isLoading: liveLoading } = useMatchLive(numMatch);
  const { data: effectifs } = useEffectifsMatch(numMatch);

  if (liveLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <Spinner />
        <span>Chargement…</span>
      </div>
    );
  }

  const live = liveData?.matchLive;
  const etat = live?.etat ?? "PLANIFIE";

  const equipe1 = effectifs?.equipe1;
  const equipe2 = effectifs?.equipe2;

  const canEdit = etat !== "TERMINE" && etat !== "PLANIFIE";
  const canAddEvents = etat === "EN_PAUSE";
  const canDeleteEvents = etat === "EN_PAUSE" || etat === "EN_COURS";

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-100 font-semibold">{matchLabel}</h2>
          <span className="text-xs text-slate-400">Match #{numMatch}</span>
        </div>

        {live && (
          <div className="flex items-center gap-4">
            <ChronoDisplay
              tempsEcouleSecondes={live.tempsEcouleSecondes}
              chronoEnCours={live.chronoEnCours}
              chronoDerniereMajAt={live.chronoDerniereMajAt}
            />
            <span className="text-2xl font-bold text-slate-100 tabular-nums">
              {live.score1Cache} — {live.score2Cache}
            </span>
          </div>
        )}

        <MatchStateControls numMatch={numMatch} etat={etat} token={token} />

        {etat === "EN_PAUSE" && live && (
          <ChronoEditForm
            numMatch={numMatch}
            tempsActuel={live.tempsEcouleSecondes}
            token={token}
          />
        )}
      </div>

      {canEdit && equipe1 && equipe2 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <h3 className="text-slate-200 font-medium text-sm">Effectifs annoncés</h3>
          <AnnonceEffectifs equipe1={equipe1} equipe2={equipe2} />
        </div>
      )}

      {canAddEvents && equipe1 && equipe2 && live && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
          <h3 className="text-slate-200 font-medium text-sm">Saisir un but</h3>
          <ButForm
            numMatch={numMatch}
            equipeId={equipe1.equipeId}
            equipeNom={equipe1.nom}
            joueurs={equipe1.joueurs}
            tempsActuel={live.tempsEcouleSecondes}
            token={token}
          />
          <ButForm
            numMatch={numMatch}
            equipeId={equipe2.equipeId}
            equipeNom={equipe2.nom}
            joueurs={equipe2.joueurs}
            tempsActuel={live.tempsEcouleSecondes}
            token={token}
          />
        </div>
      )}

      {liveData && liveData.buts.length > 0 && equipe1 && equipe2 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
          <h3 className="text-slate-200 font-medium text-sm">Buts</h3>
          <ButList
            numMatch={numMatch}
            buts={liveData.buts}
            equipe1Id={equipe1.equipeId}
            equipe1Nom={equipe1.nom}
            equipe2Id={equipe2.equipeId}
            equipe2Nom={equipe2.nom}
            canDelete={canDeleteEvents}
            token={token}
          />
        </div>
      )}

      {canAddEvents && equipe1 && equipe2 && live && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
          <h3 className="text-slate-200 font-medium text-sm">Saisir une pénalité</h3>
          <PenaliteForm
            numMatch={numMatch}
            equipeId={equipe1.equipeId}
            equipeNom={equipe1.nom}
            joueurs={equipe1.joueurs}
            tempsActuel={live.tempsEcouleSecondes}
            token={token}
          />
          <PenaliteForm
            numMatch={numMatch}
            equipeId={equipe2.equipeId}
            equipeNom={equipe2.nom}
            joueurs={equipe2.joueurs}
            tempsActuel={live.tempsEcouleSecondes}
            token={token}
          />
        </div>
      )}

      {liveData && liveData.penalites.length > 0 && equipe1 && equipe2 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
          <h3 className="text-slate-200 font-medium text-sm">Pénalités</h3>
          <PenaliteList
            numMatch={numMatch}
            penalites={liveData.penalites}
            equipe1Id={equipe1.equipeId}
            equipe1Nom={equipe1.nom}
            equipe2Id={equipe2.equipeId}
            equipe2Nom={equipe2.nom}
            canDelete={canDeleteEvents}
            token={token}
          />
        </div>
      )}
    </div>
  );
}

export default function TableDeMarqueOperatorPage() {
  const { role, token, isLoading } = useInscriptionSession();
  const [selectedMatch, setSelectedMatch] = useState<{ numMatch: number; label: string } | null>(
    null,
  );

  const isOperator = role !== null && OPERATOR_ROLES.has(role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {!selectedMatch && (
          <MatchPicker
            onSelect={(numMatch, label) => setSelectedMatch({ numMatch, label })}
          />
        )}
        {selectedMatch && (
          <>
            <ScoreBoard
              numMatch={selectedMatch.numMatch}
              equipe1Nom={selectedMatch.label.split(" vs ")[0]}
              equipe2Nom={selectedMatch.label.split(" vs ")[1]}
            />
            <p className="text-slate-400 text-xs text-center">Vue lecture seule</p>
            <button
              onClick={() => setSelectedMatch(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              ← Changer de match
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-slate-100 text-xl font-bold">Table de marque</h1>

      {!selectedMatch ? (
        <MatchPicker
          onSelect={(numMatch, label) => setSelectedMatch({ numMatch, label })}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMatch(null)}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              ← Changer de match
            </button>
          </div>
          <OperatorPanel
            numMatch={selectedMatch.numMatch}
            matchLabel={selectedMatch.label}
            token={token ?? ""}
          />
        </>
      )}
    </div>
  );
}
