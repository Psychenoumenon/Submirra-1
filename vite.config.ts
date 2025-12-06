import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, _res, next) => {
            // If request is for a file (has extension), let it through
            if (req.url && /\.\w+$/.test(req.url.split('?')[0])) {
              return next();
            }
            // Otherwise, serve index.html for SPA routing
            if (req.url && !req.url.startsWith('/@') && !req.url.startsWith('/node_modules') && !req.url.startsWith('/src')) {
              req.url = '/index.html';
            }
            next();
          });
        };
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
