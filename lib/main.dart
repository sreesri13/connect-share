import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/app_config.dart';
import 'config/theme.dart';
import 'screens/webview/connect_webview_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure high refresh rate (90Hz / 120Hz)
  try {
    await FlutterDisplayMode.setHighRefreshRate();
  } catch (_) {}

  // Set system UI styling for sleek dark mobile UI
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0F172A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Enable all orientations (phones + tablets)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Initialize Supabase Flutter client
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

class ConnectHubApp extends StatelessWidget {
  const ConnectHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ConnectHUB',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const ConnectWebViewScreen(),
      onGenerateRoute: (settings) {
        final routeName = settings.name;
        return MaterialPageRoute(
          builder: (_) => ConnectWebViewScreen(initialRoute: routeName),
          settings: settings,
        );
      },
    );
  }
}
