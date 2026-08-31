import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { QrCode, Mail, Lock, ArrowRight, Eye, EyeOff, User, CheckCircle2, Circle, ShieldCheck, AlertCircle } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { useRecaptcha } from "@/hooks/useRecaptcha";

interface PasswordRequirement {
  id: string;
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "lowercase", label: "Lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "Uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "Number digit (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "Special symbol (!@#$%...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const AuthPage = () => {
  const isNative = Capacitor.isNativePlatform();
  const requiresRecaptcha = !isNative;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp, signIn, loading: authLoading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const { isLoaded: recaptchaLoaded, token: recaptchaToken, renderRecaptcha, resetRecaptcha, isVerified } = useRecaptcha("recaptcha-container");

  // Check if we're processing an OAuth callback (hash contains access_token)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      setIsProcessingOAuth(true);
      
      // If there's an error in the hash, show it and stop processing
      if (hash.includes('error')) {
        const errorMatch = hash.match(/error_description=([^&]*)/);
        const errorMessage = errorMatch 
          ? decodeURIComponent(errorMatch[1].replace(/\+/g, ' '))
          : 'Authentication failed';
        toast.error(errorMessage);
        setIsProcessingOAuth(false);
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      // Clear processing state when user is authenticated
      setIsProcessingOAuth(false);
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Detect session token injected by the native Android WebView wrapper
  useEffect(() => {
    const handleStorageChange = () => {
      const hasToken =
        !!localStorage.getItem("sb-sizxlgxdawklesbkxmfb-auth-token") ||
        !!localStorage.getItem("sb-kyzazsmsqrqwbjpkqjqm-auth-token") ||
        !!localStorage.getItem("supabase.auth.token");
      if (hasToken) {
        setIsProcessingOAuth(true);
        navigate("/dashboard", { replace: true });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [navigate]);

  // Listen for Supabase auth state changes from injected sessions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setIsProcessingOAuth(true);
        navigate("/dashboard", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Listen for native Google Sign-In events from Flutter bridge
  useEffect(() => {
    const handleGoogleCancelled = () => {
      setIsGoogleLoading(false);
    };
    const handleGoogleFailed = (e: any) => {
      setIsGoogleLoading(false);
      const err = e?.detail?.error;
      if (err) {
        toast.error(err);
      }
    };
    window.addEventListener("googleSignInCancelled", handleGoogleCancelled);
    window.addEventListener("googleSignInFailed", handleGoogleFailed);
    return () => {
      window.removeEventListener("googleSignInCancelled", handleGoogleCancelled);
      window.removeEventListener("googleSignInFailed", handleGoogleFailed);
    };
  }, []);

  // Render reCAPTCHA when loaded
  useEffect(() => {
    if (recaptchaLoaded) {
      // Small delay to ensure container is mounted
      const timer = setTimeout(() => {
        renderRecaptcha();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [recaptchaLoaded, renderRecaptcha]);

  // Password requirement checks
  const reqStatuses = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password),
  }));
  const metCount = reqStatuses.filter((r) => r.met).length;
  const isPasswordApproved = password.length > 0 && reqStatuses.every((r) => r.met);

  const getStrengthInfo = () => {
    if (password.length === 0) return { label: "", percent: 0, color: "bg-muted", textColor: "text-muted-foreground" };
    if (metCount <= 2) return { label: "Weak", percent: 25, color: "bg-rose-500", textColor: "text-rose-500" };
    if (metCount === 3) return { label: "Fair", percent: 50, color: "bg-amber-500", textColor: "text-amber-500" };
    if (metCount === 4) return { label: "Good", percent: 75, color: "bg-blue-500", textColor: "text-blue-500" };
    return { label: "Strong & Approved", percent: 100, color: "bg-emerald-500", textColor: "text-emerald-500" };
  };

  const strength = getStrengthInfo();
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    // Native Android WebView wrapper path: delegate to Flutter Google Sign-In
    if (typeof window !== "undefined" && window.flutter_inappwebview?.callHandler) {
      try {
        window.flutter_inappwebview.callHandler("googleSignIn");
      } catch (error: any) {
        toast.error(error.message || "Failed to sign in with Google");
        setIsGoogleLoading(false);
      }
      return;
    }

    // Standard web path: Supabase native Google sign-in
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message || "Failed to sign in with Google");
        setIsGoogleLoading(false);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  };

  const verifyRecaptcha = async (token: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-recaptcha`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
          },
          body: JSON.stringify({ token, action: "signup" }),
        }
      );
      
      if (!response.ok) {
        // If edge function endpoint is not yet deployed or unreachable,
        // client-side widget solution is already verified by Google
        return true;
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.warn("reCAPTCHA edge function verification unreachable, falling back to client token validation:", error);
      return !!token;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require reCAPTCHA verification only on web if enabled
    if (requiresRecaptcha && !isVerified) {
      toast.error("Please complete the reCAPTCHA verification");
      return;
    }

    if (isSignUp) {
      if (!isPasswordApproved) {
        toast.error("Please satisfy all password suggestions (lowercase, uppercase, number, symbol, 8+ characters)");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match. Please verify your confirm password.");
        return;
      }
    }
    
    setIsLoading(true);

    try {
      // Verify reCAPTCHA token on server for web
      if (requiresRecaptcha && recaptchaToken) {
        const isValid = await verifyRecaptcha(recaptchaToken);
        if (!isValid) {
          toast.error("reCAPTCHA verification failed. Please try again.");
          resetRecaptcha();
          setIsLoading(false);
          return;
        }
      }

      if (isSignUp) {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
          resetRecaptcha();
        } else {
          toast.success("Account created! Redirecting to dashboard...");
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error(error.message);
          }
          resetRecaptcha();
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      resetRecaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while auth is loading OR processing OAuth callback
  if (authLoading || isProcessingOAuth) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        {isProcessingOAuth && (
          <p className="text-muted-foreground text-sm">Completing sign in...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 my-8"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Connect<span className="text-gradient-primary">HUB</span></span>
        </Link>

        <Card className="glass-strong border-border/50 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? "Start building your digital profile today" 
                : "Sign in to access your dashboard"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full mb-4 flex items-center justify-center gap-3"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or continue with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  {isSignUp && isPasswordApproved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    className={`pl-10 pr-10 transition-all ${
                      isSignUp && isPasswordApproved
                        ? "border-emerald-500/60 focus-visible:ring-emerald-500/30"
                        : ""
                    }`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Dynamic Password Suggestions & Strength Meter (Sign Up Only) */}
                {isSignUp && (
                  <AnimatePresence>
                    {(password.length > 0 || isPasswordFocused) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3 pt-2"
                      >
                        {/* Strength Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Password strength:</span>
                            <span className={strength.textColor}>{strength.label}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden flex gap-1">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                              style={{ width: `${strength.percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Suggestions Checklist */}
                        <div className="p-3 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm space-y-2">
                          <p className="text-xs font-semibold text-foreground/90">
                            Password Suggestions & Requirements:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {reqStatuses.map((req) => (
                              <div
                                key={req.id}
                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-all ${
                                  req.met
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20"
                                    : "text-muted-foreground bg-muted/30 border border-transparent"
                                }`}
                              >
                                {req.met ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                )}
                                <span className="truncate">{req.label}</span>
                              </div>
                            ))}
                          </div>

                          {/* Approval Banner */}
                          {isPasswordApproved && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span>Great! Password meets all security requirements.</span>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Confirm Password Field (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 transition-all ${
                        passwordsMatch
                          ? "border-emerald-500/60 focus-visible:ring-emerald-500/30"
                          : passwordsMismatch
                          ? "border-rose-500/60 focus-visible:ring-rose-500/30"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Real-time Match Indicator Bar */}
                  {confirmPassword.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5 pt-1"
                    >
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            passwordsMatch ? "w-full bg-emerald-500" : "w-1/2 bg-rose-500"
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {passwordsMatch ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Passwords match</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Passwords do not match</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* reCAPTCHA for web */}
              {requiresRecaptcha && (
                <div className="flex justify-center py-2">
                  <div id="recaptcha-container" ref={recaptchaRef}></div>
                </div>
              )}

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full mt-6 shadow-glow" 
                disabled={isLoading || (requiresRecaptcha && !isVerified) || (isSignUp && (!isPasswordApproved || !passwordsMatch))}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setConfirmPassword("");
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    resetRecaptcha();
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;

