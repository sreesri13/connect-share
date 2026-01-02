import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPWA } from "@/components/InstallPWA";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import QRGenerator from "./pages/QRGenerator";
import QRCodesList from "./pages/QRCodesList";
import PublicProfile from "./pages/PublicProfile";
import SettingsPage from "./pages/SettingsPage";
import DemoPage from "./pages/DemoPage";
import NotFound from "./pages/NotFound";
import PaymentRedirect from "./pages/PaymentRedirect";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CodeOfConduct from "./pages/CodeOfConduct";
import TermsConditions from "./pages/TermsConditions";
import BusinessPage from "./pages/BusinessPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <InstallPWA />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/qr" element={<QRGenerator />} />
              <Route path="/qr-list" element={<QRCodesList />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/p/:profileId" element={<PublicProfile />} />
              <Route path="/pay" element={<PaymentRedirect />} />
              <Route path="/business/:publicId" element={<BusinessPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/code-of-conduct" element={<CodeOfConduct />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
