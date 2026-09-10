import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 md:px-12 lg:px-20">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-4 sm:w-5 h-4 sm:h-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground">Connect<span className="text-gradient-primary">HUB</span></span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </nav>

      {/* Content */}
      <main className="relative z-10 px-4 sm:px-6 py-8 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            App: <strong>ConnectHUB</strong> (<code>in.connecthub.app</code>) | Developer: <strong>SreeSri</strong> | Last Updated: September 2026
          </p>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              This Privacy Policy applies to the <strong>ConnectHUB</strong> application (web and Android <code>in.connecthub.app</code>), 
              developed and operated by <strong>SreeSri</strong>.
            </p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, including your name, email address, 
                and any content you choose to share through your digital profile. We also automatically 
                collect certain information when you use our services, such as IP address, browser type, 
                and usage data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Create and manage your account</li>
                <li>Generate QR codes and digital profiles</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Protect against fraudulent or illegal activity and enforce child safety standards</li>
              </ul>
            </section>

            {/* Children's Privacy & Safety */}
            <section className="space-y-4 p-4 rounded-xl bg-card border border-primary/20">
              <h2 className="text-xl font-semibold text-foreground">3. Children's Privacy & Child Safety Standards (CSAE)</h2>
              <p className="text-muted-foreground leading-relaxed">
                ConnectHUB is committed to protecting minors. We do not knowingly market to or collect personal information 
                from children under 13 without appropriate parental consent in accordance with COPPA and applicable child protection laws.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We enforce an absolute zero-tolerance standard against <strong>Child Sexual Abuse and Exploitation (CSAE)</strong> 
                and <strong>Child Sexual Abuse Material (CSAM)</strong>. We actively cooperate with child protection organizations 
                including the <strong>National Center for Missing & Exploited Children (NCMEC)</strong> and law enforcement.
                For full details, please review our <Link to="/child-safety" className="text-primary underline font-medium">Child Safety Standards & CSAE Policy</Link>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as required by law, in response to legal processes, or to report CSAM/CSAE 
                to official authorities (NCMEC/law enforcement). Information you choose to make public through your QR codes 
                will be accessible to anyone who scans them.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. However, 
                no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, correct, or delete your personal information. You can 
                manage your data through your account settings or by contacting us directly.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage 
                patterns, and deliver personalized content. You can manage cookie preferences through 
                your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">8. Contact Us & Child Safety Point of Contact</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy: <a href="mailto:privacy@connecthub.app" className="text-primary underline">privacy@connecthub.app</a><br />
                Child Safety / CSAE Point of Contact: <a href="mailto:sreeconnect360@gmail.com" className="text-primary underline font-medium">sreeconnect360@gmail.com</a>
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/30 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ConnectHUB by SreeSri. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/code-of-conduct" className="hover:text-primary transition-colors">Code of Conduct</Link>
          <Link to="/child-safety" className="hover:text-primary transition-colors">Child Safety Standards</Link>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
