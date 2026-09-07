"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeVoiceText,
  parseVoiceSaleCommand,
} from "@/lib/voice-sale-parser";
import { convertUnit } from "@/lib/unit-conversion";
import { useLanguage } from "@/providers/language-provider";

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
  blockedReason?: "out-of-stock" | "expired" | "insufficient";
};

const fillerWords = new Set([
  "um",
  "uh",
  "mm",
  "hmm",
  "eh",
  "aa",
  "aaa",
  "okay",
  "ok",
  "bas",
  "sir",
  "madam",
  "hello",
  "hi",
  "ye",
  "yes",
  "no",
]);

const cleanTranscript = (value: string) => {
  const trimmed = value
    .replace(/\s+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (!trimmed) return "";

  const filteredTokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => {
      const cleaned = token.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
      return cleaned.length > 0 && !fillerWords.has(cleaned);
    });

  const deduped: string[] = [];
  for (const token of filteredTokens) {
    const previous = deduped[deduped.length - 1];
    if (previous && previous === token) continue;
    deduped.push(token);
  }

  return deduped
    .join(" ")
    .replace(/\s+(and|aani|ani|aur|mag|then|plus)\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const levenshteinDistance = (first: string, second: string) => {
  const matrix = Array.from({ length: first.length + 1 }, () =>
    Array(second.length + 1).fill(0),
  );

  for (let i = 0; i <= first.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= second.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      const substitutionCost = first[i - 1] === second[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[first.length][second.length];
};

const productScore = (query: string, item: any) => {
  const normalizedQuery = normalizeVoiceText(query);
  const itemText = normalizeVoiceText(
    [item.name, item.nameMarathi, item.brand, item.brandMarathi]
      .filter(Boolean)
      .join(" "),
  );

  if (!normalizedQuery || !itemText) return 0;

  const queryTokens = normalizedQuery
    .split(" ")
    .filter((word) => word.length > 1);
  const itemTokens = itemText.split(" ").filter((word) => word.length > 1);

  const exactMatch = itemText.includes(normalizedQuery) ? 35 : 0;
  const prefixBoost =
    normalizedQuery.length > 3 &&
    itemText.startsWith(normalizedQuery.slice(0, 4))
      ? 12
      : 0;
  const tokenOverlap = queryTokens.reduce(
    (total, word) => total + (itemTokens.includes(word) ? 8 : 0),
    0,
  );
  const sharedLeading =
    queryTokens.length > 0 && itemTokens.length > 0
      ? queryTokens
          .slice(0, 2)
          .every((word, index) => itemTokens[index] === word)
        ? 10
        : 0
      : 0;

  const distance = levenshteinDistance(normalizedQuery, itemText);
  const maxLength = Math.max(normalizedQuery.length, itemText.length, 1);
  const fuzzyRatio = Math.max(0, 1 - distance / maxLength);
  const fuzzyBoost = fuzzyRatio * 30;

  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactItem = itemText.replace(/\s+/g, "");
  const compactDistance = levenshteinDistance(compactQuery, compactItem);
  const compactRatio = Math.max(
    0,
    1 - compactDistance / Math.max(compactQuery.length, compactItem.length, 1),
  );
  const compactBoost = compactRatio * 20;

  return (
    exactMatch +
    prefixBoost +
    tokenOverlap +
    sharedLeading +
    fuzzyBoost +
    compactBoost
  );
};

export function VoiceSaleAssistant({
  items,
  units,
  onAdd,
  onSearchRequested,
  onProductSelected,
  addedItems = [],
  autoFocus = false,
}: {
  items: any[];
  units: any[];
  onAdd: (line: SaleLine) => void;
  onSearchRequested?: (query: string) => void;
  onProductSelected?: (itemId: number, quantity: number, requestedUnit?: string) => void;
  addedItems?: Array<{ itemId: number; quantity: number }>;
  autoFocus?: boolean;
}) {
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [showVoice, setShowVoice] = useState(autoFocus);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const parsingRef = useRef(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<any>(null);
  const keepListening = useRef(false);
  const restartTimer = useRef<number | null>(null);
  const cancelled = useRef(false);
  const transcript = useRef("");
  const latestTranscript = useRef("");
  const { language } = useLanguage();

  useEffect(() => () => {
    cancelled.current = true;
    keepListening.current = false;
    if (restartTimer.current !== null) {
      window.clearTimeout(restartTimer.current);
    }
    recognition.current?.abort?.();
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const resolveDraftLine = (line: Draft) => {
    const item = items.find((candidate) => candidate.id === line.selectedId);
    if (!item) return { state: "unmatched" as const };
    const unit = units.find((candidate) => candidate.id === item.unitId);
    const unitName = unit?.shortForm || "unit";
    const quantity = line.requestedUnit
      ? convertUnit(line.quantity, line.requestedUnit, unitName)
      : line.quantity;
    if (!Number.isFinite(quantity) || quantity <= 0) return { state: "quantity" as const };
    if (line.variant || line.priceOverride != null) return { state: "variant" as const, item };
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (expiryDate && expiryDate.getTime() < today.getTime()) return { state: "expired" as const, item };
    const available = Math.max(0, Number(item.quantity || 0) - addedItems.filter((entry) => entry.itemId === item.id).reduce((sum, entry) => sum + entry.quantity, 0));
    if (quantity > available) return { state: "insufficient" as const, item, available };
    return {
      state: "ready" as const,
      saleLine: {
        itemId: item.id,
        itemName: item.brand ? `${item.name} (${item.brand})` : item.name,
        quantity,
        displayQuantity: `${line.quantity} ${line.requestedUnit || unitName}`,
        unitId: item.unitId,
        unitShortForm: unitName,
        pricePerUnit: Number(item.sellPrice),
        totalPrice: quantity * Number(item.sellPrice),
        costPerUnit: Number(item.buyPrice),
        totalCost: quantity * Number(item.buyPrice),
      },
    };
  };

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
        .filter((entry) => entry.score >= 28)
        .sort((a, b) => b.score - a.score);
      const bestScore = rankedCandidates[0]?.score || 0;
      const isAmbiguous =
        rankedCandidates.length > 1 &&
        bestScore > 0 &&
        bestScore - rankedCandidates[1].score <= 2;
      const exactCandidates = rankedCandidates.filter(({item}) =>
        [item.name, item.nameMarathi, item.brand, item.brandMarathi]
          .filter(Boolean).some((name) => normalizeVoiceText(name) === normalizeVoiceText(query)));
      const isConfident = exactCandidates.length === 1 && !isAmbiguous;
      // Show alternatives only when the phrase genuinely has close matches.
      const candidates = (isConfident ? exactCandidates : rankedCandidates)
        .slice(0, isConfident ? 1 : 3)
        .map((entry) => entry.item);
      const selectedCandidate = candidates[0];
      const expiryDate = selectedCandidate?.expiryDate
        ? new Date(selectedCandidate.expiryDate)
        : null;
      const isExpired = !!expiryDate && expiryDate.getTime() < Date.now();
      const requestedUnit = units.find((unit) => unit.shortForm === request.unit);
      const requestedQuantity = request.unit && requestedUnit
        ? convertUnit(request.quantity || 1, request.unit, units.find((unit) => unit.id === selectedCandidate?.unitId)?.shortForm || "")
        : request.quantity || 1;
      const blockedReason: Draft["blockedReason"] = isExpired
        ? "expired"
        : Number(selectedCandidate?.quantity || 0) <= 0
          ? "out-of-stock"
          : requestedQuantity > Number(selectedCandidate?.quantity || 0)
            ? "insufficient"
          : undefined;
      return {
        id: String(Date.now()) + "-" + index,
        query,
        quantity: request.quantity || 1,
        requestedUnit: request.unit || (request as { requestedUnit?: string }).requestedUnit,
        priceOverride: request.priceOverride,
        variant: request.variant,
        candidates,
        selectedId:
          candidates.length === 1 && isConfident ? candidates[0].id : null,
        blockedReason,
      };
    });
    setDraft(lines);
    setShowVoice(false);
    setMessage("Check your spoken order, then add ready items to the bill.");
  };

  const parseTranscript = async (rawTranscript: string) => {
    const cleaned = rawTranscript.trim();
    if (!cleaned || parsingRef.current) return;
    parsingRef.current = true;
    setBusy(true);
    try {
      setMessage("Checking products and stock…");
      const parsed = parseVoiceSaleCommand(cleaned);
      if (parsed.length > 0) {
        buildDraft(parsed);
      } else {
        setMessage(
          "No products were recognised. Try again, or search by product name.",
        );
        setDraft([]);
      }
    } finally {
      parsingRef.current = false;
      setBusy(false);
    }
  };

  const review = async () => {
    await parseTranscript(command.trim());
  };

  const finishListening = () => {
    recognition.current = null;
    setListening(false);
    const spokenOrder = latestTranscript.current.trim();
    if (!cancelled.current && spokenOrder) {
      void parseTranscript(spokenOrder);
    } else if (!cancelled.current) {
      setMessage("Nothing was heard. Tap Speak order and try again.");
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Recognition) {
      setMessage(
        "Voice input is not supported in this browser. Use Chrome or Edge, or search by product name.",
      );
      return;
    }

    cancelled.current = false;
    keepListening.current = true;
    transcript.current = "";
    latestTranscript.current = "";
    setCommand("");
    setDraft([]);
    setShowVoice(true);

    const startSession = () => {
      if (!keepListening.current || cancelled.current) return;

      const instance = new Recognition();
      recognition.current = instance;
      instance.lang = language === "mr" ? "mr-IN" : "en-IN";
      instance.interimResults = true;
      instance.continuous = true;
      instance.maxAlternatives = 3;

      instance.onstart = () => {
        setListening(true);
        setMessage("Listening… say the complete order, then tap Stop.");
      };

      instance.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const heard = event.results[index][0]?.transcript?.trim() || "";
          if (event.results[index].isFinal) {
            finalText = `${finalText} ${heard}`.trim();
          } else {
            interimText = `${interimText} ${heard}`.trim();
          }
        }

        if (finalText) {
          transcript.current = `${transcript.current} ${finalText}`.trim();
        }
        const latest = `${transcript.current} ${interimText}`.trim();
        latestTranscript.current = latest;
        setCommand(latest);
      };

      instance.onerror = (event: any) => {
        if (event.error === "aborted" || event.error === "no-speech") return;
        keepListening.current = false;
        cancelled.current = true;
        setListening(false);
        recognition.current = null;
        setMessage("Microphone is unavailable. Check permission and try again.");
      };

      instance.onend = () => {
        recognition.current = null;
        if (keepListening.current && !cancelled.current) {
          // Browsers can end recognition after a short silence. Reopen it while
          // keeping the transcript and Stop button active.
          restartTimer.current = window.setTimeout(() => {
            restartTimer.current = null;
            startSession();
          }, 150);
          return;
        }
        finishListening();
      };

      try {
        instance.start();
      } catch {
        keepListening.current = false;
        recognition.current = null;
        setListening(false);
        setMessage("Voice input could not start. Please try again.");
      }
    };

    startSession();
  };

  const stopListening = () => {
    keepListening.current = false;
    if (restartTimer.current !== null) {
      window.clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (recognition.current) {
      recognition.current.stop?.();
    } else {
      finishListening();
    }
  };

  const cancelVoice = () => {
    cancelled.current = true;
    keepListening.current = false;
    if (restartTimer.current !== null) {
      window.clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (recognition.current) {
      recognition.current.onresult = null;
      recognition.current.onend = null;
      recognition.current.onerror = null;
      recognition.current.abort?.();
      recognition.current = null;
    }
    parsingRef.current = false;
    setBusy(false);
    setListening(false);
    setCommand("");
    setMessage("Voice cancelled. You can speak again or search products.");
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
  const removeDraftLine = (id: string) =>
    setDraft((current) => current.filter((line) => line.id !== id));
  const useAvailableQuantity = (line: Draft) => {
    const item = line.candidates.find((candidate) => candidate.id === line.selectedId) || line.candidates[0];
    if (!item) return;
    setDraft((current) => current.map((entry) => entry.id === line.id ? {
      ...entry,
      selectedId: item.id,
      quantity: Number(item.quantity || 0),
      requestedUnit: undefined,
      blockedReason: undefined,
    } : entry));
  };
  // Reserve quantities in spoken order as well as quantities already in the bill.
  const reserved = new Map<number, number>();
  const reviewed = draft.map((line) => {
    const result = resolveDraftLine(line);
    if (result.state !== "ready") return { line, result };
    const sale = result.saleLine;
    const item = items.find((entry) => entry.id === sale.itemId);
    const available = Math.max(0, Number(item?.quantity || 0)
      - addedItems.filter((entry) => entry.itemId === sale.itemId).reduce((sum, entry) => sum + entry.quantity, 0)
      - (reserved.get(sale.itemId) || 0));
    if (sale.quantity > available) return { line, result: { state: "insufficient" as const, available, item } };
    reserved.set(sale.itemId, (reserved.get(sale.itemId) || 0) + sale.quantity);
    return { line, result };
  });
  const ready = reviewed.filter((entry) => entry.result.state === "ready");
  const addConfirmed = () => {
    const ids = new Set<string>();
    ready.forEach(({ line, result }) => {
      if (result.state === "ready") { onAdd(result.saleLine); ids.add(line.id); }
    });
    setDraft((current) => current.filter((line) => !ids.has(line.id)));
    setMessage(`${ids.size} products added to the bill.`);
    if (ids.size === draft.length) { setCommand(""); setShowVoice(false); }
  };
  const searchInstead = (line: Draft) => {
    onSearchRequested?.(line.query);
    removeDraftLine(line.id);
  };

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-3">
      <div className="flex items-center gap-3">
        <Button type="button" disabled={busy} onClick={listening ? stopListening : startListening}
          className={`h-12 shrink-0 gap-2 rounded-xl ${listening ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"}`}>
          <Mic className="h-5 w-5" />{listening ? "Stop" : busy ? "Processing…" : "Speak order"}
        </Button>
        {(busy || listening) && <Button type="button" variant="outline" onClick={cancelVoice}>Cancel</Button>}
        <p role="status" className="text-xs text-slate-600">{message || "Say your whole order, e.g. two Parle-G and one milk."}</p>
      </div>
      {command && <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">What I heard / correct words</summary>
        <Input aria-label="Correct spoken order" className="mt-2" value={command} onChange={(event) => setCommand(event.target.value)} />
        <Button type="button" variant="ghost" disabled={busy || listening} onClick={review}>Check correction</Button>
      </details>}
      {draft.length > 0 && <div className="mt-3 space-y-3">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="font-semibold text-emerald-900">{ready.length} products ready · ₹{ready.reduce((sum, entry) => sum + (entry.result.state === "ready" ? entry.result.saleLine.totalPrice : 0), 0).toFixed(2)}</p>
          <p className="text-xs text-slate-600">{draft.length - ready.length} need attention</p>
        </div>
        {reviewed.map(({line, result}) => <div key={line.id} className={`rounded-xl border p-3 ${result.state === "ready" ? "border-slate-200" : "border-amber-200 bg-amber-50/50"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">{items.find((item) => item.id === line.selectedId)?.name || line.query}</p>
            <Button variant="ghost" size="icon" aria-label={`Remove ${line.query}`} onClick={() => removeDraftLine(line.id)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs" htmlFor={`voice-qty-${line.id}`}>Quantity</label>
            <Input id={`voice-qty-${line.id}`} type="number" min="0.001" step="any" className="h-9 w-24" value={line.quantity} onChange={(event) => setDraft((current) => current.map((entry) => entry.id === line.id ? {...entry, quantity: Number(event.target.value)} : entry))} />
            <span className="text-xs">{line.requestedUnit || units.find((unit) => unit.id === items.find((item) => item.id === line.selectedId)?.unitId)?.shortForm}</span>
          </div>
          {result.state === "ready" && <p className="mt-2 text-sm text-emerald-700">Ready · ₹{result.saleLine.totalPrice.toFixed(2)}</p>}
          {result.state === "expired" && <p className="mt-2 text-sm text-red-700">Expired. Choose another product.</p>}
          {result.state === "quantity" && <p className="mt-2 text-sm text-amber-800">Enter a quantity greater than zero.</p>}
          {result.state === "variant" && <div className="mt-2"><p className="text-sm text-amber-800">Check the requested price or pack size.</p><Button variant="outline" onClick={() => { onProductSelected?.(line.selectedId!, line.quantity, line.requestedUnit); removeDraftLine(line.id); }}>Choose price / pack</Button></div>}
          {result.state === "insufficient" && <div className="mt-2 flex flex-wrap items-center gap-2"><p className="text-sm text-amber-800">{result.available > 0 ? `Only ${result.available} available after other bill items.` : "Out of stock for this bill."}</p>
            {result.available > 0 && <Button variant="outline" onClick={() => setDraft((current) => current.map((entry) => entry.id === line.id ? {...entry, quantity: result.available, requestedUnit: undefined} : entry))}>Use {result.available}</Button>}
          </div>}
          {result.state === "unmatched" && <div className="mt-2 space-y-2"><p className="text-sm text-amber-800">{line.candidates.length ? "Which product did you mean?" : "No matching product found."}</p>
            {line.candidates.map((item) => <Button key={item.id} variant="outline" className="mr-1 mb-1 h-auto whitespace-normal text-left" onClick={() => choose(line.id,item.id)}>{item.name} {item.brand} · ₹{item.sellPrice}</Button>)}
          </div>}
          {result.state !== "ready" && onSearchRequested && <Button className="mt-2" variant="outline" onClick={() => searchInstead(line)}>Search replacement</Button>}
        </div>)}
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!ready.length || busy || listening} onClick={addConfirmed}>Add {ready.length} ready products to bill</Button>
          <Button variant="ghost" onClick={() => {setDraft([]); setCommand(""); setMessage("");}}>Clear spoken items</Button>
        </div>
      </div>}
    </section>
  );
}
