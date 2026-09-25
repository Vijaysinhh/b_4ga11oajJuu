"use client";

import { useMemo, useState } from "react";
import { Equal, MessageSquarePlus, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  calculateStockChange,
  stockMovementType,
  type StockMovementType,
} from "@/lib/inventory-calculations";
import { cleanNumberInput, formatNumber, parseNumberInput } from "@/lib/number-format";

type AdjustmentMode = "receive" | "return" | "damage" | "expired" | "correction";

interface StockAdjustmentItem {
  id: number;
  name: string;
  quantity: number;
}

interface StockAdjustmentDialogProps {
  item: StockAdjustmentItem | null;
  unitName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    change: number;
    movementType: StockMovementType;
    reason: string;
  }) => Promise<void>;
}

const defaultReasons: Record<AdjustmentMode, string> = {
  receive: "Stock received",
  return: "Customer return",
  damage: "Damaged stock",
  expired: "Expired stock removed",
  correction: "Stock count correction",
};

export function StockAdjustmentDialog({
  item,
  unitName,
  open,
  onOpenChange,
  onSubmit,
}: StockAdjustmentDialogProps) {
  const [mode, setMode] = useState<AdjustmentMode>("receive");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const direction =
    mode === "correction"
      ? "set"
      : mode === "receive" || mode === "return"
        ? "add"
        : "remove";

  const preview = useMemo(() => {
    if (!item || quantity === "") return null;
    try {
      return calculateStockChange(
        Number(item.quantity || 0),
        mode,
        parseNumberInput(quantity),
      );
    } catch {
      return null;
    }
  }, [item, mode, quantity]);

  const selectDirection = (nextDirection: "add" | "remove" | "set") => {
    setMode(nextDirection === "set" ? "correction" : nextDirection === "add" ? "receive" : "damage");
    setError("");
  };

  const handleSubmit = async () => {
    if (!item) return;
    try {
      setError("");
      const result = calculateStockChange(
        Number(item.quantity || 0),
        mode,
        parseNumberInput(quantity),
      );
      setIsSaving(true);
      await onSubmit({
        change: result.change,
        movementType: stockMovementType(mode),
        reason: reason.trim() || defaultReasons[mode],
      });
      setQuantity("");
      setReason("");
      setShowNote(false);
      setMode("receive");
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update stock.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[90vh] sm:max-w-md">
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Update {item?.name || "this product"}. Every change is saved in stock history.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Current stock</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
              {formatNumber(item?.quantity || 0)}{" "}
              <span className="text-sm font-medium text-muted-foreground">{unitName}</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">What happened to the stock?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "add" as const, label: "Add stock", hint: "Stock came in", icon: Plus },
                { value: "remove" as const, label: "Remove stock", hint: "Stock went out", icon: Minus },
              ].map((option) => {
                const Icon = option.icon;
                const active = direction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectDirection(option.value)}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {option.label}
                    <span className={`text-[11px] font-normal ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-pressed={direction === "set"}
              onClick={() => selectDirection("set")}
              className={`mt-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                direction === "set"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Equal className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Correct stock count</span>
                <span className="block text-xs text-muted-foreground">Use this only after physically counting your stock</span>
              </span>
            </button>
          </div>

          {direction === "set" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
              Enter how many items you have now. For example, if the app says 10 but you counted 8, enter <strong>8</strong>.
            </div>
          )}

          {direction !== "set" && (
            <div>
              <p className="mb-2 text-sm font-medium">Why?</p>
              <div className="flex flex-wrap gap-2">
                {(direction === "add"
                  ? [
                      { value: "receive" as const, label: "New purchase" },
                      { value: "return" as const, label: "Customer return" },
                    ]
                  : [
                      { value: "damage" as const, label: "Damaged" },
                      { value: "expired" as const, label: "Expired" },
                    ]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={mode === option.value}
                    onClick={() => {
                      setMode(option.value);
                      setError("");
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      mode === option.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block space-y-2 text-sm font-medium">
            {direction === "set"
              ? "Quantity counted now"
              : direction === "add"
                ? "Quantity to add"
                : "Quantity to remove"}
            <Input
              autoFocus
              inputMode="decimal"
              value={quantity}
              onChange={(event) => {
                setQuantity(cleanNumberInput(event.target.value));
                setError("");
              }}
              placeholder="0"
              aria-invalid={Boolean(error)}
            />
          </label>

          {showNote ? (
            <label className="block space-y-2 text-sm font-medium">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={defaultReasons[mode]}
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Add a note
            </button>
          )}

          {preview && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
              <span className="text-muted-foreground">After this change</span>
              <strong className="text-base tabular-nums text-primary">
                {formatNumber(preview.resultingQuantity)} {unitName}
              </strong>
            </div>
          )}
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter className="grid shrink-0 grid-cols-2 gap-2 border-t bg-background px-5 py-4 sm:flex sm:px-6">
          <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button className="h-11 w-full sm:w-auto" onClick={handleSubmit} disabled={isSaving || !item}>
            {isSaving ? "Saving..." : "Save stock change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
