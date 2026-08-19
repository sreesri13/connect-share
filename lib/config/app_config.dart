class AppConfig {
  static const String appName = 'ConnectHUB';
  static const String appVersion = '1.0.5';
  static const int buildNumber = 5;

  // Supabase Configuration
  static const String supabaseUrl = 'https://kyzazsmsqrqwbjpkqjqm.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emF6c21zcXJxd2JqcGtxanFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTAyMjIsImV4cCI6MjA4MTM4NjIyMn0.IkBjLc-U-EJDcfQ6IiMW5Ja3Xei4SAQhZtpTjq7lD14';
  static const String supabaseProjectId = 'kyzazsmsqrqwbjpkqjqm';

  // Google OAuth / Maps Configuration
  static const String googleMapsApiKey =
      'AIzaSyCNt5Y9zS-bcyCkQHyndtPjlbyTiEwWj50';
  static const String webClientId =
      ''; // Optional web client ID if needed for server auth
  static const String androidPackageName = 'in.connecthub.app';

  // Storage Buckets
  static const String uploadsBucket = 'uploads';

  // Deep Link / Web Base URLs
  static const String webBaseUrl = 'https://connecthub.app';
}
