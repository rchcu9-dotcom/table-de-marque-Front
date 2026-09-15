import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { rememberCurrentPath } from "../../auth/postLoginRedirect";

function initialsOf(displayName?: string): string | null {
  if (!displayName) return null;
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return initials || null;
}

export default function AuthButton() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    const initials = initialsOf(user.displayName);
    return (
      <button
        type="button"
        onClick={() => navigate("/profil")}
        className="h-10 w-10 rounded-full bg-amber-500 hover:bg-amber-400 border border-amber-400 flex items-center justify-center text-slate-950 font-semibold transition"
        title={user.displayName ?? user.email ?? "Profil"}
        aria-label="Accéder à mon profil"
      >
        {initials ?? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        rememberCurrentPath();
        navigate("/connexion");
      }}
      className="h-10 w-10 rounded-full border border-slate-700 bg-slate-900/70 hover:border-slate-400 flex items-center justify-center text-slate-300 transition"
      title="Se connecter"
      aria-label="Se connecter"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 19c0-3 3.1-5.2 7-5.2s7 2.2 7 5.2" />
      </svg>
    </button>
  );
}
