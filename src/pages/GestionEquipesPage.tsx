import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useInscriptionSession } from '../hooks/useInscriptionSession';
import GestionEquipesReferentiel from '../components/admin/GestionEquipesReferentiel';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import { ACCUEIL_CRUMB, ADMIN_CRUMB } from '../components/navigation/breadcrumbItems';

export default function GestionEquipesPage() {
  const { token } = useAuth();
  const { role, isLoading } = useInscriptionSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role !== 'ORGANISATEUR') {
      navigate('/', { replace: true });
    }
  }, [isLoading, role, navigate]);

  // Le composant qui charge le référentiel n'est monté que pour un
  // organisateur : aucune requête ne part pour un autre rôle.
  if (role !== 'ORGANISATEUR') {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs items={[ACCUEIL_CRUMB, ADMIN_CRUMB, { label: 'Équipes du référentiel' }]} />
      <h1 className="text-slate-100 text-xl font-bold">Équipes du référentiel</h1>
      {token && <GestionEquipesReferentiel token={token} />}
    </div>
  );
}
