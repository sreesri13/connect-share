import { motion } from "framer-motion";
import { QrCode, Link as LinkIcon, ExternalLink, User, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

// Demo profile to showcase the platform
const demoProfile = {
  name: "Alex Thompson",
  bio: "Product Designer & Creative Developer",
  categories: [
    {
      name: "Social Profiles",
      items: [
        { title: "Twitter / X", type: "url", content: "https://twitter.com" },
        { title: "LinkedIn", type: "url", content: "https://linkedin.com" },
        { title: "Instagram", type: "url", content: "https://instagram.com" },
      ],
    },
    {
      name: "Portfolio",
      items: [
        { title: "Personal Website", type: "url", content: "https://example.com" },
        { title: "Dribbble", type: "url", content: "https://dribbble.com" },
        { title: "Behance", type: "url", content: "https://behance.net" },
      ],
    },
    {
      name: "Contact",
      items: [
        { title: "Email Me", type: "url", content: "mailto:hello@example.com" },
        { title: "Book a Call", type: "url", content: "https://calendly.com" },
      ],
    },
  ],
};

const DemoPage = () => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Demo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center"
        >
          <p className="text-sm text-primary font-medium">
            ✨ This is a demo profile — Create your own for free!
          </p>
        </motion.div>

        {/* Profile Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-accent flex items-center justify-center shadow-elevated"
          >
            <User className="w-12 h-12 text-accent-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground mb-1"
          >
            {demoProfile.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground"
          >
            {demoProfile.bio}
          </motion.p>
        </div>

        {/* Categories & Items */}
        <div className="space-y-6">
          {demoProfile.categories.map((category, catIndex) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + catIndex * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {category.name}
                </h3>
              </div>
              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + catIndex * 0.1 + itemIndex * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all group"
                      onClick={() => window.open(item.content, "_blank")}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <LinkIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{item.title}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Button variant="hero" size="lg" className="w-full" asChild>
            <Link to="/auth?mode=signup">
              Create Your Free Profile
            </Link>
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <QrCode className="w-4 h-4" />
            <span className="text-sm">Powered by ConnectHUB</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DemoPage;
