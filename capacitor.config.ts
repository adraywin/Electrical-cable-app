import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cabledesigner.app',
  appName: 'Cable Cross-Section Designer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
