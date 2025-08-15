import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: '.next',
  server: {
    url: 'https://rijflow-app.vercel.app',
    cleartext: true,
    allowNavigation: ['*']
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#ffffff',
    webContentsDebuggingEnabled: true
  },
  android: {
    backgroundColor: '#ffffff'
  },
  loggingBehavior: 'debug'
};

export default config;
