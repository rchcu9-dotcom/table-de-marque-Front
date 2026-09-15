import { useState } from 'react';
import type {
  FormatGraphe,
  FormatGroupe,
  FormatGroupeFormule,
  FormatPhase,
} from '../../api/formatGraphe';
import GroupeCard from './GroupeCard';

type Props = {
  phase: FormatPhase;
  graphe: FormatGraphe;
  onModifierPhaseNom: (phaseId: number, nom: string) => void;
  onSupprimerPhase: (phaseId: number) => void;
  onCreerGroupe: (phaseId: number, nom: string) => void;
  onModifierGroupeNom: (groupeId: number, nom: string) => void;
  onModifierGroupeFormule?: (groupeId: number, formule: FormatGroupeFormule) => void;
  onSupprimerGroupe: (groupeId: number) => void;
  onAjouterPlace: (groupeId: number) => void;
  onSupprimerPlace: (placeId: number) => void;
  onDefinirLien: (groupeSourceId: number, rangSource: number, groupeCibleId: number) => void;
  onEliminer: (groupeSourceId: number, rangSource: number) => void;
  onReinitialiserLien: (groupeSourceId: number, rangSource: number) => void;
  isLoading: boolean;
};

export default function PhaseColumn({
  phase,
  graphe,
  onModifierPhaseNom,
  onSupprimerPhase,
  onCreerGroupe,
  onModifierGroupeNom,
  onModifierGroupeFormule = () => {},
  onSupprimerGroupe,
  onAjouterPlace,
  onSupprimerPlace,
  onDefinirLien,
  onEliminer,
  onReinitialiserLien,
  isLoading,
}: Props) {
  const [editingNom, setEditingNom] = useState(false);
  const [nomDraft, setNomDraft] = useState(phase.nom);
  const [nouveauGroupeNom, setNouveauGroupeNom] = useState('');

  function handleNomBlur() {
    setEditingNom(false);
    if (nomDraft.trim() && nomDraft !== phase.nom) {
      onModifierPhaseNom(phase.id, nomDraft.trim());
    }
  }

  function handleAjouterGroupe(e: React.FormEvent) {
    e.preventDefault();
    const nom = nouveauGroupeNom.trim();
    if (nom) {
      onCreerGroupe(phase.id, nom);
      setNouveauGroupeNom('');
    }
  }

  // Groupes appartenant a cette phase
  const groupesPhase: FormatGroupe[] = graphe.groupes
    .filter((g) => g.phaseId === phase.id)
    .sort((a, b) => a.ordre - b.ordre)
    .map((g) => ({
      ...g,
      liens: graphe.liens.filter((l) => l.groupeSourceId === g.id),
    }));

  // Groupes de la phase suivante (N+1) uniquement : un lien ne peut cibler
  // que la phase immediatement apres, jamais une phase precedente ou une
  // phase plus lointaine.
  const phaseSuivante = graphe.phases.find((p) => p.ordre === phase.ordre + 1);
  const groupesAutresPhases: FormatGroupe[] = phaseSuivante
    ? graphe.groupes
        .filter((g) => g.phaseId === phaseSuivante.id)
        .map((g) => ({ ...g, liens: [] }))
    : [];

  return (
    <div className="flex-none w-72 space-y-3">
      {/* En-tete phase */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
        <span className="text-xs text-slate-500 font-mono">P{phase.ordre}</span>
        {editingNom ? (
          <input
            autoFocus
            value={nomDraft}
            onChange={(e) => setNomDraft(e.target.value)}
            onBlur={handleNomBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNomBlur(); }}
            className="flex-1 bg-slate-700 border border-blue-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingNom(true)}
            className="flex-1 text-left text-white text-sm font-bold hover:text-blue-300"
          >
            {phase.nom}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSupprimerPhase(phase.id)}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-50"
        >
          Suppr.
        </button>
      </div>

      {/* Groupes */}
      <div className="space-y-3">
        {groupesPhase.map((groupe) => (
          <GroupeCard
            key={groupe.id}
            groupe={groupe}
            groupesAutresPhases={groupesAutresPhases}
            onModifierNom={onModifierGroupeNom}
            onModifierFormule={onModifierGroupeFormule}
            onSupprimerGroupe={onSupprimerGroupe}
            onAjouterPlace={onAjouterPlace}
            onSupprimerPlace={onSupprimerPlace}
            onDefinirLien={onDefinirLien}
            onEliminer={onEliminer}
            onReinitialiserLien={onReinitialiserLien}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Ajout groupe */}
      <form onSubmit={handleAjouterGroupe} className="flex gap-2">
        <input
          type="text"
          placeholder="Nom du groupe"
          value={nouveauGroupeNom}
          onChange={(e) => setNouveauGroupeNom(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !nouveauGroupeNom.trim()}
          className="text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-2 py-1 rounded transition"
        >
          +
        </button>
      </form>
    </div>
  );
}
