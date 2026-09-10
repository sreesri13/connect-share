import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsConditions = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground mb-8">
            App: <strong>ConnectHUB</strong> (<code>in.connecthub.app</code>) | Developer: <strong>SreeSri</strong> | Last Updated: September 2026
          </p>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using <strong>ConnectHUB</strong>, provided and operated by <strong>SreeSri</strong>, 
                you agree to be bound by these Terms & Conditions, our Privacy Policy, and our Child Safety Standards. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground">
                ConnectHUB provides a platform for creating digital profiles and generating QR codes 
                for sharing your content. We reserve the right to modify, suspend, or discontinue 
                any aspect of our service at any time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials 
                and for all activities that occur under your account. You must provide accurate and 
                complete information when creating an account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of content you create on ConnectHUB. By posting content, you 
                grant us a non-exclusive license to display and distribute your content through our 
                platform. You are solely responsible for the content you share.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Prohibited Activities & Zero Tolerance for CSAE</h2>
              <p className="text-muted-foreground">You agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li className="text-red-400 font-medium">
                  Create, upload, link to, distribute, or facilitate Child Sexual Abuse Material (CSAM) or any form of Child Sexual Abuse and Exploitation (CSAE). We enforce an absolute zero-tolerance policy; any violation results in immediate account ban, data preservation, and reporting to the National Center for Missing & Exploited Children (NCMEC) and law enforcement.
                </li>
                <li>Groom, harass, exploit, or endanger minors in any form.</li>
                <li>Violate any applicable local, state, national, or international laws or regulations.</li>
                <li>Infringe on intellectual property rights or trade secrets.</li>
                <li>Attempt to gain unauthorized access to our systems or other user accounts.</li>
                <li>Interfere with or disrupt the stability or security of our services.</li>
                <li>Use automated bots or scrapers to access our platform without explicit authorization.</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                For detailed policy enforcement protocols, please review our <Link to="/child-safety" className="text-primary underline font-medium">Child Safety Standards</Link>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The ConnectHUB name, logo, and all related marks are trademarks of SreeSri. All software, 
                design, and content on our platform (excluding user content) is our property and 
                protected by intellectual property laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                ConnectHUB is provided "as is" without warranties of any kind. We are not liable 
                for any indirect, incidental, or consequential damages arising from your use of 
                our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">8. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend your account at any time for violations 
                of these terms or for any other reason at our discretion. Upon termination, your 
                right to use our services will immediately cease.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms & Conditions from time to time. We will notify you of 
                significant changes. Continued use of our services after changes constitutes 
                acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">10. Contact & Point of Contact</h2>
              <p className="text-muted-foreground">
                For legal inquiries: <a href="mailto:legal@connecthub.app" className="text-primary underline">legal@connecthub.app</a><br />
                For Child Safety / CSAE concerns: <a href="mailto:sreeconnect360@gmail.com" className="text-primary underline font-medium">sreeconnect360@gmail.com</a>
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/30 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ConnectHUB by SreeSri. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms-conditions" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/code-of-conduct" className="hover:text-primary transition-colors">Code of Conduct</Link>
          <Link to="/child-safety" className="hover:text-primary transition-colors">Child Safety Standards</Link>
        </div>
      </footer>
    </div>
  );
};

export default TermsConditions;
