import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useInscriptionSession } from '../hooks/useInscriptionSession';

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const { role } = useInscriptionSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/connexion', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Mon profil</h1>

      <div className="border border-slate-800 rounded-lg p-4 flex flex-col gap-2 text-slate-200">
        {user.displayName && <div className="font-medium">{user.displayName}</div>}
        {user.email && <div className="text-sm text-slate-400">{user.email}</div>}
        {role && (
          <div className="text-sm text-slate-400">
            Rôle : <span className="text-slate-200 font-medium">{role}</span>
          </div>
        )}
      </div>

      {role === 'ORGANISATEUR' && (
        <Link
          to="/admin"
          className="text-center bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
        >
          Administration
        </Link>
      )}

      <button
        type="button"
        onClick={() => {
          logout();
          navigate('/');
        }}
        className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
      >
        Se déconnecter
      </button>
    </div>
  );
}
