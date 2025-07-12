import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rijflow.app',
  appName: 'rijflow-app',
  webDir: 'out',
  server: {
    url: 'https://rijflow-app.vercel.app',
    cleartext: true
  }
};

export default config;
