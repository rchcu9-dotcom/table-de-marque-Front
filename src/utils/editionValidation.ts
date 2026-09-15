import type { UpdateEditionPayload } from '../api/inscription';

export type EditionValidationError = {
  field: keyof UpdateEditionPayload;
  message: string;
};

const NON_NEGATIVE_FIELDS: Array<{
  field: 'fraisInscription' | 'prixRepas' | 'nbPlacesMax';
  label: string;
}> = [
  { field: 'fraisInscription', label: "Le montant de l'inscription" },
  { field: 'prixRepas', label: 'Le prix du repas' },
  { field: 'nbPlacesMax', label: 'Le nombre de places' },
];

export function validateEditionForm(
  payload: UpdateEditionPayload,
): EditionValidationError[] {
  const errors: EditionValidationError[] = [];

  if (payload.nom !== undefined && payload.nom.trim() === '') {
    errors.push({ field: 'nom', message: 'Le nom du tournoi ne peut pas être vide.' });
  }
  if (payload.categorie !== undefined && payload.categorie.trim() === '') {
    errors.push({ field: 'categorie', message: 'La catégorie ne peut pas être vide.' });
  }

  for (const { field, label } of NON_NEGATIVE_FIELDS) {
    const value = payload[field];
    if (value != null && value < 0) {
      errors.push({ field, message: `${label} ne peut pas être négatif.` });
    }
  }

  const { dateDebut, dateFinDebut } = payload;
  if (dateDebut && dateFinDebut && dateDebut > dateFinDebut) {
    errors.push({
      field: 'dateFinDebut',
      message:
        "La date de fin du tournoi doit être postérieure ou égale à la date de début du tournoi.",
    });
  }

  return errors;
}
