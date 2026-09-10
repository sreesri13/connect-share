import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_config.dart';
import '../../services/webview_auth_bridge.dart';


class ConnectWebViewScreen extends StatefulWidget {
  final String? initialRoute;

  const ConnectWebViewScreen({super.key, this.initialRoute});

  @override
  State<ConnectWebViewScreen> createState() => _ConnectWebViewScreenState();
}

class _ConnectWebViewScreenState extends State<ConnectWebViewScreen>
    with WidgetsBindingObserver {
  InAppWebViewController? _webViewController;
  PullToRefreshController? _pullToRefreshController;

  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  DateTime? _lastBackPressTime;
  final WebViewAuthBridge _authBridge = WebViewAuthBridge();

  Timer? _offlineToastTimer;
  bool _showOfflineToast = false;

  Timer? _doubleBackToastTimer;
  bool _showDoubleBackToast = false;

  String _currentUrl = AppConfig.productionWebsiteUrl;
  String _targetInitialUrl = AppConfig.productionWebsiteUrl;
  bool _isInitialUrlReady = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _initHighRefreshRate();
    _initConnectivity();
    _initPullToRefresh();
    _determineInitialUrl();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _connectivitySubscription?.cancel();
    _offlineToastTimer?.cancel();
    _doubleBackToastTimer?.cancel();
    super.dispose();
  }

  /// Trigger floating offline notification at bottom for 2 seconds
  void _triggerOfflineBottomNotification() {
    _offlineToastTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _showOfflineToast = true;
    });
    _offlineToastTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _showOfflineToast = false;
        });
      }
    });
  }

  /// Trigger floating double-back exit notification at bottom for 2 seconds
  void _triggerDoubleBackToast() {
    _doubleBackToastTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _showDoubleBackToast = true;
    });
    _doubleBackToastTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _showDoubleBackToast = false;
        });
      }
    });
  }

  /// Request highest supported refresh rate (90Hz / 120Hz)
  Future<void> _initHighRefreshRate() async {
    try {
      await FlutterDisplayMode.setHighRefreshRate();
    } catch (e) {
      if (kDebugMode) {
        print('[ConnectWebView] High refresh rate error: $e');
      }
    }
  }

  /// Determine whether to start at / (landing) or /dashboard (authenticated)
  Future<void> _determineInitialUrl() async {
    if (widget.initialRoute != null && widget.initialRoute!.isNotEmpty) {
      final route = widget.initialRoute!.startsWith('/')
          ? widget.initialRoute!
          : '/${widget.initialRoute!}';
      setState(() {
        _targetInitialUrl = '${AppConfig.productionWebsiteUrl}$route';
        _currentUrl = _targetInitialUrl;
        _isInitialUrlReady = true;
      });
      return;
    }

    final isSignedIn = await _authBridge.hasSavedSession();
    setState(() {
      if (isSignedIn) {
        _targetInitialUrl = '${AppConfig.productionWebsiteUrl}/my-profile';
      } else {
        _targetInitialUrl = '${AppConfig.productionWebsiteUrl}/';
      }
      _currentUrl = _targetInitialUrl;
      _isInitialUrlReady = true;
    });
  }

  /// Set up network connectivity listener
  void _initConnectivity() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOfflineNow = results.contains(ConnectivityResult.none) || results.isEmpty;
      if (isOfflineNow != _isOffline) {
        setState(() {
          if (!isOfflineNow && _isOffline) {
            // Auto reload when reconnected to refresh stale cache
            if (_hasError) {
              _reloadWebView();
            }
          }
          _isOffline = isOfflineNow;
        });
        if (isOfflineNow) {
          _triggerOfflineBottomNotification();
        }
      }
    });
  }

  /// Initialize pull to refresh controller
  void _initPullToRefresh() {
    _pullToRefreshController = PullToRefreshController(
      settings: PullToRefreshSettings(
        color: const Color(0xFF8B5CF6),
        backgroundColor: const Color(0xFF1E293B),
      ),
      onRefresh: () async {
        if (_webViewController != null) {
          if (defaultTargetPlatform == TargetPlatform.android) {
            _webViewController?.reload();
          } else if (defaultTargetPlatform == TargetPlatform.iOS) {
            _webViewController?.loadUrl(
              urlRequest: URLRequest(url: await _webViewController?.getUrl()),
            );
          }
        }
      },
    );
  }

  void _reloadWebView() {
    setState(() {
      _hasError = false;
      _isLoading = true;
    });
    _webViewController?.reload();
  }

  /// Check if the given URL corresponds to the public Landing / Home / Auth page
  bool _isLandingPage(String url) {
    final clean = url.trim().toLowerCase().replaceAll(RegExp(r'#.*$'), '');
    final base = AppConfig.productionWebsiteUrl.toLowerCase();
    return clean == base ||
        clean == '$base/' ||
        clean.endsWith('/auth') ||
        clean.endsWith('/login') ||
        clean.endsWith('/signup') ||
        clean == 'https://connect-hub-gamma.vercel.app' ||
        clean == 'https://connect-hub-gamma.vercel.app/' ||
        clean == 'https://connecthub.app' ||
        clean == 'https://connecthub.app/';
  }

  /// Check if the given URL corresponds to My Profile screen
  bool _isMyProfilePage(String url) {
    final clean = url.trim().toLowerCase().replaceAll(RegExp(r'#.*$'), '').replaceAll(RegExp(r'\?.*$'), '');
    return clean.endsWith('/my-profile') ||
        clean.endsWith('/profile') ||
        clean.contains('/my-profile');
  }

  /// Native Google Sign In flow with Supabase session injection & fallback
  Future<void> _handleGoogleSignIn() async {
    final result = await _authBridge.handleNativeGoogleSignIn(_webViewController);
    if (!result.success && mounted && !result.cancelled) {
      if (kDebugMode) {
        print('[ConnectWebView] Native Google sign in reported: ${result.errorMessage}');
      }
    }
  }

  /// Native Share Handler
  Future<void> _handleShare(List<dynamic> args) async {
    if (args.isNotEmpty) {
      final text = args[0]?.toString() ?? '';
      if (text.isNotEmpty) {
        await Share.share(text);
      }
    }
  }

  /// Native Save QR Code Handler (saves directly to ConnectHub folder in mobile storage)
  Future<void> _handleSaveQRCode(List<dynamic> args) async {
    try {
      if (args.isEmpty || args[0] == null) return;
      final data = args[0] is Map ? args[0] as Map<dynamic, dynamic> : {};
      final base64String = data['base64Data']?.toString() ?? '';
      String filename = data['filename']?.toString() ?? 'connecthub-qr.png';
      if (!filename.toLowerCase().endsWith('.png')) {
        filename = '$filename.png';
      }

      if (base64String.isEmpty) return;

      // Extract raw base64 payload
      final cleanBase64 = base64String.contains(',')
          ? base64String.split(',').last
          : base64String;
      final bytes = base64Decode(cleanBase64.trim());

      Directory? targetDir;
      if (Platform.isAndroid) {
        // Preferred: Public Pictures/ConnectHub folder
        final picturesConnectHub = Directory('/storage/emulated/0/Pictures/ConnectHub');
        final downloadsConnectHub = Directory('/storage/emulated/0/Download/ConnectHub');

        if (await Directory('/storage/emulated/0/Pictures').exists()) {
          targetDir = picturesConnectHub;
        } else if (await Directory('/storage/emulated/0/Download').exists()) {
          targetDir = downloadsConnectHub;
        } else {
          final extDir = await getExternalStorageDirectory();
          targetDir = Directory('${extDir?.path}/ConnectHub');
        }
      } else {
        final docDir = await getApplicationDocumentsDirectory();
        targetDir = Directory('${docDir.path}/ConnectHub');
      }

      if (!await targetDir.exists()) {
        await targetDir.create(recursive: true);
      }

      final file = File('${targetDir.path}/$filename');
      await file.writeAsBytes(bytes);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Saved to ConnectHub folder ($filename)',
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: const BorderSide(color: Color(0xFF334155)),
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('[WebView] Error saving QR code to ConnectHub folder: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save QR code: $e'),
            backgroundColor: Colors.red.shade800,
          ),
        );
      }
    }
  }

  /// Android Back Navigation handling
  Future<void> _handleBackPress() async {
    if (_webViewController == null) {
      await SystemNavigator.pop();
      return;
    }

    final currentWebUri = await _webViewController!.getUrl();
    final currentUrl = currentWebUri?.toString() ?? _currentUrl;
    final isSignedIn = await _authBridge.hasSavedSession();

    // 1. Signed-in User: Double back exit ONLY on My Profile (/my-profile).
    // All other pages (/dashboard, /my-qr-codes, /qr, /qr-business, /qr-payments, etc.)
    // navigate back to the previous page on single press without exit prompt.
    if (isSignedIn) {
      // If currently on My Profile: Prompt double back to exit
      if (_isMyProfilePage(currentUrl)) {
        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          _triggerDoubleBackToast();
        } else {
          await SystemNavigator.pop();
        }
        return;
      }

      // If currently on any other page: Always go back to previous page on single press
      final canGoBack = await _webViewController!.canGoBack();
      if (canGoBack) {
        final history = await _webViewController!.getCopyBackForwardList();
        final currentIndex = history?.currentIndex ?? 0;
        if (currentIndex > 0 && history?.list != null) {
          final prevItem = history!.list![currentIndex - 1];
          final prevUrl = prevItem.url?.toString() ?? '';
          // If previous page in history is public landing or auth, route cleanly to My Profile
          if (_isLandingPage(prevUrl)) {
            await _webViewController!.loadUrl(
              urlRequest: URLRequest(
                url: WebUri('${AppConfig.productionWebsiteUrl}/my-profile'),
              ),
            );
            return;
          }
        }
        await _webViewController!.goBack();
        return;
      }

      // Cannot go back further: Navigate directly to /my-profile
      await _webViewController!.loadUrl(
        urlRequest: URLRequest(
          url: WebUri('${AppConfig.productionWebsiteUrl}/my-profile'),
        ),
      );
      return;
    }

    // 2. Unauthenticated User: Landing page prompt double back to exit
    if (_isLandingPage(currentUrl)) {
      final now = DateTime.now();
      if (_lastBackPressTime == null ||
          now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
        _lastBackPressTime = now;
        _triggerDoubleBackToast();
      } else {
        await SystemNavigator.pop();
      }
      return;
    }

    final canGoBack = await _webViewController!.canGoBack();
    if (canGoBack) {
      await _webViewController!.goBack();
      return;
    }

    // Top-level fallback for unauthenticated user
    final now = DateTime.now();
    if (_lastBackPressTime == null ||
        now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
      _lastBackPressTime = now;
      _triggerDoubleBackToast();
    } else {
      await SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _handleBackPress();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          top: true,
          bottom: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (!_isInitialUrlReady) {
                return const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B5CF6)),
                  ),
                );
              }

              return Stack(
                children: [
                  // Main WebView
                  if (!_hasError)
                    InAppWebView(
                      initialUrlRequest: URLRequest(
                        url: WebUri(_targetInitialUrl),
                      ),
                      initialSettings: InAppWebViewSettings(
                        // Performance & Hardware Acceleration
                        useShouldOverrideUrlLoading: true,
                        mediaPlaybackRequiresUserGesture: false,
                        allowsInlineMediaPlayback: true,
                        useHybridComposition: true,
                        hardwareAcceleration: true,

                        // User Agent: Clean Chrome Mobile User-Agent to avoid Google OAuth blocks
                        userAgent: AppConfig.userAgent,

                        // Caching & Data Persistence
                        cacheMode: CacheMode.LOAD_DEFAULT,
                        clearCache: false,
                        domStorageEnabled: true,
                        databaseEnabled: true,
                        javaScriptEnabled: true,
                        supportMultipleWindows: false,
                        allowFileAccessFromFileURLs: true,
                        allowUniversalAccessFromFileURLs: true,
                        allowContentAccess: true,
                        allowFileAccess: true,
                        geolocationEnabled: true,
                        transparentBackground: true,
                        verticalScrollBarEnabled: false,
                        horizontalScrollBarEnabled: false,
                      ),
                      pullToRefreshController: _pullToRefreshController,
                      onWebViewCreated: (controller) {
                        _webViewController = controller;

                        // JavaScript Handlers
                        controller.addJavaScriptHandler(
                          handlerName: 'googleSignIn',
                          callback: (args) => _handleGoogleSignIn(),
                        );
                        controller.addJavaScriptHandler(
                          handlerName: 'onAuthStateChange',
                          callback: (args) async {
                            if (args.isNotEmpty && args[0] != null) {
                              final sessionStr = args[0].toString();
                              if (sessionStr.isNotEmpty && sessionStr != 'null') {
                                await _authBridge.saveSessionJson(sessionStr);
                                // Ensure user is navigated directly to dashboard on sign in
                                if (_isLandingPage(_currentUrl)) {
                                  controller.loadUrl(
                                    urlRequest: URLRequest(
                                      url: WebUri('${AppConfig.productionWebsiteUrl}/dashboard'),
                                    ),
                                  );
                                }
                              }
                            }
                          },
                        );
                        controller.addJavaScriptHandler(
                          handlerName: 'logout',
                          callback: (args) => _authBridge.handleSignOut(controller),
                        );
                        controller.addJavaScriptHandler(
                          handlerName: 'nativeShare',
                          callback: (args) => _handleShare(args),
                        );
                        controller.addJavaScriptHandler(
                          handlerName: 'saveQRCode',
                          callback: (args) => _handleSaveQRCode(args),
                        );

                        // Pre-restore session if available
                        _authBridge.restoreSavedSession(controller);
                      },
                      onLoadStart: (controller, url) {
                        final urlStr = url?.toString() ?? '';
                        setState(() {
                          _currentUrl = urlStr;
                          _isLoading = true;
                          _hasError = false;
                        });
                        // Inject interceptor early
                        controller.evaluateJavascript(
                          source: WebViewAuthBridge.getAuthInterceptorScript(),
                        );
                      },
                      onUpdateVisitedHistory: (controller, url, isReload) {
                        final urlStr = url?.toString() ?? '';
                        if (urlStr.isNotEmpty) {
                          setState(() {
                            _currentUrl = urlStr;
                          });
                        }
                      },
                      onLoadStop: (controller, url) async {
                        _pullToRefreshController?.endRefreshing();
                        final urlStr = url?.toString() ?? '';
                        setState(() {
                          _currentUrl = urlStr;
                          _isLoading = false;
                        });

                        // Inject Google Auth Interceptor script
                        await controller.evaluateJavascript(
                          source: WebViewAuthBridge.getAuthInterceptorScript(),
                        );

                        // If user has saved session and lands on landing or auth page, redirect directly to /my-profile
                        final isSignedIn = await _authBridge.hasSavedSession();
                        if (isSignedIn && _isLandingPage(urlStr)) {
                          await controller.loadUrl(
                            urlRequest: URLRequest(
                              url: WebUri('${AppConfig.productionWebsiteUrl}/my-profile'),
                            ),
                          );
                          return;
                        }
                      },
                      onProgressChanged: (controller, progress) {
                        if (progress == 100) {
                          _pullToRefreshController?.endRefreshing();
                        }
                      },
                      onReceivedError: (controller, request, error) {
                        _pullToRefreshController?.endRefreshing();
                        // Only trigger full error screen if it's the main frame request
                        if (request.isForMainFrame ?? true) {
                          if (_isOffline) {
                            // Suppress full error screen if offline cache is loading
                          } else {
                            setState(() {
                              _hasError = true;
                              _errorMessage = error.description;
                            });
                          }
                        }
                      },
                      onReceivedHttpError: (controller, request, response) {
                        _pullToRefreshController?.endRefreshing();
                      },
                      shouldOverrideUrlLoading: (controller, navigationAction) async {
                        final uri = navigationAction.request.url;
                        if (uri == null) return NavigationActionPolicy.ALLOW;

                        // 1. Handle external non-http URI schemes
                        final scheme = uri.scheme.toLowerCase();
                        if (scheme == 'tel' ||
                            scheme == 'mailto' ||
                            scheme == 'sms' ||
                            scheme == 'whatsapp' ||
                            scheme == 'upi' ||
                            scheme == 'intent') {
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                          return NavigationActionPolicy.CANCEL;
                        }

                        // 2. Allow internal web routes, Supabase auth, and Google OAuth
                        final host = uri.host.toLowerCase();
                        if (host.contains('connect-hub-gamma.vercel.app') ||
                            host.contains('connecthub.app') ||
                            host.contains('supabase.co') ||
                            host.contains('accounts.google.com') ||
                            host.contains('google.com')) {
                          return NavigationActionPolicy.ALLOW;
                        }

                        // 3. Open other external links in default external browser
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                          return NavigationActionPolicy.CANCEL;
                        }

                        return NavigationActionPolicy.ALLOW;
                      },
                      onPermissionRequest: (controller, permissionRequest) async {
                        for (final resource in permissionRequest.resources) {
                          if (resource.toString().contains('CAMERA')) {
                            await Permission.camera.request();
                          }
                          if (resource.toString().contains('MICROPHONE')) {
                            await Permission.microphone.request();
                          }
                        }
                        return PermissionResponse(
                          resources: permissionRequest.resources,
                          action: PermissionResponseAction.GRANT,
                        );
                      },
                      onGeolocationPermissionsShowPrompt: (controller, origin) async {
                        await Permission.location.request();
                        return GeolocationPermissionShowPromptResponse(
                          origin: origin,
                          allow: true,
                          retain: true,
                        );
                      },
                      onDownloadStartRequest: (controller, downloadStartRequest) async {
                        final downloadUrl = downloadStartRequest.url;
                        if (await canLaunchUrl(downloadUrl)) {
                          await launchUrl(downloadUrl, mode: LaunchMode.externalApplication);
                        }
                      },
                    ),

                  // Centered Morphing Icon Loader (cycles QR, Web, Search, Hub, Share)
                  if (_isLoading && !_hasError)
                    const Positioned.fill(
                      child: IgnorePointer(
                        child: Center(
                          child: _CenteredMorphingLoader(),
                        ),
                      ),
                    ),

                  // Floating Offline Notification (bottom floating pill, auto-dismisses in 2s)
                  if (_showOfflineToast)
                    Positioned(
                      bottom: 24,
                      left: 20,
                      right: 20,
                      child: AnimatedOpacity(
                        opacity: _showOfflineToast ? 1.0 : 0.0,
                        duration: const Duration(milliseconds: 200),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFFF59E0B),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                                blurRadius: 18,
                                spreadRadius: 1,
                                offset: const Offset(0, 4),
                              ),
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.7),
                                blurRadius: 14,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.wifi_off_rounded,
                                color: Color(0xFFF59E0B),
                                size: 20,
                              ),
                              SizedBox(width: 10),
                              Flexible(
                                child: Text(
                                  'Make sure internet is connected',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.2,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Floating Double Back To Exit Notification (bottom floating pill, auto-dismisses in 2s)
                  if (_showDoubleBackToast)
                    Positioned(
                      bottom: 24,
                      left: 20,
                      right: 20,
                      child: AnimatedOpacity(
                        opacity: _showDoubleBackToast ? 1.0 : 0.0,
                        duration: const Duration(milliseconds: 200),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFF38BDF8),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF38BDF8).withValues(alpha: 0.25),
                                blurRadius: 18,
                                spreadRadius: 1,
                                offset: const Offset(0, 4),
                              ),
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.7),
                                blurRadius: 14,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.touch_app_rounded,
                                color: Color(0xFF38BDF8),
                                size: 20,
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Press back again to exit ConnectHUB',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Full Offline / Error State Screen
                  if (_hasError)
                    Container(
                      color: const Color(0xFF0F172A),
                      width: double.infinity,
                      height: double.infinity,
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: const Color(0xFF334155),
                                ),
                              ),
                              child: const Icon(
                                Icons.cloud_off_rounded,
                                color: Color(0xFF8B5CF6),
                                size: 40,
                              ),
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Unable to Connect',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _isOffline
                                  ? 'Please check your internet connection to load ConnectHUB.'
                                  : (_errorMessage.isNotEmpty
                                      ? _errorMessage
                                      : 'Could not load page. Please try again.'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 14,
                                height: 1.5,
                              ),
                            ),
                            const SizedBox(height: 32),
                            ElevatedButton.icon(
                              onPressed: _reloadWebView,
                              icon: const Icon(Icons.refresh_rounded, size: 20),
                              label: const Text(
                                'Retry Connection',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF8B5CF6),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 28,
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MorphIconItem {
  final IconData icon;
  final Color color;
  final String label;
  const _MorphIconItem(this.icon, this.color, this.label);
}

/// Centered morphic loader that smoothly rotates and cycles through
/// QR code, website, search, connect/hub, and share icons in a continuous loop.
class _CenteredMorphingLoader extends StatefulWidget {
  const _CenteredMorphingLoader();

  @override
  State<_CenteredMorphingLoader> createState() => _CenteredMorphingLoaderState();
}

class _CenteredMorphingLoaderState extends State<_CenteredMorphingLoader>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  Timer? _timer;
  late AnimationController _spinController;

  static const List<_MorphIconItem> _items = [
    _MorphIconItem(Icons.qr_code_2_rounded, Color(0xFF8B5CF6), 'QR Code'),
    _MorphIconItem(Icons.language_rounded, Color(0xFF38BDF8), 'Website'),
    _MorphIconItem(Icons.search_rounded, Color(0xFF10B981), 'Search'),
    _MorphIconItem(Icons.hub_rounded, Color(0xFFA855F7), 'ConnectHUB'),
    _MorphIconItem(Icons.share_rounded, Color(0xFFEC4899), 'Share'),
  ];

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();

    _timer = Timer.periodic(const Duration(milliseconds: 750), (timer) {
      if (!mounted) return;
      setState(() {
        _currentIndex = (_currentIndex + 1) % _items.length;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _spinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = _items[_currentIndex];

    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.90),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: current.color.withValues(alpha: 0.35),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: current.color.withValues(alpha: 0.25),
            blurRadius: 24,
            spreadRadius: 2,
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.6),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Orbital rotating sweep gradient ring
          RotationTransition(
            turns: _spinController,
            child: Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [
                    current.color.withValues(alpha: 0.0),
                    current.color.withValues(alpha: 0.8),
                  ],
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(2.5),
                child: Container(
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ),
          ),
          // Morphing animated icon
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            transitionBuilder: (child, animation) {
              return ScaleTransition(
                scale: CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOutBack,
                ),
                child: RotationTransition(
                  turns: Tween<double>(begin: -0.15, end: 0.0).animate(
                    CurvedAnimation(
                      parent: animation,
                      curve: Curves.easeOutCubic,
                    ),
                  ),
                  child: FadeTransition(
                    opacity: animation,
                    child: child,
                  ),
                ),
              );
            },
            child: Icon(
              current.icon,
              key: ValueKey<int>(_currentIndex),
              size: 34,
              color: current.color,
            ),
          ),
        ],
      ),
    );
  }
}
