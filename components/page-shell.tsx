"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/providers/language-provider";
import { Languages } from "lucide-react";

type PageSize = "default" | "wide" | "narrow";

const sizeClasses: Record<PageSize, string> = {
  default: "max-w-5xl",
  wide: "max-w-7xl",
  narrow: "max-w-4xl",
};

export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: PageSize;
}) {
  return (
    <div
      className={cn(
        "mx-auto space-y-6 pb-24 pt-2 sm:pb-10 sm:pt-4",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  help,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  help?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {help}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Select
      value={language}
      onValueChange={(value) => setLanguage(value as "en" | "mr")}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-[7.5rem] gap-1 rounded-full border-border/70 bg-background/80 text-xs shadow-sm sm:text-sm",
          className,
        )}
        aria-label={t("language")}
      >
        <Languages className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("english")}</SelectItem>
        <SelectItem value="mr">{t("marathi")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
