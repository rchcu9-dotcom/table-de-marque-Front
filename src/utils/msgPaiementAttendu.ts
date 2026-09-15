export function formatFraisInscription(frais: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(frais);
}

export function interpolerMsgPaiementAttendu(
  message: string,
  fraisInscription: number,
): string {
  return message.replace(/\{\{frais\}\}/g, formatFraisInscription(fraisInscription));
}
