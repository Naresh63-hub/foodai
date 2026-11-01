import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foodai.app',
  appName: 'FoodAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    GoogleSignIn: {
      scopes: ['profile', 'email']
    }
  }
};

export default config;
