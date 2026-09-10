import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CodeOfConduct = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Code of Conduct</h1>
          <p className="text-sm text-muted-foreground mb-8">
            App: <strong>ConnectHUB</strong> (<code>in.connecthub.app</code>) | Developer: <strong>SreeSri</strong> | Last Updated: September 2026
          </p>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              <strong>ConnectHUB</strong>, developed by <strong>SreeSri</strong>, is committed to providing a secure, 
              welcoming, and inclusive experience for all users. This Code of Conduct outlines our strict expectations 
              for user behavior and content.
            </p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Respectful Behavior</h2>
              <p className="text-muted-foreground">
                Treat all users with respect and dignity. Harassment, discrimination, or hate speech 
                based on race, gender, sexual orientation, religion, nationality, disability, or any 
                other characteristic will not be tolerated.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Appropriate Content</h2>
              <p className="text-muted-foreground">Do not share content that is:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Illegal or promotes illegal activities</li>
                <li>Sexually explicit, pornographic, or non-consensual</li>
                <li>Violent, threatening, or promotes harm or self-harm</li>
                <li>Misleading, fraudulent, or deceptive</li>
                <li>Infringing on intellectual property rights</li>
                <li>Spam, malware, or phishing attempts</li>
              </ul>
            </section>

            {/* Prominent CSAE Section */}
            <section className="space-y-4 p-4 rounded-xl bg-red-950/20 border border-red-500/30">
              <h2 className="text-xl font-semibold text-red-400">3. Zero Tolerance for Child Sexual Abuse & Exploitation (CSAE)</h2>
              <p className="text-muted-foreground leading-relaxed">
                ConnectHUB and developer SreeSri maintain an uncompromising <strong>zero-tolerance policy</strong> against 
                <strong>Child Sexual Abuse and Exploitation (CSAE)</strong> and <strong>Child Sexual Abuse Material (CSAM)</strong>. 
                Any content depicting, facilitating, or encouraging child sexual abuse, sexualization of minors, child grooming, or 
                endangerment is strictly prohibited.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Violators will face immediate and permanent termination of their account, device/IP banning, and immediate referral 
                to legal authorities, including the <strong>National Center for Missing & Exploited Children (NCMEC)</strong> and law enforcement.
                For our full policy and protocols, see our dedicated <Link to="/child-safety" className="text-primary underline font-medium">Child Safety Standards</Link>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Professional Use</h2>
              <p className="text-muted-foreground">
                When using ConnectHUB for professional networking, maintain professional standards. 
                Misrepresenting your identity, credentials, or affiliations is prohibited.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Privacy and Consent</h2>
              <p className="text-muted-foreground">
                Respect others' privacy. Do not share personal information of others without their 
                consent. Do not collect or harvest data from other users' profiles.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Reporting Violations & Child Safety Point of Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you encounter content or behavior that violates this Code of Conduct, use the in-app <strong>Report</strong> button 
                or contact us immediately:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>General Conduct Reports:</strong> <a href="mailto:conduct@connecthub.app" className="text-primary underline">conduct@connecthub.app</a></li>
                <li><strong>Emergency Child Safety / CSAE Reports:</strong> <a href="mailto:sreeconnect360@gmail.com" className="text-primary underline font-medium">sreeconnect360@gmail.com</a></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                All reports are investigated promptly and treated with utmost urgency.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Consequences</h2>
              <p className="text-muted-foreground">
                Violations of this Code of Conduct may result in warnings, temporary suspension, or 
                permanent termination of your account, depending on the severity of the violation. Severe violations involving 
                child endangerment or illegal activities result in immediate permanent expulsion and reporting to authorities.
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
          <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/code-of-conduct" className="text-primary hover:underline">Code of Conduct</Link>
          <Link to="/child-safety" className="hover:text-primary transition-colors">Child Safety Standards</Link>
        </div>
      </footer>
    </div>
  );
};

export default CodeOfConduct;
