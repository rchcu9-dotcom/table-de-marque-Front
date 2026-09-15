export type EditionEtape =
  | 'CREEE'
  | 'CREATION_NOUVEAU_TOURNOI'
  | 'INSCRIPTIONS_OUVERTES'
  | 'CLOTUREE'
  | 'TOURNOI_DEMARRE';

export type Edition = {
  id: number;
  nom: string;
  categorie: string;
  annee: number;
  etape: EditionEtape;
  dateDebut: string;
  dateFinDebut: string;
  dateFinFin: string;
  fraisInscription: number;
  prixRepas: number;
  nbPlacesMax: number;
  msgBienvenue?: string;
  msgFaisonsConnaissance?: string;
  msgSelectionEquipe?: string;
  msgAjoutEquipe?: string;
  msgLancerDemande?: string;
  msgDemandeSoumise?: string;
  msgEquipeRefusee?: string;
  msgListeAttente?: string;
  msgPaiementAttendu?: string;
  msgChequeInfo1?: string;
  msgChequeInfo2?: string;
  msgInscriptionConfirmee?: string;
  msgInscriptionEnCours?: string;
  msgInscriptionValidee?: string;
  msgRenseigneJoueurs?: string;
  contactEmail?: string;
  contactPhone?: string;
  imageUrl?: string;
  imageDossierUrl?: string;
  imageRibUrl?: string;
  affichagePlanningPublic: boolean;
  anneesAge: number[];
};

export type EquipeRef = {
  id: number;
  nom: string;
  logoUrl?: string;
  active: boolean;
  candidatureEnCours: boolean;
};

export type ProfilRole = 'RESPONSABLE_EQUIPE' | 'ORGANISATEUR' | 'TABLE_DE_MARQUE';

export type ProfilInscription = {
  id: number;
  pseudo?: string;
  role: ProfilRole;
};

export type StatutInscription =
  | 'CANDIDATE'
  | 'LISTE_ATTENTE'
  | 'RESERVEE'
  | 'PAIEMENT_ATTENDU'
  | 'VALIDEE'
  | 'DOSSIER_EN_COURS'
  | 'DOSSIER_COMPLET'
  | 'REFUSEE';

export type InscriptionEquipe = {
  id: number;
  equipeId: number;
  statut: StatutInscription;
  userId?: number;
};

export type MaCandidature = {
  id: number;
  equipeNom: string;
  equipeLogoUrl: string | null;
  statut: StatutInscription;
  createdAt: string;
} | null;

export type CandidatureOrganisateur = {
  id: number;
  equipeNom: string;
  equipeLogoUrl: string | null;
  utilisateurEmail: string;
  utilisateurDisplayName: string | null;
  statut: StatutInscription;
  createdAt: string;
};

export type JoueurDossier = {
  id: number;
  dossierId: number;
  nom: string;
  prenom: string;
  numero: number;
  poste: string;
  licenceFFH: string | null;
  anneeNaissance: number | null;
  particularitesAlim: string | null;
};

export type CoachDossier = {
  id: number;
  dossierId: number;
  nom: string;
  prenom: string;
  presenceRepas: boolean;
};

export type Dossier = {
  id: number;
  inscriptionId: number;
  droitsImageAcceptes: boolean;
  droitsImageHorodatage: string | null;
};

export type DossierComplet = {
  dossier: Dossier | null;
  joueurs: JoueurDossier[];
  coachs: CoachDossier[];
  statutInscription: StatutInscription;
};
