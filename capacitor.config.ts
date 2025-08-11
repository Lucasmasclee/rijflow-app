import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: 'out',
  server: {
    url: 'https://rijflow.nl',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#ffffff',
    allowsLinkPreview: false,
    scrollEnabled: true
  },
  android: {
    backgroundColor: '#ffffff'
  },
  loggingBehavior: 'debug'
};

export default config;
