import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, Layers, Share2, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Connect<span className="text-gradient-primary">HUB</span></span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="hero" size="default" asChild>
            <Link to="/auth?mode=signup">Get Started</Link>
          </Button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-24 md:px-12 lg:px-20 md:pt-24">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <span className="inline-block px-4 py-2 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
              ✨ The Future of Digital Networking
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
          >
            Share Your Digital Identity
            <br />
            <span className="text-gradient-primary">With a Single Scan</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10"
          >
            Create structured digital profiles, organize your content into categories, 
            and share selected items instantly through dynamic QR codes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">
                Create Your Profile
                <Zap className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/demo">
                View Demo
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-4xl mx-auto mt-16"
        >
          <div className="relative glass-strong rounded-2xl p-8 shadow-elevated">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="relative grid md:grid-cols-3 gap-6">
              {/* Profile Preview */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    JD
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">John Doe</h3>
                    <p className="text-sm text-muted-foreground">Digital Creator</p>
                  </div>
                </div>
                
                {/* Sample Categories */}
                <div className="space-y-3">
                  <CategoryPreview title="Social Links" items={["Twitter", "LinkedIn", "Instagram"]} />
                  <CategoryPreview title="Portfolio" items={["Website", "Behance", "Dribbble"]} />
                  <CategoryPreview title="Contact" items={["Email", "Phone"]} />
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="flex items-center justify-center">
                <div className="p-6 rounded-xl bg-foreground shadow-elevated animate-float">
                  <div className="w-32 h-32 bg-background rounded-lg flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to
              <span className="text-gradient-primary"> Connect</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform for creating, organizing, and sharing your digital presence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Organize by Categories"
              description="Create custom categories to structure your content. From social links to portfolios, organize everything your way."
              delay={0.1}
            />
            <FeatureCard
              icon={<QrCode className="w-6 h-6" />}
              title="Dynamic QR Codes"
              description="Generate unique QR codes for any selection of items. Each scan reveals exactly what you want to share."
              delay={0.2}
            />
            <FeatureCard
              icon={<Share2 className="w-6 h-6" />}
              title="Selective Sharing"
              description="Choose what to share for each QR code. Full control over your digital identity in every interaction."
              delay={0.3}
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Public Profiles"
              description="Anyone can view your shared content without needing to sign up. Seamless access for everyone."
              delay={0.4}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant Generation"
              description="Create and share QR codes in seconds. No waiting, no complexity—just instant digital networking."
              delay={0.5}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy First"
              description="Only share what you choose. Your private data stays private until you decide to share it."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center glass-strong rounded-3xl p-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Networking?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of professionals who have replaced business cards with smart, dynamic digital profiles.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/auth?mode=signup">
              Start Free Today
              <Zap className="w-5 h-5 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">ConnectHUB</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ConnectHUB. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const CategoryPreview = ({ title, items }: { title: string; items: string[] }) => (
  <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
    <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20">
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
    className="p-6 rounded-xl bg-gradient-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow group"
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-semibold text-lg mb-2 text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </motion.div>
);

export default LandingPage;
