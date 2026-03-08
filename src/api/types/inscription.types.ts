export type Edition = {
  id: number;
  nom: string;
  categorie: string;
  etape: string;
  fraisInscription: number;
  prixRepas: number;
  nbPlacesMax: number;
  msgBienvenue?: string;
  msgFaisonsConnaissance?: string;
  msgSelectionEquipe?: string;
  msgAjoutEquipe?: string;
  msgLancerDemande?: string;
  msgDemandeRejete?: string;
  msgDemandeSoumise?: string;
  msgListeAttente?: string;
  msgPaiementAttendu?: string;
  msgChequeInfo1?: string;
  msgRibUrl?: string;
  msgInscriptionConfirmee?: string;
  msgInscriptionEnCours?: string;
  msgInscriptionValidee?: string;
  contactEmail?: string;
  contactPhone?: string;
  imageUrl?: string;
  affichagePlanningPublic: boolean;
};

export type EquipeRef = {
  id: number;
  nom: string;
  logoUrl?: string;
  active: boolean;
};

export type ProfilInscription = {
  id: number;
  pseudo?: string;
  role: 'RESPONSABLE_EQUIPE' | 'ORGANISATEUR';
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
