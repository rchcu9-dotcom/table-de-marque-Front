import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { consumeRedirectPath } from '../auth/postLoginRedirect';

/**
 * Page de callback OAuth — reçoit ?token= depuis le backend,
 * stocke le JWT, met à jour le contexte Auth, invalide le cache profil,
 * et redirige vers la page d'origine (mémorisée avant /connexion).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuthToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setAuthToken(token);
      // Invalide le cache profil pour forcer un rechargement post-login
      void queryClient.invalidateQueries({ queryKey: ['inscription', 'profil'] });
    }

    void navigate(consumeRedirectPath('/inscription'), { replace: true });
    // setAuthToken est stable (définie hors du render cycle), navigate aussi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
