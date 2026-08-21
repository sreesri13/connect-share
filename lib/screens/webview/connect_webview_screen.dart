import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
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

  double _loadingProgress = 0.0;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  bool _isOffline = false;
  bool _showReconnectedBanner = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  DateTime? _lastBackPressTime;
  final WebViewAuthBridge _authBridge = WebViewAuthBridge();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _initHighRefreshRate();
    _initConnectivity();
    _initPullToRefresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _connectivitySubscription?.cancel();
    super.dispose();
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

  /// Set up network connectivity listener
  void _initConnectivity() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOfflineNow = results.contains(ConnectivityResult.none) || results.isEmpty;
      if (isOfflineNow != _isOffline) {
        setState(() {
          if (!isOfflineNow && _isOffline) {
            // Transitioned from offline to online
            _showReconnectedBanner = true;
            Timer(const Duration(seconds: 3), () {
              if (mounted) {
                setState(() {
                  _showReconnectedBanner = false;
                });
              }
            });
            // Auto reload when reconnected to refresh stale cache
            if (_hasError) {
              _reloadWebView();
            }
          }
          _isOffline = isOfflineNow;
        });
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

  String _getTargetUrl() {
    final base = AppConfig.productionWebsiteUrl;
    if (widget.initialRoute != null && widget.initialRoute!.isNotEmpty) {
      if (widget.initialRoute!.startsWith('/')) {
        return '$base${widget.initialRoute}';
      }
      return '$base/${widget.initialRoute}';
    }
    return base;
  }

  /// Native Google Sign In flow with Supabase session injection
  Future<void> _handleGoogleSignIn() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    scaffoldMessenger.showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            SizedBox(width: 12),
            Text('Signing in with Google...'),
          ],
        ),
        duration: Duration(seconds: 4),
        backgroundColor: Color(0xFF1E293B),
      ),
    );

    final success = await _authBridge.handleNativeGoogleSignIn(_webViewController);
    if (!success && mounted) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Google sign-in was cancelled or encountered an error.'),
          backgroundColor: Color(0xFFEF4444),
          duration: Duration(seconds: 3),
        ),
      );
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

  /// Android Back Navigation handling
  Future<void> _handleBackPress() async {
    if (_webViewController != null) {
      final canGoBack = await _webViewController!.canGoBack();
      if (canGoBack) {
        await _webViewController!.goBack();
        return;
      }
    }

    final now = DateTime.now();
    if (_lastBackPressTime == null ||
        now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
      _lastBackPressTime = now;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Press back again to exit ConnectHUB'),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF1E293B).withValues(alpha: 0.95),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
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
              return Stack(
                children: [
                  // Main WebView
                  if (!_hasError)
                    InAppWebView(
                      initialUrlRequest: URLRequest(
                        url: WebUri(_getTargetUrl()),
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
                          handlerName: 'logout',
                          callback: (args) => _authBridge.handleSignOut(controller),
                        );
                        controller.addJavaScriptHandler(
                          handlerName: 'nativeShare',
                          callback: (args) => _handleShare(args),
                        );

                        // Pre-restore session if available
                        _authBridge.restoreSavedSession(controller);
                      },
                      onLoadStart: (controller, url) {
                        setState(() {
                          _isLoading = true;
                          _hasError = false;
                        });
                        // Inject interceptor early
                        controller.evaluateJavascript(
                          source: WebViewAuthBridge.getAuthInterceptorScript(),
                        );
                      },
                      onLoadStop: (controller, url) async {
                        _pullToRefreshController?.endRefreshing();
                        setState(() {
                          _isLoading = false;
                        });

                        // Inject Google Auth Interceptor script
                        await controller.evaluateJavascript(
                          source: WebViewAuthBridge.getAuthInterceptorScript(),
                        );

                        // Synchronize signout state if navigated to root or auth
                        final urlStr = url?.toString() ?? '';
                        if (urlStr.endsWith('/auth') || urlStr == AppConfig.productionWebsiteUrl || urlStr == '${AppConfig.productionWebsiteUrl}/') {
                          // Check if token exists in localStorage
                          final tokenCheck = await controller.evaluateJavascript(
                            source: "localStorage.getItem('sb-${AppConfig.supabaseProjectId}-auth-token')",
                          );
                          if (tokenCheck == null || tokenCheck == 'null' || tokenCheck.toString().isEmpty) {
                            // User is logged out on web
                          }
                        }
                      },
                      onProgressChanged: (controller, progress) {
                        if (progress == 100) {
                          _pullToRefreshController?.endRefreshing();
                        }
                        setState(() {
                          _loadingProgress = progress / 100;
                        });
                      },
                      onReceivedError: (controller, request, error) {
                        _pullToRefreshController?.endRefreshing();
                        // Only trigger full error screen if it's the main frame request
                        if (request.isForMainFrame ?? true) {
                          if (_isOffline) {
                            // Suppress full error screen if offline cache is loading or network will recover
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

                        final urlString = uri.toString();

                        // 1. Intercept Supabase Google OAuth Authorization
                        if (urlString.contains('supabase.co/auth/v1/authorize') &&
                            urlString.contains('provider=google')) {
                          _handleGoogleSignIn();
                          return NavigationActionPolicy.CANCEL;
                        }

                        // 2. Intercept Google Account URLs
                        if (urlString.contains('accounts.google.com/o/oauth2')) {
                          _handleGoogleSignIn();
                          return NavigationActionPolicy.CANCEL;
                        }

                        // 3. Handle external non-http URI schemes
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

                        // 4. Handle internal web routes
                        final host = uri.host.toLowerCase();
                        if (host.contains('connect-hub-gamma.vercel.app') ||
                            host.contains('connecthub.app') ||
                            host.contains('supabase.co')) {
                          return NavigationActionPolicy.ALLOW;
                        }

                        // 5. Open external links in default external browser
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                          return NavigationActionPolicy.CANCEL;
                        }

                        return NavigationActionPolicy.ALLOW;
                      },
                      onPermissionRequest: (controller, permissionRequest) async {
                        // Request camera / microphone / storage permissions when web page requests them
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

                  // Top Progress Bar
                  if (_isLoading && _loadingProgress < 1.0 && !_hasError)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: LinearProgressIndicator(
                        value: _loadingProgress > 0 ? _loadingProgress : null,
                        backgroundColor: Colors.transparent,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFF8B5CF6),
                        ),
                        minHeight: 2.5,
                      ),
                    ),

                  // Offline Status Pill Banner
                  if (_isOffline)
                    Positioned(
                      top: 12,
                      left: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.95),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.wifi_off_rounded,
                              color: Color(0xFFF59E0B),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                'You are currently offline • Viewing cached data',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.refresh, color: Colors.white70, size: 18),
                              onPressed: _reloadWebView,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Reconnected Status Banner
                  if (_showReconnectedBanner && !_isOffline)
                    Positioned(
                      top: 12,
                      left: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF065F46).withValues(alpha: 0.95),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF10B981).withValues(alpha: 0.5),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.wifi_rounded,
                              color: Color(0xFF10B981),
                              size: 20,
                            ),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Connection restored • Syncing latest data...',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
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
