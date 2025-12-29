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
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-foreground">Terms & Conditions</h1>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: December 2024</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using ConnectHUB, you agree to be bound by these Terms & Conditions 
                and our Privacy Policy. If you do not agree to these terms, please do not use our services.
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
              <h2 className="text-xl font-semibold text-foreground">5. Prohibited Activities</h2>
              <p className="text-muted-foreground">You agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt our services</li>
                <li>Use automated systems to access our platform without permission</li>
                <li>Create multiple accounts for abusive purposes</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The ConnectHUB name, logo, and all related marks are our trademarks. All software, 
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
              <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms & Conditions, please contact us at legal@connecthub.app.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsConditions;
