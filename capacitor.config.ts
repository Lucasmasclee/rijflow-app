import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: '.next',
  server: {
    url: 'https://rijflow.nl',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: false
  },
  loggingBehavior: 'debug'
};

export default config;
