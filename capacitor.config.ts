import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: '.next',
  server: {
    url: 'https://rijflow-app.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
