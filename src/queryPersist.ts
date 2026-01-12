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
  });
}
