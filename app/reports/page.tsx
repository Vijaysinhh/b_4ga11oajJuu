"use client";

import { useState } from "react";
import { DailySalesReport } from "@/components/daily-sales-report";
import { MonthlyPLReport } from "@/components/monthly-pl-report";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/help-tooltip";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={t("reports")}
        help={<HelpTooltip text={t("reports_help")} />}
      />

      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab("daily")}
          variant={activeTab === "daily" ? "default" : "outline"}
          className="flex-1"
        >
          {t("daily_report")}
        </Button>
        <Button
          onClick={() => setActiveTab("monthly")}
          variant={activeTab === "monthly" ? "default" : "outline"}
          className="flex-1"
        >
          {t("monthly_pl")}
        </Button>
      </div>

      {activeTab === "daily" && <DailySalesReport />}
      {activeTab === "monthly" && <MonthlyPLReport />}
    </PageContainer>
  );
}
