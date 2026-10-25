import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento o Vite (porta 5173) repassa /api, /uploads e /docs para a API (porta 3333).
// Em produção a própria API entrega o site compilado (pasta dist), então é tudo um endereço só.
const API_URL = process.env.VITE_API_PROXY ?? 'http://localhost:3333';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_URL,
      '/uploads': API_URL,
      '/docs': API_URL,
    },
  },
});
