const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawBaseUrl && rawBaseUrl.trim().length > 0
    ? rawBaseUrl.replace(/\/+$/, "")
    : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
export async function fetchClassementByPoule(code) {
    const url = `${API_BASE_URL}/poules/${code}/classement`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error("Classement introuvable");
    return res.json();
}
export async function fetchClassementByMatch(id) {
    const url = `${API_BASE_URL}/matches/${id}/classement`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error("Classement introuvable");
    return res.json();
}
