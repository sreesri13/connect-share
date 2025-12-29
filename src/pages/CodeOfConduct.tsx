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
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-foreground">Code of Conduct</h1>
          
          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              ConnectHUB is committed to providing a welcoming and inclusive experience for all users. 
              This Code of Conduct outlines our expectations for user behavior and content.
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
                <li>Sexually explicit or pornographic</li>
                <li>Violent, threatening, or promotes harm</li>
                <li>Misleading, fraudulent, or deceptive</li>
                <li>Infringing on intellectual property rights</li>
                <li>Spam, malware, or phishing attempts</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Professional Use</h2>
              <p className="text-muted-foreground">
                When using ConnectHUB for professional networking, maintain professional standards. 
                Misrepresenting your identity, credentials, or affiliations is prohibited.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Privacy and Consent</h2>
              <p className="text-muted-foreground">
                Respect others' privacy. Do not share personal information of others without their 
                consent. Do not collect or harvest data from other users' profiles.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Reporting Violations</h2>
              <p className="text-muted-foreground">
                If you encounter content or behavior that violates this Code of Conduct, please report 
                it to us at conduct@connecthub.app. We will investigate all reports and take appropriate 
                action.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Consequences</h2>
              <p className="text-muted-foreground">
                Violations of this Code of Conduct may result in warnings, temporary suspension, or 
                permanent termination of your account, depending on the severity of the violation.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CodeOfConduct;
