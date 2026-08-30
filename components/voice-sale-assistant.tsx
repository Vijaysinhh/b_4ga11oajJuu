"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Mic,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeVoiceText,
  parseVoiceSaleCommand,
} from "@/lib/voice-sale-parser";
import { useGeminiUnderstanding } from "@/hooks/use-gemini";
import { convertUnit } from "@/lib/unit-conversion";

type SaleLine = {
  itemId: number;
  itemName: string;
  quantity: number;
  displayQuantity: string;
  unitId: number;
  unitShortForm: string;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
  totalCost: number;
};
type Draft = {
  id: string;
  query: string;
  quantity: number;
  requestedUnit?: string;
  priceOverride?: number;
  variant?: string;
  candidates: any[];
  selectedId: number | null;
  blockedReason?: "out-of-stock" | "expired";
};

const productScore = (query: string, item: any) => {
  const words = normalizeVoiceText(query)
    .split(" ")
    .filter((word) => word.length > 1);
  const name = normalizeVoiceText(
    [item.name, item.nameMarathi, item.brand, item.brandMarathi]
      .filter(Boolean)
      .join(" "),
  );
  const compactQuery = normalizeVoiceText(query).replace(/\s/g, "");
  const compactName = name.replace(/\s/g, "");
  return (
    words.reduce((total, word) => total + (name.includes(word) ? 3 : 0), 0) +
    (name.includes(normalizeVoiceText(query)) ? 5 : 0) +
    (compactName.includes(compactQuery) ? 4 : 0)
  );
};

export function VoiceSaleAssistant({
  items,
  units,
  onAdd,
  autoFocus = false,
}: {
  items: any[];
  units: any[];
  onAdd: (line: SaleLine) => void;
  autoFocus?: boolean;
}) {
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<any>(null);
  const keepListening = useRef(false);
  const transcript = useRef("");
  const { parseVoiceCommand, isLoading: aiParsing } = useGeminiUnderstanding();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const buildDraft = (
    requests: Array<{
      productQuery?: string;
      productName?: string;
      quantity?: number;
      unit?: string;
      priceOverride?: number;
      variant?: string;
    }>,
  ) => {
    const uniqueRequests = requests.reduce<typeof requests>(
      (result, request) => {
        const query = normalizeVoiceText(
          request.productName || request.productQuery || "",
        );
        const key = `${query}|${request.unit || ""}|${request.priceOverride ?? ""}`;
        const previous = result.find((entry) => {
          const previousQuery = normalizeVoiceText(
            entry.productName || entry.productQuery || "",
          );
          return (
            `${previousQuery}|${entry.unit || ""}|${entry.priceOverride ?? ""}` ===
            key
          );
        });
        if (previous) {
          previous.quantity =
            (previous.quantity || 1) + (request.quantity || 1);
        } else {
          result.push({ ...request });
        }
        return result;
      },
      [],
    );

    const lines = uniqueRequests.map((request, index) => {
      const query = request.productName || request.productQuery || "";
      const queryWords = normalizeVoiceText(query)
        .split(" ")
        .filter((word) => word.length > 1);
      const rankedCandidates = items
        .map((item) => ({
          item,
          score: productScore(query, item),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
      const bestScore = rankedCandidates[0]?.score || 0;
      const isAmbiguous =
        rankedCandidates.length > 1 &&
        bestScore > 0 &&
        bestScore - rankedCandidates[1].score <= 2;
      // Show alternatives only when the phrase genuinely has close matches.
      const candidates = rankedCandidates
        .slice(0, isAmbiguous && queryWords.length > 1 ? 3 : 1)
        .map((entry) => entry.item);
      const selectedCandidate = candidates[0];
      const expiryDate = selectedCandidate?.expiryDate
        ? new Date(selectedCandidate.expiryDate)
        : null;
      const isExpired = !!expiryDate && expiryDate.getTime() < Date.now();
      const blockedReason: Draft["blockedReason"] = isExpired
        ? "expired"
        : Number(selectedCandidate?.quantity || 0) <= 0
          ? "out-of-stock"
          : undefined;
      return {
        id: String(Date.now()) + "-" + index,
        query,
        quantity: request.quantity || 1,
        requestedUnit: request.unit,
        priceOverride: request.priceOverride,
        variant: request.variant,
        candidates,
        selectedId:
          candidates.length === 1 && !blockedReason ? candidates[0].id : null,
        blockedReason,
      };
    });
    setDraft(lines);
    setMessage(
      lines.length
        ? "Choose a suggested product if needed, check quantity, then add confirmed items."
        : "Try saying product name and quantity, for example: two Parle-G and one milk.",
    );
  };

  const review = async () => {
    if (!command.trim() || aiParsing) return;
    setMessage("Understanding products, quantities, and price variants…");
    const result = await parseVoiceCommand(command, items, units);
    if (Array.isArray(result?.data) && result.data.length > 0) {
      buildDraft(result.data);
      return;
    }
    buildDraft(parseVoiceSaleCommand(command));
  };

  const startListening = () => {
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Recognition)
      return setMessage(
        "Voice input works best in Chrome or Edge. You can also type the sale.",
      );
    keepListening.current = true;
    transcript.current = command.trim().slice(-6000);
    const session = () => {
      if (!keepListening.current) return;
      const instance = new Recognition();
      recognition.current = instance;
      instance.lang = "mr-IN";
      instance.interimResults = true;
      instance.continuous = true;
      instance.onstart = () => {
        setListening(true);
        setMessage(
          "Listening — keep speaking. I will stay open until you press Stop mic.",
        );
      };
      instance.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const heard = event.results[i][0]?.transcript?.trim() || "";
          if (event.results[i].isFinal) {
            const nextTranscript = (transcript.current + " " + heard).trim();
            transcript.current = nextTranscript.slice(-6000);
          } else interim = (interim + " " + heard).trim();
        }
        setCommand((transcript.current + " " + interim).trim().slice(-6000));
      };
      instance.onend = () => {
        if (keepListening.current) window.setTimeout(session, 250);
        else setListening(false);
      };
      instance.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        if (["not-allowed", "audio-capture", "network"].includes(event.error)) {
          keepListening.current = false;
          setListening(false);
          setMessage(
            "Microphone is unavailable. Check permission and try again.",
          );
        }
      };
      try {
        instance.start();
      } catch {
        window.setTimeout(session, 400);
      }
    };
    session();
  };

  const stopListening = () => {
    keepListening.current = false;
    recognition.current?.stop?.();
    setListening(false);
    setMessage(
      command
        ? "Voice draft ready. Review it before adding products."
        : "Voice entry stopped.",
    );
  };
  const changeQuantity = (id: string, amount: number) =>
    setDraft((current) =>
      current.map((line) =>
        line.id === id
          ? { ...line, quantity: Math.max(0.5, line.quantity + amount) }
          : line,
      ),
    );
  const choose = (id: string, selectedId: number) =>
    setDraft((current) =>
      current.map((line) => (line.id === id ? { ...line, selectedId } : line)),
    );
  const addConfirmed = () => {
    const confirmed = draft.filter((line) => line.selectedId);
    const blocked = confirmed.filter((line) => {
      const item = line.candidates.find(
        (candidate) => candidate.id === line.selectedId,
      );
      const unit = units.find((candidate) => candidate.id === item?.unitId);
      const quantity =
        line.requestedUnit && unit
          ? convertUnit(line.quantity, line.requestedUnit, unit.shortForm)
          : line.quantity;
      const expiryDate = item?.expiryDate ? new Date(item.expiryDate) : null;
      return (
        !item ||
        quantity > Number(item.quantity || 0) ||
        (!!expiryDate && expiryDate.getTime() < Date.now())
      );
    });
    if (blocked.length > 0) {
      setMessage(
        "Some confirmed items are unavailable or expired. Remove them before adding the sale.",
      );
      return;
    }
    confirmed.forEach((line) => {
      const item = line.candidates.find(
        (candidate) => candidate.id === line.selectedId,
      );
      if (!item) return;
      const unit = units.find((candidate) => candidate.id === item.unitId);
      const unitName = unit?.shortForm || "unit";
      const requestedUnit = line.requestedUnit;
      const quantity = requestedUnit
        ? convertUnit(line.quantity, requestedUnit, unitName)
        : line.quantity;
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      if (
        Number(item.quantity || 0) <= 0 ||
        (expiryDate && expiryDate.getTime() < Date.now())
      )
        return;
      onAdd({
        itemId: item.id,
        itemName: item.brand ? item.name + " (" + item.brand + ")" : item.name,
        quantity,
        displayQuantity: line.quantity + " " + (requestedUnit || unitName),
        unitId: item.unitId,
        unitShortForm: unitName,
        pricePerUnit: Number(item.sellPrice),
        totalPrice: quantity * Number(item.sellPrice),
        costPerUnit: Number(item.buyPrice),
        totalCost: quantity * Number(item.buyPrice),
      });
    });
    setMessage(
      confirmed.length +
        " item" +
        (confirmed.length === 1 ? "" : "s") +
        " added to cart. Review any unselected suggestions.",
    );
    setDraft((current) => current.filter((line) => !line.selectedId));
    if (confirmed.length === draft.length) setCommand("");
  };

  return (
    <section
      className={
        "mb-4 rounded-2xl border p-3 " +
        (autoFocus
          ? "border-violet-200 bg-violet-50/60 shadow-sm"
          : "border-slate-200 bg-white")
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-violet-600" /> Voice sale draft
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Speak naturally. Nothing enters the cart until you confirm it.
          </p>
        </div>
        {listening && (
          <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
            ● Listening
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Volume2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
          <Input
            ref={inputRef}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && review()}
            className="bg-white pl-9"
            placeholder="e.g. two Parle-G and 3 bread"
          />
        </div>
        <Button
          type="button"
          onClick={listening ? stopListening : startListening}
          variant="outline"
          className="border-violet-300 text-violet-700"
        >
          <Mic className="mr-2 h-4 w-4" />
          {listening ? "Stop mic" : "Speak"}
        </Button>
        <Button
          type="button"
          onClick={review}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Search className="mr-2 h-4 w-4" />
          Review
        </Button>
      </div>
      {message && (
        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
          {message}
        </p>
      )}
      {draft.length > 0 && (
        <div className="mt-3 space-y-2">
          {draft.map((line) => (
            <div
              key={line.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.id, -1)}
                    className="p-1.5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.id, 1)}
                    className="p-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="text-muted-foreground">Heard: </span>
                  {line.query}
                  {line.variant && (
                    <span className="ml-2 text-violet-700">
                      ({line.variant})
                    </span>
                  )}
                  {line.priceOverride !== undefined && !line.variant && (
                    <span className="ml-2 text-violet-700">
                      (₹{line.priceOverride} variant)
                    </span>
                  )}
                </p>
              </div>
              {line.blockedReason === "expired" && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700">
                  Expired product: remove it from this sale.
                </p>
              )}
              {line.blockedReason === "out-of-stock" && (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700">
                  No stock available for this product.
                </p>
              )}
              {line.candidates.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {line.candidates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const expiryDate = item.expiryDate
                          ? new Date(item.expiryDate)
                          : null;
                        if (
                          Number(item.quantity || 0) <= 0 ||
                          (expiryDate && expiryDate.getTime() < Date.now())
                        )
                          return;
                        choose(line.id, item.id);
                      }}
                      disabled={
                        Number(item.quantity || 0) <= 0 ||
                        (!!item.expiryDate &&
                          new Date(item.expiryDate).getTime() < Date.now())
                      }
                      className={
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium " +
                        (line.selectedId === item.id
                          ? "border-violet-300 bg-violet-50 text-violet-800"
                          : Number(item.quantity || 0) <= 0 ||
                              (!!item.expiryDate &&
                                new Date(item.expiryDate).getTime() <
                                  Date.now())
                            ? "cursor-not-allowed border-slate-200 text-slate-400 line-through"
                            : "border-slate-200 text-slate-600")
                      }
                    >
                      {line.selectedId === item.id && (
                        <Check className="h-3 w-3" />
                      )}
                      {item.name}
                      {item.brand ? " · " + item.brand : ""}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-700">
                  No close match. Edit the text above and review again.
                </p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraft([]);
                setCommand("");
                setMessage("");
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
            <Button
              type="button"
              size="sm"
              onClick={addConfirmed}
              disabled={!draft.some((line) => line.selectedId)}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Add confirmed
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
