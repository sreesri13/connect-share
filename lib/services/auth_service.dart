import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  User? get currentUser => _supabase.auth.currentUser;
  Session? get currentSession => _supabase.auth.currentSession;
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  bool get isAuthenticated => currentUser != null;

  /// Sign Up with Email and Password
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final response = await _supabase.auth.signUp(
      email: email.trim(),
      password: password,
      data: {
        if (displayName != null && displayName.trim().isNotEmpty)
          'display_name': displayName.trim(),
      },
    );

    // If display name was provided, ensure profile record is created/updated
    if (response.user != null && displayName != null) {
      try {
        await _supabase.from('profiles').upsert({
          'user_id': response.user!.id,
          'display_name': displayName.trim(),
        });
      } catch (_) {}
    }

    return response;
  }

  /// Sign In with Email and Password
  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    return await _supabase.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  /// Native In-App Google Sign-In
  Future<AuthResponse> signInWithGoogle() async {
    try {
      // 1. Trigger native Google account selection on Android
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw const AuthException('Google Sign-In was cancelled by user');
      }

      // 2. Obtain authentication credentials (ID Token & Access Token)
      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      final accessToken = googleAuth.accessToken;

      if (idToken == null) {
        throw const AuthException('Failed to obtain Google ID Token');
      }

      // 3. Authenticate with Supabase via ID token exchange
      final authResponse = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      // 4. Update display name / avatar in profile if available
      if (authResponse.user != null) {
        try {
          final displayName = googleUser.displayName;
          final avatarUrl = googleUser.photoUrl;
          await _supabase.from('profiles').upsert({
            'user_id': authResponse.user!.id,
            if (displayName != null) 'display_name': displayName,
            if (avatarUrl != null) 'avatar_url': avatarUrl,
          });
        } catch (_) {}
      }

      return authResponse;
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException(e.toString());
    }
  }

  /// Sign Out
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    await _supabase.auth.signOut();
  }

  /// Update User Password
  Future<UserResponse> updatePassword(String newPassword) async {
    return await _supabase.auth.updateUser(
      UserAttributes(password: newPassword),
    );
  }
}
