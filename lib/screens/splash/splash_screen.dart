import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import '../webview/connect_webview_screen.dart';

class SplashScreen extends StatefulWidget {
  final String? initialRoute;

  const SplashScreen({super.key, this.initialRoute});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  late AnimationController _wipeController;
  late Animation<double> _wipeAnimation;

  @override
  void initState() {
    super.initState();

    // Set initial system UI overlay to match white launch screen
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    // 1. Logo Fade In & Scale In Controller (snappy 400ms)
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    );

    _scaleAnimation = Tween<double>(begin: 0.86, end: 1.0).animate(
      CurvedAnimation(
        parent: _fadeController,
        curve: Curves.easeOutBack,
      ),
    );

    // 2. Theme Blue Wipe Controller (fast 450ms)
    _wipeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );

    _wipeAnimation = CurvedAnimation(
      parent: _wipeController,
      curve: Curves.easeInOutCubic,
    );

    // Request permissions concurrently during startup
    _requestAppPermissions();

    // Start animation sequence
    _runAnimationSequence();
  }

  Future<void> _requestAppPermissions() async {
    try {
      // Request notification and location permissions for the app
      await [
        Permission.notification,
        Permission.location,
      ].request();
    } catch (_) {
      // Ignore permission request errors during splash to prevent launch delay
    }
  }

  Future<void> _runAnimationSequence() async {
    // Phase 1: Fade In Logo on White Background
    await _fadeController.forward();

    // Small hold for visual impact (100ms)
    await Future.delayed(const Duration(milliseconds: 100));

    // Change system UI to light icons as theme blue sweeps in
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Color(0xFF0F172A),
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );

    // Phase 2: Theme Blue Wipe Animation
    await _wipeController.forward();

    // Brief settling delay before opening main screen (150ms)
    await Future.delayed(const Duration(milliseconds: 150));

    if (!mounted) return;

    // Navigate to ConnectWebViewScreen with smooth transition
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            ConnectWebViewScreen(initialRoute: widget.initialRoute),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 250),
      ),
    );
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _wipeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final maxRadius = math.sqrt(size.width * size.width + size.height * size.height);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. Blue Theme Wipe Background (Custom Painter)
          AnimatedBuilder(
            animation: _wipeAnimation,
            builder: (context, child) {
              return CustomPaint(
                size: size,
                painter: _BlueWipePainter(
                  progress: _wipeAnimation.value,
                  maxRadius: maxRadius,
                ),
              );
            },
          ),

          // 2. Centered Logo with Fade & Scale Animation
          Center(
            child: AnimatedBuilder(
              animation: Listenable.merge([_fadeAnimation, _wipeAnimation]),
              builder: (context, child) {
                return Opacity(
                  opacity: _fadeAnimation.value.clamp(0.0, 1.0),
                  child: Transform.scale(
                    scale: _scaleAnimation.value,
                    child: Container(
                      width: size.width * 0.52,
                      height: size.width * 0.52,
                      constraints: const BoxConstraints(
                        maxWidth: 240,
                        maxHeight: 240,
                      ),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF00B0F3).withValues(
                              alpha: 0.25 * _wipeAnimation.value,
                            ),
                            blurRadius: 36,
                            spreadRadius: 8,
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/logos/connecthub_web_logo.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter that creates a dynamic, smooth radial wipe
/// expanding from center, wiping out the white canvas with the vibrant blue theme gradient
class _BlueWipePainter extends CustomPainter {
  final double progress;
  final double maxRadius;

  _BlueWipePainter({
    required this.progress,
    required this.maxRadius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final currentRadius = progress * maxRadius;

    // Gradient from vibrant Logo Theme Blue (#00B0F3) to Deep Brand Navy (#0F172A)
    final gradient = RadialGradient(
      center: Alignment.center,
      radius: 1.0,
      colors: const [
        Color(0xFF00B0F3), // Bright Logo Theme Blue
        Color(0xFF0072CE), // Rich Blue
        Color(0xFF0A192F), // Deep Accent Navy
        Color(0xFF0F172A), // Dark App Background
      ],
      stops: const [0.0, 0.45, 0.85, 1.0],
    );

    final paint = Paint()
      ..shader = gradient.createShader(
        Rect.fromCircle(center: center, radius: math.max(currentRadius, 1.0)),
      );

    canvas.drawCircle(center, currentRadius, paint);
  }

  @override
  bool shouldRepaint(covariant _BlueWipePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
