const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
export async function fetchMatches() {
    const res = await fetch(`${API_BASE_URL}/matches`);
    if (!res.ok)
        throw new Error("Erreur lors du chargement des matchs");
    return res.json();
}
export async function fetchMatchById(id) {
    const res = await fetch(`${API_BASE_URL}/matches/${id}`);
    if (!res.ok)
        throw new Error("Match introuvable");
    return res.json();
}
