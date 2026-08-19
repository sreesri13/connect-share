import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/app_config.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/dashboard/dashboard_shell.dart';
import 'screens/demo/demo_screen.dart';
import 'screens/landing/landing_screen.dart';
import 'screens/legal/code_of_conduct_screen.dart';
import 'screens/legal/privacy_policy_screen.dart';
import 'screens/legal/terms_conditions_screen.dart';
import 'screens/public/business_store_screen.dart';
import 'screens/public/payment_redirect_screen.dart';
import 'screens/public/public_profile_screen.dart';
import 'screens/qr_generator/standalone_qr_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: ConnectHubApp(),
    ),
  );
}

class ConnectHubApp extends ConsumerWidget {
  const ConnectHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'ConnectHUB',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AuthGate(),
      onGenerateRoute: (settings) {
        final uri = Uri.tryParse(settings.name ?? '');
        if (uri == null) return null;

        // Path: /p/:profileId
        if (uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'p') {
          final profileId = uri.pathSegments[1];
          return MaterialPageRoute(
            builder: (_) => PublicProfileScreen(profileId: profileId),
            settings: settings,
          );
        }

        // Path: /business/:publicId
        if (uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'business') {
          final publicId = uri.pathSegments[1];
          return MaterialPageRoute(
            builder: (_) => BusinessStoreScreen(publicId: publicId),
            settings: settings,
          );
        }

        // Path: /store/:storeSlug
        if (uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'store') {
          final storeSlug = uri.pathSegments[1];
          return MaterialPageRoute(
            builder: (_) => BusinessStoreScreen(storeSlug: storeSlug),
            settings: settings,
          );
        }

        // Path: /pay?code=...
        if (uri.path == '/pay' || (uri.pathSegments.isNotEmpty && uri.pathSegments[0] == 'pay')) {
          final code = uri.queryParameters['code'] ?? (uri.pathSegments.length > 1 ? uri.pathSegments[1] : '');
          return MaterialPageRoute(
            builder: (_) => PaymentRedirectScreen(code: code),
            settings: settings,
          );
        }

        // Path: /auth
        if (uri.path == '/auth') {
          final mode = uri.queryParameters['mode'];
          return MaterialPageRoute(
            builder: (_) => AuthScreen(initialIsSignUp: mode == 'signup'),
            settings: settings,
          );
        }

        // Path: /dashboard
        if (uri.path == '/dashboard') {
          return MaterialPageRoute(
            builder: (_) => const DashboardShell(),
            settings: settings,
          );
        }

        // Path: /qr
        if (uri.path == '/qr') {
          return MaterialPageRoute(
            builder: (_) => const StandaloneQRScreen(),
            settings: settings,
          );
        }

        // Path: /demo
        if (uri.path == '/demo') {
          return MaterialPageRoute(
            builder: (_) => const DemoScreen(),
            settings: settings,
          );
        }

        // Path: /privacy-policy
        if (uri.path == '/privacy-policy') {
          return MaterialPageRoute(
            builder: (_) => const PrivacyPolicyScreen(),
            settings: settings,
          );
        }

        // Path: /terms-conditions
        if (uri.path == '/terms-conditions') {
          return MaterialPageRoute(
            builder: (_) => const TermsConditionsScreen(),
            settings: settings,
          );
        }

        // Path: /code-of-conduct
        if (uri.path == '/code-of-conduct') {
          return MaterialPageRoute(
            builder: (_) => const CodeOfConductScreen(),
            settings: settings,
          );
        }

        return null;
      },
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authStateAsync = ref.watch(authStateProvider);

    return authStateAsync.when(
      data: (authState) {
        if (authState.session != null) {
          return const DashboardShell();
        }
        return const LandingScreen();
      },
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      ),
      error: (_, __) => const LandingScreen(),
    );
  }
}
