import { motion } from "framer-motion";
import { QrCode, Link as LinkIcon, FileText, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Mock public profile data
const publicProfile = {
  name: "John Doe",
  bio: "Digital Creator & Developer",
  categories: [
    {
      name: "Social Links",
      items: [
        { title: "Twitter", type: "url", content: "https://twitter.com/johndoe" },
        { title: "LinkedIn", type: "url", content: "https://linkedin.com/in/johndoe" },
      ],
    },
    {
      name: "Portfolio",
      items: [
        { title: "Website", type: "url", content: "https://johndoe.com" },
      ],
    },
  ],
};

const PublicProfile = () => {
  const handleItemClick = (item: { type: string; content: string }) => {
    if (item.type === "url") {
      window.open(item.content, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Profile Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow"
          >
            <User className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground mb-1"
          >
            {publicProfile.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground"
          >
            {publicProfile.bio}
          </motion.p>
        </div>

        {/* Categories & Items */}
        <div className="space-y-6">
          {publicProfile.categories.map((category, catIndex) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + catIndex * 0.1 }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                {category.name}
              </h3>
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
                      onClick={() => handleItemClick(item)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          {item.type === "url" ? (
                            <LinkIcon className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                        </div>
                        {item.type === "url" && (
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <QrCode className="w-4 h-4" />
            <span className="text-sm">Powered by ConnectHUB</span>
          </div>
          <Button variant="link" className="mt-2 text-primary" asChild>
            <a href="/">Create your own profile</a>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PublicProfile;
