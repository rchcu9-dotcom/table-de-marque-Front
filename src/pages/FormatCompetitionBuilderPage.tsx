import { useSearchParams } from 'react-router-dom';
import { useInscriptionSession } from '../hooks/useInscriptionSession';
import { useEditionEnPreparation } from '../hooks/useEditionEnPreparation';
import {
  useFormatGraphe,
  useCreerPhase,
  useModifierPhase,
  useSupprimerPhase,
  useCreerGroupe,
  useModifierGroupe,
  useSupprimerGroupe,
  useAjouterPlaceAlias,
  useSupprimerPlace,
  useDefinirLien,
  useMarquerElimine,
  useReinitialiserLien,
  useGenererPreset,
} from '../hooks/useFormatGraphe';
import FormatGrapheCanvas from '../components/format/FormatGrapheCanvas';
import Spinner from '../components/ds/Spinner';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import {
  ACCUEIL_CRUMB,
  ADMIN_CRUMB,
  PARAMETRES_SPORTIFS_CRUMB,
} from '../components/navigation/breadcrumbItems';
import type { GenererPresetPayload } from '../api/formatGraphe';

export default function FormatCompetitionBuilderPage() {
  const { role, token, edition, isLoading: sessionLoading } = useInscriptionSession();
  const { data: editionEnPreparation } = useEditionEnPreparation(token);
  const [searchParams] = useSearchParams();
  // ?edition=demarree : même convention que ParametresSportifsPage — consultation en
  // lecture seule de l'édition démarrée, atteinte depuis le lien "Constructeur graphique"
  // de FormatCompetitionForm quand ParametresSportifsPage est lui-même en lecture seule.
  const consultationEditionDemarree = searchParams.get('edition') === 'demarree';
  const readOnly = consultationEditionDemarree;
  const editionId = consultationEditionDemarree
    ? edition?.id
    : (editionEnPreparation?.id ?? edition?.id);

  const {
    data: graphe,
    isLoading: grapheLoading,
    isError: grapheError,
    refetch,
  } = useFormatGraphe(editionId, token);

  const mutationOpts = { editionId: editionId ?? 0, token: token ?? '' };
  const creerPhase = useCreerPhase(mutationOpts.editionId, mutationOpts.token);
  const modifierPhase = useModifierPhase(mutationOpts.editionId, mutationOpts.token);
  const supprimerPhase = useSupprimerPhase(mutationOpts.editionId, mutationOpts.token);
  const creerGroupe = useCreerGroupe(mutationOpts.editionId, mutationOpts.token);
  const modifierGroupe = useModifierGroupe(mutationOpts.editionId, mutationOpts.token);
  const supprimerGroupe = useSupprimerGroupe(mutationOpts.editionId, mutationOpts.token);
  const ajouterPlace = useAjouterPlaceAlias(mutationOpts.editionId, mutationOpts.token);
  const supprimerPlace = useSupprimerPlace(mutationOpts.editionId, mutationOpts.token);
  const definirLien = useDefinirLien(mutationOpts.editionId, mutationOpts.token);
  const marquerElimine = useMarquerElimine(mutationOpts.editionId, mutationOpts.token);
  const reinitialiserLien = useReinitialiserLien(mutationOpts.editionId, mutationOpts.token);
  const genererPreset = useGenererPreset(mutationOpts.editionId, mutationOpts.token);

  const isLoading =
    creerPhase.isPending ||
    modifierPhase.isPending ||
    supprimerPhase.isPending ||
    creerGroupe.isPending ||
    modifierGroupe.isPending ||
    supprimerGroupe.isPending ||
    ajouterPlace.isPending ||
    supprimerPlace.isPending ||
    definirLien.isPending ||
    marquerElimine.isPending ||
    reinitialiserLien.isPending ||
    genererPreset.isPending;

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (role !== 'ORGANISATEUR') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-slate-400 text-sm text-center">
        Reserve a l'organisateur.
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs
        items={[
          ACCUEIL_CRUMB,
          ADMIN_CRUMB,
          PARAMETRES_SPORTIFS_CRUMB,
          { label: 'Format de competition' },
        ]}
      />
      <h1 className="text-slate-100 text-xl font-bold">
        Constructeur de format de competition
      </h1>

      {readOnly && (
        <div className="bg-blue-950/40 border border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-300">
          Consultation en lecture seule de l'édition démarrée — référence pour construire
          la nouvelle édition.
        </div>
      )}

      {grapheError ? (
        <div className="flex flex-col items-start gap-3 text-sm">
          <p className="text-red-400">Impossible de charger le graphe de competition.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          >
            Reessayer
          </button>
        </div>
      ) : grapheLoading || !graphe ? (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement…</span>
        </div>
      ) : (
        // Lecture seule : gel CSS de tout le canevas plutôt que de propager readOnly à
        // travers FormatGrapheCanvas/PhaseColumn (arbre profond, décision Arch — cf.
        // track.md) — un canevas figé (pointer-events-none) satisfait "consulter comme
        // référence" sans réécrire la logique interactive de tous les niveaux imbriqués.
        <div
          className={readOnly ? 'pointer-events-none opacity-75 select-none' : undefined}
          aria-disabled={readOnly || undefined}
        >
          <FormatGrapheCanvas
            graphe={graphe}
            isLoading={isLoading}
            onCreerPhase={(nom) =>
              creerPhase.mutate({ nom, ordre: graphe.phases.length + 1 })
            }
            onModifierPhaseNom={(phaseId, nom) =>
              modifierPhase.mutate({ phaseId, payload: { nom } })
            }
            onSupprimerPhase={(phaseId) => supprimerPhase.mutate(phaseId)}
            onCreerGroupe={(phaseId, nom) =>
              creerGroupe.mutate({ phaseId, payload: { nom } })
            }
            onModifierGroupeNom={(groupeId, nom) =>
              modifierGroupe.mutate({ groupeId, payload: { nom } })
            }
            onModifierGroupeFormule={(groupeId, formule) =>
              modifierGroupe.mutate({ groupeId, payload: { formule } })
            }
            onSupprimerGroupe={(groupeId) => supprimerGroupe.mutate(groupeId)}
            onAjouterPlace={(groupeId) => {
              const label = window.prompt('Nom du participant (ex : Equipe A)');
              if (label) {
                ajouterPlace.mutate({ groupeId, aliasLabel: label });
              }
            }}
            onSupprimerPlace={(placeId) => supprimerPlace.mutate(placeId)}
            onDefinirLien={(groupeSourceId, rangSource, groupeCibleId) =>
              definirLien.mutate({ groupeSourceId, rangSource, groupeCibleId })
            }
            onEliminer={(groupeSourceId, rangSource) =>
              marquerElimine.mutate({ groupeSourceId, rangSource })
            }
            onReinitialiserLien={(groupeSourceId, rangSource) =>
              reinitialiserLien.mutate({ groupeSourceId, rangSource })
            }
            onGenererPreset={(payload: GenererPresetPayload) =>
              genererPreset.mutate(payload)
            }
          />
        </div>
      )}
    </div>
  );
}
