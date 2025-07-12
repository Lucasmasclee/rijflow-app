import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rijflow.app',
  appName: 'RijFlow',
  webDir: 'out',
  server: {
    url: 'https://rijflow-app.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
