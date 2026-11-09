import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const asaasTarget = env.VITE_ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3';

  return {
    define: {
      'process.env.ASAAS_API_URL': JSON.stringify(env.ASAAS_API_URL || env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3'),
      'process.env.ASAAS_API_KEY': JSON.stringify(env.ASAAS_API_KEY || env.VITE_ASAAS_API_KEY || env.VITE_ASAAS_API_KEY_PRODUCTION || ''),
      'process.env.ASAAS_MASTER_WALLET_ID': JSON.stringify(env.ASAAS_MASTER_WALLET_ID || env.VITE_ASAAS_MASTER_WALLET_ID || ''),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        pwaAssets: {
          disabled: false,
          config: false,
          preset: 'minimal-2023',
          image: 'public/favicon.svg',
        },
        manifest: {
          name: 'Naville Barber',
          short_name: 'Naville',
          description: 'Gestao de barbearias Naville Barber.',
          theme_color: '#0B0F19',
          background_color: '#0B0F19',
          display: 'standalone',
          orientation: 'portrait',
        },
      }),
    ],
    server: {
      port: 5180,
      host: '127.0.0.1',
      watch: {
        ignored: [
          '**/pocketbase/**',
          '**/pb_data/**',
          '**/*.db*',
          '**/*.db-wal*',
          '**/*.db-shm*',
          '**/graphify-out/**',
          '**/.system_generated/**',
          '**/.user_uploaded/**',
          '**/server/**',
        ],
      },
      proxy: {
        '/api/asaas': {
          target: asaasTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
          secure: false,
        },
      },
    },
  };
});
