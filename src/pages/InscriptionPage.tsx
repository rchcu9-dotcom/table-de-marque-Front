import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchEditionCourante,
  fetchEquipesReferentiel,
  createEquipeDemande,
  fetchProfilInscription,
  fetchMaCandidature,
  soumettreCanditature,
  fetchToutesCandidatures,
  accepterCandidature,
  mettreListeAttente,
  refuserCandidature,
  validerPaiement,
} from '../api/inscription';
import type {
  Edition,
  EquipeRef,
  ProfilInscription,
  MaCandidature,
  CandidatureOrganisateur,
  StatutInscription,
} from '../api/types/inscription.types';

// ─── Composants utilitaires ────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-100 border border-red-300 text-red-800 rounded p-3 my-2 text-sm">
      {message}
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<
  StatutInscription,
  { label: string; className: string }
> = {
  CANDIDATE: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  LISTE_ATTENTE: { label: "Liste d'attente", className: 'bg-orange-100 text-orange-800 border-orange-200' },
  RESERVEE: { label: 'Réservée', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  PAIEMENT_ATTENDU: { label: 'Paiement attendu', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  VALIDEE: { label: 'Validée', className: 'bg-green-100 text-green-800 border-green-200' },
  DOSSIER_EN_COURS: { label: 'Dossier en cours', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  DOSSIER_COMPLET: { label: 'Dossier complet', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REFUSEE: { label: 'Refusée', className: 'bg-red-100 text-red-800 border-red-200' },
};

function StatutBadge({ statut }: { statut: StatutInscription }) {
  const config = STATUT_CONFIG[statut] ?? { label: statut, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ─── Modal Ajouter une équipe ─────────────────────────────────────────────

interface AddEquipeModalProps {
  token: string;
  onClose: () => void;
  onCreated: (equipe: EquipeRef) => void;
}

function AddEquipeModal({ token, onClose, onCreated }: AddEquipeModalProps) {
  const [nom, setNom] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const logoUrl = logoFile ? URL.createObjectURL(logoFile) : undefined;
      const equipe = await createEquipeDemande({ nom: nom.trim(), logoUrl }, token);
      onCreated(equipe);
      onClose();
    } catch {
      setError('Erreur lors de la création. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Ajouter une équipe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="equipe-nom">
              Nom de l'équipe
            </label>
            <input
              id="equipe-nom"
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ex: Les Sharks de San Jose"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="equipe-logo">
              Blason (optionnel)
            </label>
            <input
              id="equipe-logo"
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              disabled={submitting}
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !nom.trim()}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Soumettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Valider paiement ───────────────────────────────────────────────

interface ValiderPaiementModalProps {
  candidatureId: number;
  equipeNom: string;
  token: string;
  onClose: () => void;
  onValidated: () => void;
}

function ValiderPaiementModal({
  candidatureId,
  equipeNom,
  token,
  onClose,
  onValidated,
}: ValiderPaiementModalProps) {
  const [dateVirement, setDateVirement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateVirement) {
      setError('La date de virement est obligatoire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await validerPaiement(candidatureId, dateVirement, token);
      onValidated();
      onClose();
    } catch {
      setError('Erreur lors de la validation. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1">Valider le paiement</h2>
        <p className="text-sm text-gray-500 mb-4">{equipeNom}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="date-virement">
              Date du virement
            </label>
            <input
              id="date-virement"
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={dateVirement}
              onChange={(e) => setDateVirement(e.target.value)}
              disabled={submitting}
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !dateVirement}
              className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Validation...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dropdown équipe searchable ───────────────────────────────────────────

interface EquipeDropdownProps {
  equipes: EquipeRef[];
  selected: EquipeRef | null;
  onSelect: (equipe: EquipeRef) => void;
}

function EquipeDropdown({ equipes, selected, onSelect }: EquipeDropdownProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actives = equipes.filter((e) => e.active);
  const filtered = actives.filter((e) =>
    e.nom.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClick(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border border-gray-300 rounded px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {selected ? (
          <>
            {selected.logoUrl && (
              <img src={selected.logoUrl} alt="" className="w-6 h-6 object-contain rounded-full" />
            )}
            <span className="flex-1 text-left">{selected.nom}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400">Choisir une équipe...</span>
        )}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
            <input
              type="text"
              autoFocus
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Aucune équipe trouvée.</div>
          )}
          {filtered.map((equipe) => (
            <button
              key={equipe.id}
              type="button"
              onClick={() => {
                onSelect(equipe);
                setOpen(false);
                setSearch('');
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 text-left ${
                selected?.id === equipe.id ? 'bg-blue-50 font-medium' : ''
              }`}
            >
              {equipe.logoUrl && (
                <img src={equipe.logoUrl} alt="" className="w-6 h-6 object-contain rounded-full" />
              )}
              {equipe.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Header / Footer ──────────────────────────────────────────────────────

interface HeaderProps {
  edition: Edition | null;
  user: import('firebase/auth').User | null;
  onSignOut: () => void;
}

function Header({ edition, user, onSignOut }: HeaderProps) {
  if (!edition) return null;
  return (
    <div className="flex items-center gap-3 mb-4">
      {edition.imageUrl && (
        <img src={edition.imageUrl} alt="Tournoi" className="w-12 h-12 object-contain" />
      )}
      <div>
        <h1 className="text-xl font-bold leading-tight">{edition.nom}</h1>
        <p className="text-sm text-gray-500">
          {edition.categorie} · {edition.etape}
        </p>
      </div>
      {user && (
        <button
          onClick={onSignOut}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Déconnexion
        </button>
      )}
    </div>
  );
}

interface FooterProps {
  edition: Edition | null;
}

function Footer({ edition }: FooterProps) {
  if (!edition) return null;
  return (
    <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col gap-2 text-sm text-gray-600">
      <p className="font-medium">Contact</p>
      <div className="flex gap-3 flex-wrap">
        {edition.contactEmail && (
          <a
            href={`mailto:${edition.contactEmail}`}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <span>✉</span> Écrire un mail
          </a>
        )}
        {edition.contactPhone && (
          <a
            href={`tel:${edition.contactPhone}`}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <span>✆</span> Appeler
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Vue Organisateur ─────────────────────────────────────────────────────

interface VueOrganisateurProps {
  edition: Edition | null;
  token: string;
}

function VueOrganisateur({ edition, token }: VueOrganisateurProps) {
  const [candidatures, setCandidatures] = useState<CandidatureOrganisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paiementModal, setPaiementModal] = useState<{
    id: number;
    equipeNom: string;
  } | null>(null);

  const loadCandidatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchToutesCandidatures(token);
      setCandidatures(data);
    } catch {
      setError('Impossible de charger les candidatures.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCandidatures();
  }, [loadCandidatures]);

  async function handleAction(
    action: () => Promise<unknown>,
  ) {
    setActionError(null);
    try {
      await action();
      await loadCandidatures();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Erreur lors de l\'action. Réessaie.';
      setActionError(msg);
    }
  }

  const STATUTS_ACTIFS: StatutInscription[] = [
    'RESERVEE',
    'PAIEMENT_ATTENDU',
    'VALIDEE',
    'DOSSIER_EN_COURS',
    'DOSSIER_COMPLET',
  ];
  const nbReservees = candidatures.filter((c) =>
    STATUTS_ACTIFS.includes(c.statut),
  ).length;
  const maxPlaces = edition?.nbPlacesMax ?? 16;

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-4">
      {/* Compteur */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <span className="text-sm font-medium text-blue-800">Équipes réservées</span>
        <span
          className={`text-lg font-bold ${nbReservees >= maxPlaces ? 'text-red-600' : 'text-blue-700'}`}
        >
          {nbReservees} / {maxPlaces}
        </span>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {candidatures.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Aucune candidature reçue.</p>
      ) : (
        <div className="space-y-3">
          {candidatures.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {c.equipeLogoUrl && (
                  <img
                    src={c.equipeLogoUrl}
                    alt=""
                    className="w-10 h-10 object-contain rounded-full border border-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{c.equipeNom}</span>
                    <StatutBadge statut={c.statut} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {c.utilisateurDisplayName
                      ? `${c.utilisateurDisplayName} — `
                      : ''}
                    {c.utilisateurEmail}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Soumis le {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {c.statut === 'CANDIDATE' && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() =>
                      void handleAction(() => accepterCandidature(c.id, token))
                    }
                    className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() =>
                      void handleAction(() => mettreListeAttente(c.id, token))
                    }
                    className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600"
                  >
                    Liste d'attente
                  </button>
                  <button
                    onClick={() =>
                      void handleAction(() => refuserCandidature(c.id, token))
                    }
                    className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                  >
                    Refuser
                  </button>
                </div>
              )}

              {c.statut === 'PAIEMENT_ATTENDU' && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      setPaiementModal({ id: c.id, equipeNom: c.equipeNom })
                    }
                    className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
                  >
                    Valider paiement
                  </button>
                </div>
              )}

              {c.statut === 'LISTE_ATTENTE' && (
                <div className="flex gap-2 mt-3">
                  {nbReservees < maxPlaces && (
                    <button
                      onClick={() =>
                        void handleAction(() => accepterCandidature(c.id, token))
                      }
                      className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                    >
                      Promouvoir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {paiementModal && (
        <ValiderPaiementModal
          candidatureId={paiementModal.id}
          equipeNom={paiementModal.equipeNom}
          token={token}
          onClose={() => setPaiementModal(null)}
          onValidated={() => void loadCandidatures()}
        />
      )}
    </div>
  );
}

// ─── Vue Responsable ──────────────────────────────────────────────────────

interface VueResponsableProps {
  edition: Edition | null;
  equipes: EquipeRef[];
  token: string;
  onEquipeCreated: (equipe: EquipeRef) => void;
}

function VueResponsable({
  edition,
  equipes,
  token,
  onEquipeCreated,
}: VueResponsableProps) {
  const [candidature, setCandidature] = useState<MaCandidature>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipe, setSelectedEquipe] = useState<EquipeRef | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMaCandidature(token)
      .then((data) => {
        if (!cancelled) setCandidature(data);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger votre candidature.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSoumettre() {
    if (!selectedEquipe) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await soumettreCanditature(selectedEquipe.id, token);
      setCandidature({
        id: result.id,
        equipeNom: result.equipeNom,
        equipeLogoUrl: selectedEquipe.logoUrl ?? null,
        statut: result.statut as MaCandidature extends null ? never : NonNullable<MaCandidature>['statut'],
        createdAt: result.createdAt,
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : "Erreur lors de la soumission. Réessaie.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  // Candidature existante → afficher le tableau de bord
  if (candidature) {
    return (
      <div className="space-y-6">
        {/* Récapitulatif candidature */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            {candidature.equipeLogoUrl && (
              <img
                src={candidature.equipeLogoUrl}
                alt=""
                className="w-12 h-12 object-contain rounded-full border border-gray-100"
              />
            )}
            <div>
              <p className="font-semibold text-gray-900">{candidature.equipeNom}</p>
              <p className="text-xs text-gray-500">
                Soumis le {new Date(candidature.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="ml-auto">
              <StatutBadge statut={candidature.statut} />
            </div>
          </div>

          {/* Message selon statut */}
          {candidature.statut === 'CANDIDATE' && (
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {edition?.msgDemandeSoumise ?? 'Ta demande a bien été soumise. En attente de validation.'}
            </p>
          )}
          {candidature.statut === 'LISTE_ATTENTE' && (
            <p className="text-sm text-orange-700 whitespace-pre-line">
              {edition?.msgListeAttente ?? "Tu es sur liste d'attente."}
            </p>
          )}
          {(candidature.statut === 'RESERVEE' || candidature.statut === 'PAIEMENT_ATTENDU') && (
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 whitespace-pre-line">
                {edition?.msgPaiementAttendu ?? 'Paiement attendu.'}
              </p>
              {edition?.msgChequeInfo1 && (
                <p className="text-gray-600">{edition.msgChequeInfo1}</p>
              )}
              {edition?.msgRibUrl && (
                <a
                  href={edition.msgRibUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Voir le RIB
                </a>
              )}
            </div>
          )}
          {candidature.statut === 'VALIDEE' && (
            <div className="space-y-3">
              <p className="text-sm text-green-700 whitespace-pre-line">
                {edition?.msgInscriptionConfirmee ?? 'Inscription confirmée !'}
              </p>
              <button className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 text-sm">
                Renseigner mes joueurs
              </button>
            </div>
          )}
          {candidature.statut === 'REFUSEE' && (
            <p className="text-sm text-red-700">
              Ta candidature a été refusée. Contacte l'organisateur pour plus d'informations.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Pas de candidature → formulaire de soumission (3 étapes)
  return (
    <div className="space-y-6">
      {edition?.msgBienvenue && (
        <p className="text-gray-700 whitespace-pre-line">{edition.msgBienvenue}</p>
      )}

      <p className="text-center font-semibold text-gray-800">
        Pour inscrire ton équipe, suis ces 3 étapes !
      </p>

      {/* Étape 1 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
            1
          </span>
          <h2 className="font-semibold text-gray-800">Sélectionne ton équipe favorite</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          {edition?.msgSelectionEquipe && (
            <p className="text-sm text-gray-600 whitespace-pre-line">{edition.msgSelectionEquipe}</p>
          )}
          <p className="text-xs text-gray-400 italic">
            Note : une fois l'inscription lancée tu ne pourras plus changer d'équipe.
          </p>
          <EquipeDropdown
            equipes={equipes}
            selected={selectedEquipe}
            onSelect={setSelectedEquipe}
          />
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Ton équipe n'est pas présente ? Ajoute la !
          </button>
        </div>
      </section>

      {/* Étape 2 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
            2
          </span>
          <h2 className="font-semibold text-gray-800">Lance son inscription</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          {edition?.msgLancerDemande && (
            <p className="text-sm text-gray-600 whitespace-pre-line">{edition.msgLancerDemande}</p>
          )}
          {submitError && <ErrorBanner message={submitError} />}
          {selectedEquipe ? (
            <button
              onClick={() => void handleSoumettre()}
              disabled={submitting}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Lancer la demande'}
            </button>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Sélectionne d'abord ton équipe à l'étape 1.
            </p>
          )}
        </div>
      </section>

      {/* Étape 3 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
            3
          </span>
          <h2 className="font-semibold text-gray-800">Valide sa participation</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-400 italic">
            Cette étape sera disponible une fois l'inscription validée.
          </p>
        </div>
      </section>

      {showAddModal && (
        <AddEquipeModal
          token={token}
          onClose={() => setShowAddModal(false)}
          onCreated={(equipe) => {
            onEquipeCreated(equipe);
            setSelectedEquipe(equipe);
          }}
        />
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function InscriptionPage() {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } = useAuth();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [equipes, setEquipes] = useState<EquipeRef[]>([]);
  const [profil, setProfil] = useState<ProfilInscription | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pseudoInput, setPseudoInput] = useState('');

  // Charger édition + équipes au montage
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchEditionCourante(), fetchEquipesReferentiel()])
      .then(([ed, eq]) => {
        if (cancelled) return;
        setEdition(ed);
        setEquipes(eq);
      })
      .catch(() => {
        if (!cancelled) setPageError('Impossible de charger les données. Réessaie plus tard.');
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Charger le profil + token quand l'utilisateur est authentifié
  useEffect(() => {
    if (!user) {
      setProfil(null);
      setToken(null);
      return;
    }
    let cancelled = false;
    user.getIdToken().then((t) => {
      if (cancelled) return;
      setToken(t);
      fetchProfilInscription(t)
        .then((p) => {
          if (!cancelled) setProfil(p);
        })
        .catch(() => {
          // Profil non trouvé = nouvel utilisateur, on ignore
        });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Cas : Firebase non configuré ────────────────────────────────────────
  if (!configured) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800 font-medium">Module inscriptions non disponible</p>
          <p className="text-yellow-700 text-sm mt-2">
            Firebase n'est pas encore configuré pour cet environnement.
          </p>
        </div>
      </div>
    );
  }

  // ── Chargement ───────────────────────────────────────────────────────────
  if (authLoading || pageLoading) {
    return <Spinner />;
  }

  if (pageError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <ErrorBanner message={pageError} />
      </div>
    );
  }

  const handleSignOut = () => void signOut();

  // ── Cas : Non authentifié ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Header edition={edition} user={user} onSignOut={handleSignOut} />
        {edition?.msgBienvenue && (
          <p className="text-gray-700 mb-6 whitespace-pre-line">{edition.msgBienvenue}</p>
        )}
        <div className="flex flex-col items-center gap-4 py-6">
          <button
            onClick={() => void signInWithGoogle()}
            className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition text-gray-700 font-medium"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Se connecter avec Google
          </button>
        </div>
        <Footer edition={edition} />
      </div>
    );
  }

  // ── Cas : Authentifié mais sans pseudo (faisons connaissance) ─────────────
  if (user && !profil?.pseudo) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Header edition={edition} user={user} onSignOut={handleSignOut} />
        {edition?.msgFaisonsConnaissance && (
          <p className="text-gray-700 mb-4 whitespace-pre-line">{edition.msgFaisonsConnaissance}</p>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Faisons connaissance !</h2>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="pseudo-input">
              Ton pseudo
            </label>
            <input
              id="pseudo-input"
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ex: MikeTrout99"
              value={pseudoInput}
              onChange={(e) => setPseudoInput(e.target.value)}
            />
          </div>
          <button
            disabled={!pseudoInput.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50 hover:bg-blue-700"
            onClick={() => {
              // TODO: appel API pour sauvegarder le pseudo
              setProfil((prev) =>
                prev
                  ? { ...prev, pseudo: pseudoInput.trim() }
                  : { id: 0, pseudo: pseudoInput.trim(), role: 'RESPONSABLE_EQUIPE' },
              );
            }}
          >
            Valider
          </button>
        </div>
        <Footer edition={edition} />
      </div>
    );
  }

  // ── Cas : Organisateur ────────────────────────────────────────────────────
  if (profil?.role === 'ORGANISATEUR' && token) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header edition={edition} user={user} onSignOut={handleSignOut} />
        <h2 className="font-bold text-gray-800 text-lg mb-4">Gestion des candidatures</h2>
        <VueOrganisateur edition={edition} token={token} />
        <Footer edition={edition} />
      </div>
    );
  }

  // ── Cas : Responsable d'équipe ────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Header edition={edition} user={user} onSignOut={handleSignOut} />
      {token && (
        <VueResponsable
          edition={edition}
          equipes={equipes}
          token={token}
          onEquipeCreated={(equipe) => setEquipes((prev) => [...prev, equipe])}
        />
      )}
      <Footer edition={edition} />
    </div>
  );
}
