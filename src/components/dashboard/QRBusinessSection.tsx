import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Package, QrCode, List } from "lucide-react";
import { BusinessCategoriesManager } from "./business/BusinessCategoriesManager";
import { BusinessProductsManager } from "./business/BusinessProductsManager";
import { BusinessQRGenerator } from "./business/BusinessQRGenerator";
import { BusinessQRList } from "./business/BusinessQRList";

interface QRBusinessSectionProps {
  userId: string;
}

export const QRBusinessSection = ({ userId }: QRBusinessSectionProps) => {
  const [activeTab, setActiveTab] = useState("categories");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Store className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Business</h1>
          <p className="text-muted-foreground text-sm">
            Create product catalogs and generate dynamic QR codes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Generate QR</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">My QRs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <BusinessCategoriesManager userId={userId} onUpdate={handleRefresh} key={`cat-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="products">
          <BusinessProductsManager userId={userId} key={`prod-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="generate">
          <BusinessQRGenerator userId={userId} key={`gen-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="list">
          <BusinessQRList userId={userId} key={`list-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
