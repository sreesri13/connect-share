import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft, ShieldAlert, Mail, AlertTriangle, CheckCircle, Scale, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChildSafetyStandards = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 md:px-12 lg:px-20 border-b border-border/20">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-4 sm:w-5 h-4 sm:h-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground">
            Connect<span className="text-gradient-primary">HUB</span>
          </span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </nav>

      {/* Content */}
      <main className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header Banner */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Safety & Compliance
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Child Safety Standards & CSAE Prevention Policy
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <strong>App Name:</strong> ConnectHUB (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">in.connecthub.app</code>) <br />
              <strong>Developer:</strong> SreeSri <br />
              <strong>Last Updated:</strong> September 10, 2026
            </p>
          </div>

          <div className="prose prose-sm sm:prose-base prose-invert max-w-none space-y-6">
            {/* Executive Statement */}
            <div className="p-4 sm:p-6 rounded-xl bg-red-950/20 border border-red-500/30 text-foreground space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                Zero Tolerance for Child Sexual Abuse & Exploitation (CSAE)
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                <strong>SreeSri</strong>, developer of <strong>ConnectHUB</strong>, maintains an absolute 
                <strong> zero-tolerance policy</strong> towards any form of <strong>Child Sexual Abuse and Exploitation (CSAE)</strong>, 
                <strong>Child Sexual Abuse Material (CSAM)</strong>, child endangerment, grooming, or exploitation. Any content or account found 
                violating these standards will be immediately removed, permanently terminated, and referred to law enforcement and child 
                protection authorities including the National Center for Missing & Exploited Children (NCMEC).
              </p>
            </div>

            {/* Section 1: Scope and Application */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                1. Scope and Application
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This Child Safety Standards Policy applies to all users, digital profiles, QR codes, uploaded media, files, text, 
                links, and interactions within the <strong>ConnectHUB</strong> application (accessible via web and Android app 
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">in.connecthub.app</code>) published by <strong>SreeSri</strong>.
              </p>
            </section>

            {/* Section 2: Prohibited Conduct & CSAE Definition */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                2. Explicitly Prohibited CSAE & CSAM Content
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Users are strictly prohibited from creating, uploading, sharing, hosting, linking to, or transmitting:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Child Sexual Abuse Material (CSAM):</strong> Visual depictions (photos, videos, animations, digitally generated or AI imagery) of sexually explicit conduct involving a minor.
                </li>
                <li>
                  <strong>Child Sexual Exploitation and Abuse (CSAE):</strong> Any activity that facilitates the sexual abuse, exploitation, coercion, or sextortion of individuals under the age of 18.
                </li>
                <li>
                  <strong>Child Grooming and Predatory Behavior:</strong> Any attempt to establish an emotional connection with a minor to lower their inhibitions for sexual abuse or exploitation.
                </li>
                <li>
                  <strong>Commercial Sexual Exploitation of Children (CSEC):</strong> Any content that advertises, facilitates, or encourages child trafficking, child prostitution, or commercial sexual acts involving minors.
                </li>
                <li>
                  <strong>Non-Consensual Sexual Imagery Involving Minors:</strong> Distribution, sharing, or threats to distribute sexual imagery or private media of minors.
                </li>
              </ul>
            </section>

            {/* Section 3: Enforcement & Response Protocol */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                3. Enforcement & Rapid Takedown Protocol
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To ensure compliance with Google Play Developer Program policies and all relevant child protection laws, 
                <strong>ConnectHUB</strong> enforces the following strict protocol:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mt-4">
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <h3 className="font-semibold text-foreground text-sm mb-1">Immediate Content Removal</h3>
                  <p className="text-xs text-muted-foreground">
                    Any reported or detected profile, QR code, or file associated with CSAE is disabled instantly and permanently purged.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <h3 className="font-semibold text-foreground text-sm mb-1">Permanent Account Ban</h3>
                  <p className="text-xs text-muted-foreground">
                    Perpetrator accounts, IP addresses, and identifiers are permanently revoked and barred from re-registering.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <h3 className="font-semibold text-foreground text-sm mb-1">Mandatory NCMEC Reporting</h3>
                  <p className="text-xs text-muted-foreground">
                    All incidents involving CSAM or child exploitation are reported to the National Center for Missing & Exploited Children (NCMEC) CyberTipline.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <h3 className="font-semibold text-foreground text-sm mb-1">Law Enforcement Cooperation</h3>
                  <p className="text-xs text-muted-foreground">
                    We fully cooperate with local and international law enforcement agencies in investigating and prosecuting offenders.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: In-App Reporting Mechanism */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                4. In-App Reporting Mechanism & User Feedback
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                ConnectHUB provides an accessible, built-in mechanism for users and viewers to flag content directly:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Every public profile and business page includes a direct <strong>"Report"</strong> button.</li>
                <li>Users can select <strong>"Child Sexual Abuse or Exploitation (CSAE)"</strong> as the reporting category for expedited, emergency review.</li>
                <li>Child safety reports are prioritized and investigated immediately by our designated safety team.</li>
              </ul>
            </section>

            {/* Section 5: Child Safety Point of Contact */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                5. Designated Child Safety Point of Contact
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you suspect or discover any content on ConnectHUB that endangers child safety or involves CSAE, 
                please immediately contact our designated Child Safety Point of Contact:
              </p>

              <div className="p-4 sm:p-6 rounded-xl bg-card border border-primary/20 space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  Official Child Safety Point of Contact:
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div><strong>Developer / Organization:</strong> SreeSri</div>
                  <div><strong>Application:</strong> ConnectHUB (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">in.connecthub.app</code>)</div>
                  <div><strong>Dedicated Safety Email:</strong> <a href="mailto:sreeconnect360@gmail.com" className="text-primary underline font-medium">sreeconnect360@gmail.com</a></div>
                  <div><strong>Alternative Contact:</strong> <a href="mailto:support@connecthub.app" className="text-primary underline">support@connecthub.app</a></div>
                  <div><strong>Response Time:</strong> Immediate / within 24 hours for all child safety concerns</div>
                </div>
              </div>
            </section>

            {/* Section 6: Legal Compliance */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                6. Compliance with Global Child Protection Laws
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                ConnectHUB and developer SreeSri comply with all applicable local and international child safety laws, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Google Play Child Safety Standards Policy.</li>
                <li>The US Children's Online Privacy Protection Act (COPPA).</li>
                <li>The Protection of Children from Sexual Offences (POCSO) Act and Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules.</li>
                <li>Title 18, United States Code, Sections 2258A and 2258E regarding mandatory reporting of child sexual exploitation.</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/30 py-8 px-4 sm:px-6 md:px-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ConnectHUB by SreeSri. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/code-of-conduct" className="hover:text-primary transition-colors">Code of Conduct</Link>
          <Link to="/child-safety" className="text-primary hover:underline">Child Safety Standards</Link>
        </div>
      </footer>
    </div>
  );
};

export default ChildSafetyStandards;
