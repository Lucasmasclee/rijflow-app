import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mascelli.rijlesplanner',
  appName: 'RijFlow',
  webDir: 'out',
  // Server configuratie uitcommentariëren voor productie om conflicten te voorkomen
  // server: {
  //   url: 'https://rijflow.nl',
  //   cleartext: true
  // },
  ios: {
    contentInset: 'always',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
