import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foodai.app',
  appName: 'FoodAI',
  webDir: 'dist',
  server: {
    url: 'https://foodai-prb1.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    GoogleSignIn: {
      scopes: ['profile', 'email']
    }
  }
};

export default config;
