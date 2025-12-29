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
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: December 2024</p>
            
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
                <li>Protect against fraudulent or illegal activity</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as required by law or to protect our rights. Information 
                you choose to make public through your QR codes will be accessible to anyone who scans them.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. However, 
                no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, correct, or delete your personal information. You can 
                manage your data through your account settings or by contacting us directly.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage 
                patterns, and deliver personalized content. You can manage cookie preferences through 
                your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at 
                privacy@connecthub.app.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
