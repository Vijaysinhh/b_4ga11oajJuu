"use client";

import { useState } from "react";
import { DailySalesReport } from "@/components/daily-sales-report";
import { MonthlyPLReport } from "@/components/monthly-pl-report";
import { TopProductsReport } from "@/components/top-products-report";
import { InventoryHealthReport } from "@/components/inventory-health-report";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/help-tooltip";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { NotificationCenter } from "@/components/notification-center";
import { useLanguage } from "@/providers/language-provider";

type Tab = "daily" | "monthly" | "top-products" | "inventory" | "notifications";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("daily");

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={t("reports")}
        help={<HelpTooltip text={t("reports_help")} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setActiveTab("daily")}
          variant={activeTab === "daily" ? "default" : "outline"}
          className="flex-1 min-w-[120px]"
        >
          Daily Sales
        </Button>
        <Button
          onClick={() => setActiveTab("monthly")}
          variant={activeTab === "monthly" ? "default" : "outline"}
          className="flex-1 min-w-[120px]"
        >
          Monthly P&L
        </Button>
        <Button
          onClick={() => setActiveTab("top-products")}
          variant={activeTab === "top-products" ? "default" : "outline"}
          className="flex-1 min-w-[120px]"
        >
          Top Products
        </Button>
        <Button
          onClick={() => setActiveTab("inventory")}
          variant={activeTab === "inventory" ? "default" : "outline"}
          className="flex-1 min-w-[120px]"
        >
          Inventory Health
        </Button>
        <Button
          onClick={() => setActiveTab("notifications")}
          variant={activeTab === "notifications" ? "default" : "outline"}
          className="flex-1 min-w-[120px]"
        >
          Notifications
        </Button>
      </div>

      {activeTab === "daily" && <DailySalesReport />}
      {activeTab === "monthly" && <MonthlyPLReport />}
      {activeTab === "top-products" && <TopProductsReport />}
      {activeTab === "inventory" && <InventoryHealthReport />}
      {activeTab === "notifications" && <NotificationCenter />}
    </PageContainer>
  );
}
