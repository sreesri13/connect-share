import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7d487b599b5647b292acc5b26914c97c',
  appName: 'ConnectHUB',
  webDir: 'dist',
  // Hot-reload from the Lovable sandbox while developing.
  // IMPORTANT: comment this whole `server` block out before building a
  // release APK/AAB for the Play Store, so the app ships the bundled `dist`.
  server: {
    url: 'https://7d487b59-9b56-47b2-92ac-c5b26914c97c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0F0F23',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0F0F23',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F23',
    },
  },
};

export default config;
