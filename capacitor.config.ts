import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gelos.app',
  appName: 'Gelos',
  webDir: 'out',
  server: {
    // DEVELOPMENT MODE - connects to local Next.js dev server
    url: 'http://10.0.0.54:3001',
    cleartext: true, // Required for HTTP on Android

    // PRODUCTION MODE - uncomment below and comment out above
    // url: 'https://your-gelos-app.vercel.app',
    // androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFF8F0',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFF8F0',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
