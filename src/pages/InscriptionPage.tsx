import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchEditionCourante,
  fetchEquipesReferentiel,
  createEquipeDemande,
  fetchProfilInscription,
} from '../api/inscription';
import type { Edition, EquipeRef, ProfilInscription } from '../api/types/inscription.types';

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
      // logoUrl: pour l'instant on passe l'URL objet local si fichier sélectionné
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

// ─── Page principale ──────────────────────────────────────────────────────

export default function InscriptionPage() {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } = useAuth();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [equipes, setEquipes] = useState<EquipeRef[]>([]);
  const [profil, setProfil] = useState<ProfilInscription | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [selectedEquipe, setSelectedEquipe] = useState<EquipeRef | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Charger le profil quand l'utilisateur est authentifié
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfil(null);
      return;
    }
    let cancelled = false;
    user.getIdToken().then((token) => {
      if (cancelled) return;
      fetchProfilInscription(token)
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
              // Pour l'instant on met à jour l'état local
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

  // ── Cas : Authentifié avec pseudo — 3 étapes ──────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Header edition={edition} user={user} onSignOut={handleSignOut} />

      {edition?.msgBienvenue && (
        <p className="text-gray-700 mb-6 whitespace-pre-line">{edition.msgBienvenue}</p>
      )}

      <p className="text-center font-semibold text-gray-800 mb-6">
        Pour inscrire ton équipe, suis ces 3 étapes !
      </p>

      {/* ── Étape 1 ── */}
      <section className="mb-6">
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

      {/* ── Étape 2 ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
            2
          </span>
          <h2 className="font-semibold text-gray-800">Lance son inscription</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <Etape2
            edition={edition}
            equipeSelectionnee={selectedEquipe}
            user={user}
          />
        </div>
      </section>

      {/* ── Étape 3 ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
            3
          </span>
          <h2 className="font-semibold text-gray-800">Valide sa participation</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <Etape3 edition={edition} />
        </div>
      </section>

      <Footer edition={edition} />

      {showAddModal && user && (
        <AddEquipeModal
          token={''}  // token chargé de manière async dans le modal si besoin
          onClose={() => setShowAddModal(false)}
          onCreated={(equipe) => {
            setEquipes((prev) => [...prev, equipe]);
            setSelectedEquipe(equipe);
          }}
        />
      )}
    </div>
  );
}

// ─── Sous-composants étapes ────────────────────────────────────────────────

interface Etape2Props {
  edition: Edition | null;
  equipeSelectionnee: EquipeRef | null;
  user: import('firebase/auth').User;
}

function Etape2({ edition, equipeSelectionnee }: Etape2Props) {
  const [statut] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLancerDemande() {
    if (!equipeSelectionnee) return;
    setSubmitting(true);
    setError(null);
    try {
      // TODO: appel API POST /inscription (à brancher quand le backend est prêt)
      await new Promise((r) => setTimeout(r, 500));
      // simulate
    } catch {
      setError('Erreur lors de la soumission. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!statut) {
    // Pas encore d'inscription
    return (
      <div className="space-y-3">
        {edition?.msgLancerDemande && (
          <p className="text-sm text-gray-600 whitespace-pre-line">{edition.msgLancerDemande}</p>
        )}
        {error && <ErrorBanner message={error} />}
        {equipeSelectionnee ? (
          <button
            onClick={() => void handleLancerDemande()}
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
    );
  }

  if (statut === 'CANDIDATE') {
    return (
      <div className="bg-gray-100 rounded p-3 text-sm text-gray-700">
        {edition?.msgDemandeSoumise ?? 'Ta demande a bien été soumise. En attente de validation.'}
      </div>
    );
  }

  if (statut === 'LISTE_ATTENTE') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm text-orange-800">
        {edition?.msgListeAttente ?? "Tu es sur liste d'attente."}
      </div>
    );
  }

  if (statut === 'RESERVEE' || statut === 'PAIEMENT_ATTENDU') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-gray-700">{edition?.msgPaiementAttendu ?? 'Paiement attendu.'}</p>
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
    );
  }

  return null;
}

interface Etape3Props {
  edition: Edition | null;
}

function Etape3({ edition }: Etape3Props) {
  const [statut] = useState<string | null>(null);

  if (statut === 'VALIDEE') {
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
          {edition?.msgInscriptionConfirmee ?? 'Inscription confirmée !'}
        </div>
        <button className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700">
          Renseigner mes joueurs
        </button>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-400 italic">
      Cette étape sera disponible une fois l'inscription validée.
    </p>
  );
}
