class AppConfig {
  static const String appName = 'ConnectHUB';
  static const String appVersion = '1.0.8';
  static const int buildNumber = 8;

  // Supabase Configuration (synced with .env)
  static const String supabaseUrl = String.fromEnvironment(
    'VITE_SUPABASE_URL',
    defaultValue: String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://sizxlgxdawklesbkxmfb.supabase.co',
    ),
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    defaultValue: String.fromEnvironment(
      'SUPABASE_PUBLISHABLE_KEY',
      defaultValue: 'sb_publishable_9C53mB5TJqUxlusG-Z4hmA_Gx0-BSon',
    ),
  );
  static const String supabaseProjectId = String.fromEnvironment(
    'VITE_SUPABASE_PROJECT_ID',
    defaultValue: 'sizxlgxdawklesbkxmfb',
  );

  // Google OAuth / Maps Configuration (synced with .env)
  static const String googleMapsApiKey = String.fromEnvironment(
    'VITE_GOOGLE_MAPS_API_KEY',
    defaultValue: 'AIzaSyCNt5Y9zS-bcyCkQHyndtPjlbyTiEwWj50',
  );
  static const String webClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: String.fromEnvironment(
      'VITE_GOOGLE_CLIENT_ID',
      defaultValue: '881030051398-opn38vq4gufl0et4u9tlj77l9qh8l82t.apps.googleusercontent.com',
    ),
  );
  static const String androidPackageName = 'in.connecthub.app';

  // Storage Buckets
  static const String uploadsBucket = 'uploads';

  // Deep Link / Web Base URLs
  static const String webBaseUrl = 'https://connecthub.app';
  static const String productionWebsiteUrl = 'https://connect-hub-gamma.vercel.app';
  static const String userAgent =
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
}


