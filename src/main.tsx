import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './styles/global.css';
import { MatchStreamListener } from './providers/MatchStreamListener';

const queryClient = new QueryClient();

if (import.meta.env.DEV) {
  // Aid local troubleshooting of env injection
  console.log('VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MatchStreamListener />
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
