import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { queryClient, queryCacheTime } from './queryClient';

export function setupQueryPersistence() {
  if (typeof window === 'undefined') return;
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
  });
  persistQueryClient({
    queryClient,
    persister,
    maxAge: queryCacheTime,
    buster: "j3-flat-matches-v1",
    dehydrateOptions: {
      // status === 'success' est requis en plus de l'exclusion "matches" :
      // une query encore `pending` au moment de la persistance embarque un
      // `promise` (state React Query interne). Ce champ ne survit pas au
      // round-trip JSON de localStorage (une Promise se sérialise en `{}`),
      // et hydrate() plante ensuite ("promise.then is not a function") en
      // tentant de la relire — invalidant tout le cache persistant au boot
      // suivant (queries qui restent bloquées en chargement indéfiniment).
      shouldDehydrateQuery: (query) =>
        query.queryKey[0] !== "matches" && query.state.status === "success",
      // Les mutations en attente ne sont pas rejouées après un reload (pas
      // sûr de le faire aveuglément) et n'ont pas besoin d'être persistées.
      shouldDehydrateMutation: () => false,
    },
  });
}
