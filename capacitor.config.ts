import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijflow',
  appName: 'RijFlow',
  webDir: '.next',
  server: {
    url: 'https://rijflow-app.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
