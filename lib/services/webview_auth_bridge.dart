import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';

class AuthBridgeResult {
  final bool success;
  final bool cancelled;
  final String? errorMessage;

  AuthBridgeResult({
    required this.success,
    this.cancelled = false,
    this.errorMessage,
  });
}

class WebViewAuthBridge {
  static final WebViewAuthBridge _instance = WebViewAuthBridge._internal();
  factory WebViewAuthBridge() => _instance;
  WebViewAuthBridge._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: AppConfig.webClientId.isNotEmpty ? AppConfig.webClientId : null,
    scopes: ['email', 'profile'],
  );

  static const String _sessionPrefKey = 'connecthub_saved_session';

  /// Check if user is currently signed in (via Supabase or saved session)
  Future<bool> hasSavedSession() async {
    if (_supabase.auth.currentSession != null) return true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_sessionPrefKey);
      return saved != null && saved.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Get JavaScript code to inject into the web page to intercept Google Auth button
  static String getAuthInterceptorScript() {
    return """
    (function() {
      if (window._connectHubBridgeInitialized) return;
      window._connectHubBridgeInitialized = true;

      // Function to attach listener to Google buttons
      function hookGoogleButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
          if (button.innerText && button.innerText.includes('Continue with Google') && !button._hasGoogleHook) {
            button._hasGoogleHook = true;
            button.addEventListener('click', function(e) {
              if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                e.preventDefault();
                e.stopPropagation();
                window.flutter_inappwebview.callHandler('googleSignIn');
              }
            }, true);
          }
        });
      }

      // Hook immediately and observe DOM changes
      hookGoogleButtons();
      const observer = new MutationObserver(function() {
        hookGoogleButtons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    })();
    """;
  }

  /// Perform native in-app Google Sign-In and inject the authenticated session into WebView
  Future<AuthBridgeResult> handleNativeGoogleSignIn(InAppWebViewController? controller) async {
    try {
      if (kDebugMode) {
        print('[WebViewAuthBridge] Clearing cached session & starting native Google Sign-In...');
      }

      // Ensure previous cached/stale account state is cleared so account chooser always displays
      try {
        await _googleSignIn.signOut();
      } catch (_) {}

      // 1. Native Google account picker
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        if (kDebugMode) {
          print('[WebViewAuthBridge] Google Sign-In cancelled by user');
        }
        return AuthBridgeResult(success: false, cancelled: true);
      }

      // 2. Obtain auth credentials
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;
      final String? accessToken = googleAuth.accessToken;

      if (idToken == null) {
        throw Exception('Failed to obtain Google ID Token. Please verify serverClientId in Google Cloud Console.');
      }

      // 3. Authenticate with Supabase via ID token exchange
      final AuthResponse authResponse = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      final Session? session = authResponse.session;
      if (session == null) {
        throw Exception('Supabase authentication returned no session');
      }

      // 4. Update profile if needed
      if (authResponse.user != null) {
        try {
          await _supabase.from('profiles').upsert({
            'user_id': authResponse.user!.id,
            if (googleUser.displayName != null) 'display_name': googleUser.displayName,
            if (googleUser.photoUrl != null) 'avatar_url': googleUser.photoUrl,
          });
        } catch (_) {}
      }

      // 5. Serialize session data for localStorage injection
      final sessionMap = {
        'access_token': session.accessToken,
        'token_type': session.tokenType,
        'expires_in': session.expiresIn,
        'expires_at': session.expiresAt,
        'refresh_token': session.refreshToken,
        'user': session.user.toJson(),
      };
      final String sessionJson = jsonEncode(sessionMap);

      // Save to SharedPreferences for offline/cold-start recovery
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_sessionPrefKey, sessionJson);

      // 6. Inject authenticated session directly into the WebView's localStorage
      if (controller != null) {
        await injectSessionIntoWebView(controller, sessionJson, navigateToDashboard: true);
      }

      if (kDebugMode) {
        print('[WebViewAuthBridge] Native Google Sign-In succeeded & injected into WebView');
      }

      return AuthBridgeResult(success: true);
    } on PlatformException catch (e) {
      final msg = 'Google Sign-In Error (${e.code}): ${e.message ?? 'Check Google Cloud SHA-1 & OAuth Consent'}';
      if (kDebugMode) {
        print('[WebViewAuthBridge] PlatformException: $msg');
      }
      return AuthBridgeResult(success: false, errorMessage: msg);
    } catch (e) {
      final msg = 'Google Sign-In Error: $e';
      if (kDebugMode) {
        print('[WebViewAuthBridge] $msg');
      }
      return AuthBridgeResult(success: false, errorMessage: msg);
    }
  }

  /// Inject session JSON into WebView's localStorage and update state
  Future<void> injectSessionIntoWebView(
    InAppWebViewController controller,
    String sessionJson, {
    bool navigateToDashboard = false,
  }) async {
    try {
      final jsCode = """
      (function() {
        try {
          const sessionData = $sessionJson;
          const key = 'sb-${AppConfig.supabaseProjectId}-auth-token';
          localStorage.setItem(key, JSON.stringify(sessionData));
          localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
          
          window.dispatchEvent(new Event('storage'));
          
          ${navigateToDashboard ? "window.location.href = '${AppConfig.productionWebsiteUrl}/dashboard';" : ""}
        } catch(e) {
          console.error('[WebViewAuthBridge] Injection error:', e);
        }
      })();
      """;
      await controller.evaluateJavascript(source: jsCode);
    } catch (e) {
      if (kDebugMode) {
        print('[WebViewAuthBridge] Failed to inject session: $e');
      }
    }
  }

  /// Restore saved session to WebView on page load / cold start
  Future<void> restoreSavedSession(InAppWebViewController controller) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedSession = prefs.getString(_sessionPrefKey);
      if (savedSession != null && savedSession.isNotEmpty) {
        await injectSessionIntoWebView(controller, savedSession, navigateToDashboard: false);
      }
    } catch (e) {
      if (kDebugMode) {
        print('[WebViewAuthBridge] Restore session error: $e');
      }
    }
  }

  /// Synchronize sign out across Flutter, GoogleSignIn, and WebView
  Future<void> handleSignOut(InAppWebViewController? controller) async {
    try {
      try {
        await _googleSignIn.signOut();
      } catch (_) {}
      
      try {
        await _supabase.auth.signOut();
      } catch (_) {}

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_sessionPrefKey);

      if (controller != null) {
        final jsCode = """
        (function() {
          try {
            const key = 'sb-${AppConfig.supabaseProjectId}-auth-token';
            localStorage.removeItem(key);
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.clear();
            window.dispatchEvent(new Event('storage'));
          } catch(e) {}
        })();
        """;
        await controller.evaluateJavascript(source: jsCode);
      }

      if (kDebugMode) {
        print('[WebViewAuthBridge] Signed out successfully');
      }
    } catch (e) {
      if (kDebugMode) {
        print('[WebViewAuthBridge] SignOut error: $e');
      }
    }
  }
}
