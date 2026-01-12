import { QueryClient } from '@tanstack/react-query';

export const queryStaleTime = Number(
  import.meta.env.VITE_QUERY_STALE_TIME_MS ?? '600000',
);
export const queryCacheTime = Number(
  import.meta.env.VITE_QUERY_CACHE_TIME_MS ?? '1800000',
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: queryStaleTime,
      gcTime: queryCacheTime,
      refetchOnWindowFocus: false,
    },
  },
});
