export function storageKey(uid: string): string {
  return `inscription-selected-equipe:${uid}`;
}

export function lireEquipeIdPersistee(uid: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch (e) {
    console.warn('Failed to read selected equipe id from storage', e);
    return null;
  }
}

export function ecrireEquipeIdPersistee(uid: string, equipeId: number): void {
  try {
    localStorage.setItem(storageKey(uid), String(equipeId));
  } catch (e) {
    console.warn('Failed to persist selected equipe id', e);
  }
}

export function effacerEquipeIdPersistee(uid: string): void {
  try {
    localStorage.removeItem(storageKey(uid));
  } catch (e) {
    console.warn('Failed to clear persisted selected equipe id', e);
  }
}
