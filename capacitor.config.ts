import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: '.next',
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    backgroundColor: '#ffffff'
  },
  loggingBehavior: 'debug'
};

export default config;
