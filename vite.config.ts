import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge .env/.env.local et vérifie la variable, tout en laissant Vite injecter import.meta.env
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = (env.VITE_API_BASE_URL ?? '').trim();

  if (!baseUrl) {
    throw new Error(
      'VITE_API_BASE_URL manquante : définis-la dans .env ou .env.local avant de lancer Vite.',
    );
  }

  const normalized = baseUrl.replace(/\/+$/, '');

  return {
    plugins: [react()],
    define: {
      // Expose a stable constant to avoid runtime import.meta.env undefined issues
      __APP_API_BASE_URL__: JSON.stringify(normalized),
    },
    server: {
      // Écoute sur toutes les interfaces : accès via Tailscale / vue Rendu du hub
      host: true,
      // En dev, VITE_API_BASE_URL=/api (.env.local) : le back est joint via ce proxy,
      // ce qui marche aussi depuis un autre appareil (pas de localhost côté client).
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
