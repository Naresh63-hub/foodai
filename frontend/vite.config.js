import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    // @ts-ignore
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        // Only run unit/integration tests here; Playwright owns the e2e/ folder.
        include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
        exclude: ['node_modules/', 'dist/', 'e2e/**'],
        env: {
            VITE_FIREBASE_API_KEY: 'test-api-key',
            VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
            VITE_FIREBASE_PROJECT_ID: 'test-project',
            VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
            VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
            VITE_FIREBASE_APP_ID: '1:1234567890:web:testid',
            // Keep the dev login-bypass OFF in tests so AuthContext starts signed-out.
            VITE_AUTH_BYPASS: 'false',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/__tests__/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData.ts',
            ],
        },
    },
});
