import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, Layers, Share2, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";

const LandingPage = () => {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-hero overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-primary/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-40 sm:w-60 md:w-80 h-40 sm:h-60 md:h-80 bg-accent/10 rounded-full blur-[60px] sm:blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 md:px-12 lg:px-20 safe-area-padding">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-4 sm:w-5 h-4 sm:h-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground">Connect<span className="text-gradient-primary">HUB</span></span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <Button variant="ghost" asChild size="sm" className="min-h-[44px] px-3 sm:px-4">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="hero" size="sm" asChild className="min-h-[44px] px-3 sm:px-4">
            <Link to="/auth?mode=signup">
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
            </Link>
          </Button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-12 md:pt-16 pb-16 sm:pb-20 md:pb-24 md:px-12 lg:px-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 text-xs sm:text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
              ✨ The Future of Digital Networking
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight mb-4 sm:mb-6"
          >
            Share Your Digital Identity
            <br />
            <span className="text-gradient-primary">With a Single Scan</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 px-2"
          >
            Create structured digital profiles, organize your content into categories, 
            and share selected items instantly through dynamic QR codes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col items-center gap-4 sm:gap-6"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
              <Button variant="hero" size="lg" asChild className="w-full sm:w-auto min-h-[48px] sm:min-h-[56px]">
                <Link to="/auth?mode=signup">
                  Create Your Profile
                  <Zap className="w-4 sm:w-5 h-4 sm:h-5 ml-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" asChild className="w-full sm:w-auto min-h-[48px] sm:min-h-[56px]">
                <Link to="/demo">
                  View Demo
                </Link>
              </Button>
            </div>
            
            {/* Language Toggle - Below buttons */}
            <div className="relative z-20">
              <LanguageToggle inline />
            </div>
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-4xl mx-auto mt-8 sm:mt-12 md:mt-16"
        >
          <div className="relative glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-elevated">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="relative grid md:grid-cols-3 gap-4 sm:gap-6">
              {/* Profile Preview */}
              <div className="md:col-span-2 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base">
                    JD
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">John Doe</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Digital Creator</p>
                  </div>
                </div>
                
                {/* Sample Categories */}
                <div className="space-y-2 sm:space-y-3">
                  <CategoryPreview title="Social Links" items={["Twitter", "LinkedIn", "Instagram"]} />
                  <CategoryPreview title="Portfolio" items={["Website", "Behance", "Dribbble"]} />
                  <CategoryPreview title="Contact" items={["Email", "Phone"]} />
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="flex items-center justify-center mt-4 md:mt-0">
                <div className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-foreground shadow-elevated animate-float">
                  <div className="w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 bg-background rounded-md sm:rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 text-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20 md:py-24 md:px-12 lg:px-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Everything You Need to
              <span className="text-gradient-primary"> Connect</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
              A complete platform for creating, organizing, and sharing your digital presence.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon={<Layers className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Organize by Categories"
              description="Create custom categories to structure your content. From social links to portfolios, organize everything your way."
              delay={0.1}
            />
            <FeatureCard
              icon={<QrCode className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Dynamic QR Codes"
              description="Generate unique QR codes for any selection of items. Each scan reveals exactly what you want to share."
              delay={0.2}
            />
            <FeatureCard
              icon={<Share2 className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Selective Sharing"
              description="Choose what to share for each QR code. Full control over your digital identity in every interaction."
              delay={0.3}
            />
            <FeatureCard
              icon={<Globe className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Public Profiles"
              description="Anyone can view your shared content without needing to sign up. Seamless access for everyone."
              delay={0.4}
            />
            <FeatureCard
              icon={<Zap className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Instant Generation"
              description="Create and share QR codes in seconds. No waiting, no complexity—just instant digital networking."
              delay={0.5}
            />
            <FeatureCard
              icon={<Shield className="w-5 sm:w-6 h-5 sm:h-6" />}
              title="Privacy First"
              description="Only share what you choose. Your private data stays private until you decide to share it."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-20 md:py-24 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Transform Your Networking?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2">
            Join thousands of professionals who have replaced business cards with smart, dynamic digital profiles.
          </p>
          <Button variant="hero" size="lg" asChild className="min-h-[48px] sm:min-h-[56px]">
            <Link to="/auth?mode=signup">
              Start Free Today
              <Zap className="w-4 sm:w-5 h-4 sm:h-5 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 border-t border-border/50 safe-area-padding bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">ConnectHUB</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Share your digital identity with a single scan. The future of professional networking.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/auth?mode=signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/demo" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    View Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/code-of-conduct" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Code of Conduct
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Contact</h4>
              <ul className="space-y-2">
                <li className="text-sm text-muted-foreground">
                  support@connecthub.app
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              © {new Date().getFullYear()} ConnectHUB. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms-conditions" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/code-of-conduct" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Conduct
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const CategoryPreview = ({ title, items }: { title: string; items: string[] }) => (
  <div className="p-3 sm:p-4 rounded-lg bg-secondary/50 border border-border/30">
    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">{title}</h4>
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {items.map((item) => (
        <span key={item} className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm rounded-full bg-primary/10 text-primary border border-primary/20">
          {item}
        </span>
      ))}
    </div>
  </div>
);

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="p-4 sm:p-6 rounded-xl bg-gradient-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow group"
  >
    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-semibold text-base sm:text-lg mb-1.5 sm:mb-2 text-foreground">{title}</h3>
    <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
  </motion.div>
);

export default LandingPage;
