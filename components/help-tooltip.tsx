'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  text: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HelpTooltip({ text, side = 'top', className }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className={cn('w-4 h-4 text-muted-foreground hover:text-foreground cursor-help transition-colors', className)} />
      </TooltipTrigger>
      <TooltipContent side={side}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
}

export function LabelWithTooltip({ label, tooltip, required }: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <HelpTooltip text={tooltip} />
    </div>
  );
}
