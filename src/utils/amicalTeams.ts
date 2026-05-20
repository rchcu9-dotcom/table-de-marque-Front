type AmicalSlot = {
  jour: string;
  amical: string;
  parisHour: number;
  designated: string;
};

const AMICAL_SLOTS: AmicalSlot[] = [
  // J1
  { jour: "J1", amical: "Amical 1", parisHour: 10, designated: "Champigny" },
  { jour: "J1", amical: "Amical 1", parisHour: 13, designated: "La Roche" },
  { jour: "J1", amical: "Amical 1", parisHour: 17, designated: "Rouen" },
  { jour: "J1", amical: "Amical 2", parisHour: 11, designated: "Orléans" },
  { jour: "J1", amical: "Amical 2", parisHour: 16, designated: "Tours" },
  { jour: "J1", amical: "Amical 2", parisHour: 19, designated: "Dammarie" },
];

function getParisHour(isoDate: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/Paris",
  }).formatToParts(new Date(isoDate));
  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? parseInt(hourPart.value, 10) : NaN;
}

export function resolveTeamLabel(
  name: string,
  matchDate: string,
  jour?: string | null,
): string {
  if (!name || !name.startsWith("Amical")) return name ?? "";
  if (!matchDate) return name;
  const parisHour = getParisHour(matchDate);
  if (!Number.isFinite(parisHour)) return name;
  const slot = AMICAL_SLOTS.find(
    (s) =>
      s.amical === name &&
      s.parisHour === parisHour &&
      (!jour || s.jour === jour),
  );
  return slot ? `${name} (${slot.designated})` : name;
}
