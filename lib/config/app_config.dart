class AppConfig {
  static const String appName = 'ConnectHUB';
  static const String appVersion = '1.0.6';
  static const int buildNumber = 6;

  // Supabase Configuration
  static const String supabaseUrl = 'https://sizxlgxdawklesbkxmfb.supabase.co';
  static const String supabaseAnonKey =
      'sb_publishable_9C53mB5TJqUxlusG-Z4hmA_Gx0-BSon';
  static const String supabaseProjectId = 'sizxlgxdawklesbkxmfb';

  // Google OAuth / Maps Configuration
  static const String googleMapsApiKey =
      'AIzaSyCNt5Y9zS-bcyCkQHyndtPjlbyTiEwWj50';
  static const String webClientId =
      '881030051398-opn38vq4gufl0et4u9tlj77l9qh8l82t.apps.googleusercontent.com';
  static const String androidPackageName = 'in.connecthub.app';

  // Storage Buckets
  static const String uploadsBucket = 'uploads';

  // Deep Link / Web Base URLs
  static const String webBaseUrl = 'https://connecthub.app';
  static const String productionWebsiteUrl = 'https://connect-hub-gamma.vercel.app';
  static const String userAgent =
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
}

