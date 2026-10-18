import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Edition } from '../../api/types/inscription.types';
import { fetchToutesCandidatures } from '../../api/inscription';
import { useParametresSportifs } from '../../hooks/useParametresSportifs';
import {
  useChangerEtapeEdition,
  estConflitEtat,
  MESSAGE_CONFLIT_ETAT,
} from '../../hooks/useChangerEtapeEdition';
import {
  ETAPES_PILOTAGE,
  actionsPourEtape,
  etapePilotageDe,
  type ActionPilotage,
} from '../../utils/editionTransitions';
import {
  etatCandidatures,
  parametresInscriptionRemplis,
  parametresSportifsRemplis,
  type EtatCandidatures,
} from '../../utils/etatDesLieux';
import { MESSAGE_RETOUR_AVEC_CANDIDATURES } from '../../utils/editionRegles';
import ConfirmModal from './ConfirmModal';
import EtapeEditionBadge from './EtapeEditionBadge';
import NouvelleSaisonPanel from './NouvelleSaisonPanel';

const CANDIDATURES_PILOTAGE_QUERY_KEY = ['inscription', 'candidatures', 'pilotage'] as const;

function Ligne({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      {ok !== undefined && (
        <span aria-hidden="true" className={ok ? 'text-emerald-400' : 'text-amber-400'}>
          {ok ? '✓' : '!'}
        </span>
      )}
      <span>{children}</span>
    </li>
  );
}

function EtatPreparation({ edition, token }: { edition: Edition; token: string }) {
  const { data: parametres, isError } = useParametresSportifs(edition.id, token);
  const inscriptionOk = parametresInscriptionRemplis(edition);
  const sportifsOk = parametres ? parametresSportifsRemplis(parametres) : false;
  return (
    <ul aria-label="État des lieux" className="flex flex-col gap-1 text-xs text-slate-300">
      <Ligne ok={inscriptionOk}>
        Paramètres d'inscription {inscriptionOk ? 'remplis' : 'à compléter'}
      </Ligne>
      {parametres || isError ? (
        <Ligne ok={sportifsOk}>
          Paramètres sportifs {sportifsOk ? 'remplis' : 'à compléter'}
        </Ligne>
      ) : null}
    </ul>
  );
}

function EtatCandidaturesListe({
  etat,
  edition,
  cloturee,
}: {
  etat: EtatCandidatures;
  edition: Edition;
  cloturee: boolean;
}) {
  return (
    <ul aria-label="État des lieux" className="flex flex-col gap-1 text-xs text-slate-300">
      {cloturee ? (
        <>
          <Ligne ok={etat.dossiersComplets === etat.retenues}>
            Dossiers complets : {etat.dossiersComplets}/{etat.retenues}
          </Ligne>
          <Ligne ok={etat.paiementsAttendus === 0}>
            Paiements en attente : {etat.paiementsAttendus}
          </Ligne>
          <Ligne>
            La formule sportive reste ajustable jusqu'au lancement ·{' '}
            <Link
              to="/admin/parametres-sportifs"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Paramètres sportifs
            </Link>
          </Ligne>
        </>
      ) : (
        <>
          <Ligne>Candidatures : {etat.candidatures}</Ligne>
          <Ligne>
            Équipes retenues : {etat.retenues}/{edition.nbPlacesMax}
          </Ligne>
          <Ligne>Paiements attendus : {etat.paiementsAttendus}</Ligne>
        </>
      )}
    </ul>
  );
}

function MessageCloture() {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1">
      <li>Plus aucune nouvelle équipe ne pourra candidater.</li>
      <li>
        Les candidatures déjà déposées restent traitables par l'organisateur, et les référents
        ayant une candidature peuvent continuer à renseigner leur dossier.
      </li>
      <li>
        Les référents qui ont sélectionné une équipe sans avoir lancé leur demande ne pourront
        plus la soumettre.
      </li>
      <li>Action réversible tant que le tournoi n'est pas lancé.</li>
    </ul>
  );
}

function MessageLancement({
  dossiersIncomplets,
  compris,
  onCompris,
}: {
  dossiersIncomplets: string[] | null;
  compris: boolean;
  onCompris: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p>
        Cette action est irréversible : tous les dossiers d'inscription seront définitivement
        gelés (plus aucune modification possible).
      </p>
      {dossiersIncomplets === null ? null : dossiersIncomplets.length === 0 ? (
        <p className="text-emerald-400">Tous les dossiers sont complets.</p>
      ) : (
        <div>
          <p className="text-amber-400">
            Dossiers incomplets ({dossiersIncomplets.length}) :
          </p>
          <ul aria-label="Dossiers incomplets" className="list-disc pl-5">
            {dossiersIncomplets.map((nom) => (
              <li key={nom}>{nom}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={compris} onChange={(e) => onCompris(e.target.checked)} />
        Je comprends que cette action est irréversible.
      </label>
    </div>
  );
}

function EtapeCourante({ edition, token }: { edition: Edition; token: string }) {
  const phase = etapePilotageDe(edition.etape);
  const avecCandidatures = phase === 'INSCRIPTIONS_OUVERTES' || phase === 'CLOTUREE';
  const { data: candidatures } = useQuery({
    queryKey: CANDIDATURES_PILOTAGE_QUERY_KEY,
    queryFn: () => fetchToutesCandidatures(token),
    enabled: avecCandidatures && !!token,
    staleTime: 30_000,
  });
  const etat = candidatures ? etatCandidatures(candidatures) : null;

  const changer = useChangerEtapeEdition(edition.id, token);
  const [aConfirmer, setAConfirmer] = useState<ActionPilotage | null>(null);
  const [compris, setCompris] = useState(false);
  const actions = actionsPourEtape(edition.etape);

  const lancer = (a: ActionPilotage) => {
    changer.mutate(a.action, { onSettled: () => setAConfirmer(null) });
  };

  const declencher = (a: ActionPilotage) => {
    if (changer.isPending) return;
    changer.reset();
    if (a.confirmation === 'aucune') {
      lancer(a);
      return;
    }
    setCompris(false);
    setAConfirmer(a);
  };

  // Le retour en Préparation n'est accepté par le back que sans candidature
  // (toutes candidatures confondues) : bouton désactivé, motif affiché.
  const retourBloque = etat === null || etat.total > 0;

  const erreur = changer.error
    ? estConflitEtat(changer.error)
      ? changer.variables === 'revenir'
        ? changer.error.message
        : MESSAGE_CONFLIT_ETAT
      : changer.variables === 'demarrer'
        ? 'Impossible de lancer le tournoi.'
        : "Impossible de changer d'étape."
    : null;

  return (
    <div className="flex flex-col gap-3 pt-1">
      <p className="text-xs text-slate-400">
        {ETAPES_PILOTAGE.find((e) => e.cle === phase)!.description}
      </p>

      {phase === 'PREPARATION' && <EtatPreparation edition={edition} token={token} />}
      {avecCandidatures && etat && (
        <EtatCandidaturesListe etat={etat} edition={edition} cloturee={phase === 'CLOTUREE'} />
      )}

      {phase === 'TOURNOI_DEMARRE' ? (
        <NouvelleSaisonPanel token={token} editionActiveId={edition.id} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {actions.map((a) =>
            a.principale ? (
              <button
                key={a.action}
                type="button"
                onClick={() => declencher(a)}
                disabled={changer.isPending}
                className={`${
                  a.confirmation === 'forte'
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                } disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 transition`}
              >
                {a.libelle}
              </button>
            ) : (
              <span key={a.action} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => declencher(a)}
                  disabled={changer.isPending || (a.action === 'revenir' && retourBloque)}
                  aria-describedby={
                    a.action === 'revenir' && retourBloque ? 'motif-retour-preparation' : undefined
                  }
                  className="text-left text-sm text-slate-300 hover:text-white underline disabled:opacity-50 disabled:no-underline"
                >
                  {a.libelle}
                </button>
                {a.action === 'revenir' && etat !== null && etat.total > 0 && (
                  <span id="motif-retour-preparation" className="text-xs text-slate-500">
                    {MESSAGE_RETOUR_AVEC_CANDIDATURES}
                  </span>
                )}
              </span>
            ),
          )}
          {phase === 'PREPARATION' && (
            <>
              <Link to="/admin/parametres-inscription" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
                Paramètres d'inscription
              </Link>
              <Link to="/admin/parametres-sportifs" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
                Paramètres sportifs
              </Link>
            </>
          )}
          {phase === 'INSCRIPTIONS_OUVERTES' && (
            <Link to="/inscription" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
              Gérer les candidatures →
            </Link>
          )}
        </div>
      )}

      {erreur && (
        <p role="alert" className="text-xs text-red-400">
          {erreur}
        </p>
      )}

      {aConfirmer?.action === 'cloturer' && (
        <ConfirmModal
          title="Clôturer les inscriptions ?"
          message={<MessageCloture />}
          confirmingLabel="Clôture…"
          onClose={() => setAConfirmer(null)}
          onConfirm={() => lancer(aConfirmer)}
          submitting={changer.isPending}
        />
      )}
      {aConfirmer?.action === 'ouvrir' && (
        <ConfirmModal
          title="Rouvrir les inscriptions ?"
          message="Les onglets Planning et Équipes disparaîtront temporairement."
          confirmingLabel="Ouverture…"
          onClose={() => setAConfirmer(null)}
          onConfirm={() => lancer(aConfirmer)}
          submitting={changer.isPending}
        />
      )}
      {aConfirmer?.action === 'revenir' && (
        <ConfirmModal
          title="Revenir en préparation ?"
          message="Les équipes ne pourront plus candidater tant que les inscriptions ne sont pas rouvertes."
          confirmingLabel="Retour…"
          onClose={() => setAConfirmer(null)}
          onConfirm={() => lancer(aConfirmer)}
          submitting={changer.isPending}
        />
      )}
      {aConfirmer?.action === 'demarrer' && (
        <ConfirmModal
          title="Lancer le tournoi ?"
          message={
            <MessageLancement
              dossiersIncomplets={etat ? etat.dossiersIncomplets : null}
              compris={compris}
              onCompris={setCompris}
            />
          }
          confirmingLabel="Lancement…"
          onClose={() => setAConfirmer(null)}
          onConfirm={() => lancer(aConfirmer)}
          submitting={changer.isPending}
          confirmDisabled={!compris}
        />
      )}
    </div>
  );
}

function FriseVerticale({ edition, token }: { edition: Edition; token: string }) {
  const indexCourant = ETAPES_PILOTAGE.findIndex((e) => e.cle === etapePilotageDe(edition.etape));
  return (
    <ol aria-label={`Étapes de l'édition ${edition.annee}`} className="flex flex-col">
      {ETAPES_PILOTAGE.map((etape, index) => {
        const statut = index < indexCourant ? 'passee' : index === indexCourant ? 'courante' : 'future';
        return (
          <li
            key={etape.cle}
            aria-current={statut === 'courante' ? 'step' : undefined}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  statut === 'passee'
                    ? 'bg-emerald-700 text-white'
                    : statut === 'courante'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-600'
                }`}
              >
                {statut === 'passee' ? '✓' : null}
              </span>
              {index < ETAPES_PILOTAGE.length - 1 && <span className="w-px flex-1 min-h-3 bg-slate-700" />}
            </div>
            <div className="flex flex-col pb-3 min-w-0 flex-1">
              <span
                className={`text-sm ${
                  statut === 'courante'
                    ? 'font-semibold text-white'
                    : statut === 'passee'
                      ? 'text-slate-400'
                      : 'text-slate-500'
                }`}
              >
                {etape.label}
                {statut === 'passee' && <span className="sr-only"> (terminée)</span>}
                {statut === 'courante' && <span className="sr-only"> (étape en cours)</span>}
              </span>
              {statut === 'courante' && <EtapeCourante edition={edition} token={token} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CarteEdition({
  edition,
  token,
  titre,
  resume,
}: {
  edition: Edition;
  token: string;
  titre: string;
  resume?: boolean;
}) {
  return (
    <section
      aria-label={titre}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-white">{titre}</h3>
        <span className="text-xs text-slate-400">
          {edition.nom} · {edition.categorie}
        </span>
      </div>
      {resume ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Étape :</span>
          <EtapeEditionBadge etape={edition.etape} />
        </div>
      ) : (
        <FriseVerticale edition={edition} token={token} />
      )}
    </section>
  );
}

/**
 * Bloc « Pilotage du tournoi » (docs/specs/backlog-pilotage-du-tournoi-frise-
 * verticale-accueil-admin.md) : seul endroit où l'organisateur change l'étape
 * d'une édition. Avec une édition en préparation, celle-ci est pilotée et
 * l'édition en cours n'affiche plus qu'un résumé.
 */
export default function PilotageTournoi({
  token,
  editionActive,
  editionEnPreparation,
}: {
  token: string;
  editionActive: Edition | null;
  editionEnPreparation: Edition | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        Pilotage du tournoi
      </h2>
      {editionEnPreparation ? (
        <>
          <CarteEdition
            edition={editionEnPreparation}
            token={token}
            titre={`Édition ${editionEnPreparation.annee} — en préparation`}
          />
          {editionActive && (
            <CarteEdition
              edition={editionActive}
              token={token}
              titre={`Édition ${editionActive.annee} — en cours`}
              resume
            />
          )}
        </>
      ) : editionActive ? (
        <CarteEdition edition={editionActive} token={token} titre={`Édition ${editionActive.annee}`} />
      ) : (
        <p className="text-sm text-slate-400">Chargement de l'édition…</p>
      )}
    </div>
  );
}
