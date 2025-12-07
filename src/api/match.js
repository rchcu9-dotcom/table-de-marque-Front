// Normalisation propre : supprime les / finaux si l'URL existe
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawBaseUrl && rawBaseUrl.trim().length > 0
    ? rawBaseUrl.replace(/\/+$/, "")
    : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
export async function fetchMatches() {
    const url = `${API_BASE_URL}/matches`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error("Erreur lors du chargement des matchs");
    return res.json();
}
export async function fetchMatchById(id) {
    const url = `${API_BASE_URL}/matches/${id}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error("Match introuvable");
    return res.json();
}
export async function fetchMomentumMatches() {
    const url = `${API_BASE_URL}/matches/momentum`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error("Erreur lors du chargement du momentum");
    return res.json();
}
