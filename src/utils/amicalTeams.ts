type AmicalSlot = {
  jour: string;
  amical: string;
  parisHour: number;
  designated: string;
};

const AMICAL_SLOTS: AmicalSlot[] = [
  // J1
  { jour: "J1", amical: "Amical 1", parisHour: 11, designated: "Champigny" },
  { jour: "J1", amical: "Amical 1", parisHour: 12, designated: "Orléans" },
  { jour: "J1", amical: "Amical 1", parisHour: 16, designated: "Cholet" },
  { jour: "J1", amical: "Amical 2", parisHour: 11, designated: "Le Havre" },
  { jour: "J1", amical: "Amical 2", parisHour: 13, designated: "La Roche" },
  { jour: "J1", amical: "Amical 2", parisHour: 15, designated: "Tours" },
];

function getParisHour(isoDate: string): number {
  return parseInt(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }).format(new Date(isoDate)),
    10,
  );
}

export function resolveTeamLabel(
  name: string,
  matchDate: string,
  jour?: string | null,
): string {
  if (!name.startsWith("Amical")) return name;
  if (!jour) return name;
  const parisHour = getParisHour(matchDate);
  const slot = AMICAL_SLOTS.find(
    (s) => s.jour === jour && s.amical === name && s.parisHour === parisHour,
  );
  return slot ? `${name} (${slot.designated})` : name;
}
