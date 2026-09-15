import { useState } from 'react';
import type { FormatGraphe, FormatGroupeFormule } from '../../api/formatGraphe';
import PhaseColumn from './PhaseColumn';
import PresetPicker from './PresetPicker';
import type { GenererPresetPayload } from '../../api/formatGraphe';

type Props = {
  graphe: FormatGraphe;
  onModifierPhaseNom: (phaseId: number, nom: string) => void;
  onSupprimerPhase: (phaseId: number) => void;
  onCreerPhase: (nom: string) => void;
  onCreerGroupe: (phaseId: number, nom: string) => void;
  onModifierGroupeNom: (groupeId: number, nom: string) => void;
  onModifierGroupeFormule?: (groupeId: number, formule: FormatGroupeFormule) => void;
  onSupprimerGroupe: (groupeId: number) => void;
  onAjouterPlace: (groupeId: number) => void;
  onSupprimerPlace: (placeId: number) => void;
  onDefinirLien: (groupeSourceId: number, rangSource: number, groupeCibleId: number) => void;
  onEliminer: (groupeSourceId: number, rangSource: number) => void;
  onReinitialiserLien: (groupeSourceId: number, rangSource: number) => void;
  onGenererPreset: (payload: GenererPresetPayload) => void;
  isLoading: boolean;
};

export default function FormatGrapheCanvas({
  graphe,
  onModifierPhaseNom,
  onSupprimerPhase,
  onCreerPhase,
  onCreerGroupe,
  onModifierGroupeNom,
  onModifierGroupeFormule = () => {},
  onSupprimerGroupe,
  onAjouterPlace,
  onSupprimerPlace,
  onDefinirLien,
  onEliminer,
  onReinitialiserLien,
  onGenererPreset,
  isLoading,
}: Props) {
  const [nouvellePhaseNom, setNouvellePhaseNom] = useState('');
  const [showPreset, setShowPreset] = useState(false);

  const phasesTriees = [...graphe.phases].sort((a, b) => a.ordre - b.ordre);

  function handleAjouterPhase(e: React.FormEvent) {
    e.preventDefault();
    const nom = nouvellePhaseNom.trim();
    if (nom) {
      onCreerPhase(nom);
      setNouvellePhaseNom('');
    }
  }

  return (
    <div className="space-y-6">
      {/* Bandeau etat graphe */}
      <div className="flex items-center gap-4 flex-wrap">
        {graphe.modifieManuellement && (
          <span className="text-xs bg-amber-900/40 border border-amber-700 text-amber-300 px-2 py-0.5 rounded">
            Modifie manuellement
          </span>
        )}
        {graphe.genereDepuisPreset && (
          <span className="text-xs text-slate-500">
            Preset : {graphe.genereDepuisPreset}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowPreset((s) => !s)}
          className="text-xs text-blue-400 hover:text-blue-300 ml-auto"
        >
          {showPreset ? 'Masquer le preset' : 'Generer depuis un preset'}
        </button>
      </div>

      {/* Panneau preset */}
      {showPreset && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <PresetPicker
            modifieManuellement={graphe.modifieManuellement}
            onGenerer={(payload) => {
              onGenererPreset(payload);
              setShowPreset(false);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Canevas horizontal des phases */}
      {phasesTriees.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          Aucune phase definie. Creez une phase ou generez un preset.
        </p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {phasesTriees.map((phase) => (
              <PhaseColumn
                key={phase.id}
                phase={phase}
                graphe={graphe}
                onModifierPhaseNom={onModifierPhaseNom}
                onSupprimerPhase={onSupprimerPhase}
                onCreerGroupe={onCreerGroupe}
                onModifierGroupeNom={onModifierGroupeNom}
                onModifierGroupeFormule={onModifierGroupeFormule}
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
        </div>
      )}

      {/* Ajout d'une phase */}
      <form onSubmit={handleAjouterPhase} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Nom de la nouvelle phase (ex : Brassage)"
          value={nouvellePhaseNom}
          onChange={(e) => setNouvellePhaseNom(e.target.value)}
          className="flex-1 max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !nouvellePhaseNom.trim()}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          + Phase
        </button>
      </form>
    </div>
  );
}
