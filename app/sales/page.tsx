"use client";

import { SalesTransaction } from "./components";
import { HelpTooltip } from "@/components/help-tooltip";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";

export default function SalesPage() {
  const { t } = useLanguage();

  return (
    <PageContainer size="wide">
      <PageHeader
        title={t("quick_sale")}
        description={t("add_items_desc")}
        help={<HelpTooltip text={t("quick_sale_desc")} />}
      />
      <SalesTransaction />
    </PageContainer>
  );
}
