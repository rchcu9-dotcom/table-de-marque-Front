import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { consumeRedirectPath } from '../auth/postLoginRedirect';
import { devLogin } from '../api/auth';

export default function ConnexionPage() {
  const { googleLoginUrl, setAuthToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await devLogin(email, displayName);
      setAuthToken(token);
      navigate(consumeRedirectPath('/inscription'), { replace: true });
    } catch {
      setError('Connexion développeur impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-white text-center">Connexion</h1>

      <a
        href={googleLoginUrl}
        className="flex items-center justify-center gap-3 bg-slate-100 border border-slate-300 rounded-lg px-6 py-3 shadow-sm hover:shadow-md hover:bg-white transition text-slate-800 font-medium"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Se connecter avec Google
      </a>

      {import.meta.env.DEV && (
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-300 mb-3">
            Connexion développeur (local uniquement)
          </div>
          <form onSubmit={handleDevLogin} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
            <input
              type="text"
              required
              placeholder="Nom affiché"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
            >
              {submitting ? 'Connexion…' : 'Se connecter (dev)'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
