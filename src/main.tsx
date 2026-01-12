import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './styles/global.css';
import { MatchStreamListener } from './providers/MatchStreamListener';
import { SelectedTeamProvider } from './providers/SelectedTeamProvider';
import { queryClient } from './queryClient';
import { setupQueryPersistence } from './queryPersist';

setupQueryPersistence();

if (import.meta.env.DEV) {
  // Aid local troubleshooting of env injection
  console.log('VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SelectedTeamProvider>
        <MatchStreamListener />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SelectedTeamProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
