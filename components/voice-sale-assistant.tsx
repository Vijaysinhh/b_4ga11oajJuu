"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeVoiceText,
  parseVoiceSaleCommand,
} from "@/lib/voice-sale-parser";
import { checkVoiceStock, convertVoiceQuantity, matchVoiceProducts, shortlistVoiceProducts } from "@/lib/voice-sale-matching";
import { validateVoiceAIResult } from "@/lib/voice-sale-ai";
import { useAuth } from "@/providers/auth-provider";
import { createVoiceRecording, type RecognitionEngine } from "@/lib/voice-recording";
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
  onSearchRequested?: (query: string, onResolved: (itemId: number) => void) => void;
  onProductSelected?: (itemId: number, quantity: number, requestedUnit?: string, onAdded?: () => void) => void;
  addedItems?: Array<{ itemId: number; quantity: number }>;
  autoFocus?: boolean;
}) {
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const parsingRef = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const appendRecording = useRef(false);
  const lastParsedIds = useRef(new Set<string>());
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recording = useRef<ReturnType<typeof createVoiceRecording> | null>(null);
  const recordingId = useRef(0);
  const { language } = useLanguage();
  const { user, currentShopId } = useAuth();
  const mr = language === "mr";
  const label = (english: string, marathi: string) => mr ? marathi : english;
  const productName = (item: any) => {
    if (!item) return "";
    const name = mr ? item.nameMarathi || item.name : item.name;
    const brand = mr ? item.brandMarathi || item.brand : item.brand;
    return brand ? `${name} (${brand})` : name;
  };
  const unitLabel = (unit: string) => mr ? ({ kg: "किलो", g: "ग्रॅम", l: "लिटर", ml: "मिली", pcs: "नग", packet: "पॅकेट", pack: "पॅकेट", dozen: "डझन", box: "डबा" } as Record<string, string>)[unit] || unit : unit;

  useEffect(() => () => {
    recordingId.current += 1;
    recording.current?.cancel();
    requestController.current?.abort();
    requestController.current = null;
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const resolveDraftLine = (line: Draft) => {
    const item = items.find((candidate) => candidate.id === line.selectedId);
    if (!item) return { state: "unmatched" as const };
    const unit = units.find((candidate) => candidate.id === item.unitId);
    const unitName = unit?.shortForm || "unit";
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) return { state: "quantity" as const };
    const quantity = convertVoiceQuantity(line.quantity, line.requestedUnit, unitName);
    if (quantity === null) return { state: "unit" as const, item, unitName };
    if (item.sellPrice == null || item.buyPrice == null || !Number.isFinite(Number(item.sellPrice)) || Number(item.sellPrice) < 0 ||
        !Number.isFinite(Number(item.buyPrice)) || !Number.isFinite(Number(item.quantity))) {
      return { state: "variant" as const, item };
    }
    if (line.variant || line.priceOverride != null) return { state: "variant" as const, item };
    const stock = checkVoiceStock({...item, quantity: Number(item.quantity)}, quantity,
      addedItems.filter((entry) => entry.itemId === item.id).reduce((sum, entry) => sum + entry.quantity, 0));
    if (stock.state === "invalid") return { state: "variant" as const, item };
    if (stock.state !== "ready") return { ...stock, item };
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
      requestedUnit?: string;
      priceOverride?: number;
      variant?: string;
      productId?: number | null;
      needsClarification?: boolean;
    }>,
  ) => {
    const uniqueRequests = requests.reduce<typeof requests>(
      (result, request) => {
        const query = normalizeVoiceText(
          request.productName || request.productQuery || "",
        );
        const key = `${query}|${request.requestedUnit || request.unit || ""}|${request.priceOverride ?? ""}|${request.productId ?? ""}`;
        const previous = result.find((entry) => {
          const previousQuery = normalizeVoiceText(
            entry.productName || entry.productQuery || "",
          );
          return (
            (request.quantity ?? 1) > 0 && (entry.quantity ?? 1) > 0 &&
            request.needsClarification === entry.needsClarification &&
            `${previousQuery}|${entry.requestedUnit || entry.unit || ""}|${entry.priceOverride ?? ""}|${entry.productId ?? ""}` ===
            key
          );
        });
        if (previous) {
          previous.quantity =
            (previous.quantity ?? 1) + (request.quantity ?? 1);
        } else {
          result.push({ ...request });
        }
        return result;
      },
      [],
    );

    const lines = uniqueRequests.map((request) => {
      const query = request.productName || request.productQuery || "";
      const local = matchVoiceProducts(query, items);
      const selectedId = request.needsClarification ? null : request.productId !== undefined ? request.productId : local.selectedId;
      const candidates = shortlistVoiceProducts(query, items);
      const selected = items.find((item) => item.id === selectedId);
      if (selected && !candidates.some((item) => item.id === selectedId)) candidates.unshift(selected);
      return {
        id: crypto.randomUUID(),
        query,
        quantity: request.quantity ?? 1,
        requestedUnit: request.requestedUnit || request.unit,
        priceOverride: request.priceOverride,
        variant: request.variant,
        candidates,
        selectedId,
      };
    });
    const append = appendRecording.current;
    const replacedIds = lastParsedIds.current;
    setDraft((current) => [...(append ? current : current.filter((entry) => !replacedIds.has(entry.id))), ...lines]);
    lastParsedIds.current = new Set(lines.map((entry) => entry.id));
    setMessage(label("Check the items, then add them to the bill.", "वस्तू तपासा आणि बिलात जोडा."));
  };

  const parseTranscript = async (rawTranscript: string) => {
    const cleaned = rawTranscript.trim();
    if (!cleaned || parsingRef.current) return;
    parsingRef.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 14000);
    setBusy(true);
    try {
      setMessage(label("Checking products and stock…", "वस्तू आणि साठा तपासत आहे…"));
      const parsed: Parameters<typeof buildDraft>[0] = parseVoiceSaleCommand(cleaned);
      const uncertain = parsed.map((entry, index) => ({entry, index}))
        .filter(({entry}) => matchVoiceProducts(entry.productQuery || "", items).selectedId === null)
        .map(({entry, index}) => ({ index, productQuery: entry.productQuery || "", quantity: entry.quantity ?? 1,
          requestedUnit: entry.requestedUnit, priceOverride: entry.priceOverride,
          candidateIds: shortlistVoiceProducts(entry.productQuery || "", items).map((item) => item.id),
        })).filter((entry) => entry.candidateIds.length > 0);
      let usedFallback = false;
      if (uncertain.length && uncertain.length <= 20 && parsed.length <= 40 && cleaned.length <= 2000 && user?.id && user.password && currentShopId && navigator.onLine) {
        try {
          const response = await fetch("/api/voice-sale/resolve", {
            method: "POST", headers: {"Content-Type": "application/json"}, signal: controller.signal,
            body: JSON.stringify({ transcript: cleaned, shopId: currentShopId, userId: user.id, password: user.password, lines: uncertain }),
          });
          if (!response.ok) throw new Error("Unavailable");
          const result = validateVoiceAIResult(await response.json(), uncertain);
          for (const line of result.lines) {
            parsed[line.index] = {...parsed[line.index], productId: line.productId, quantity: line.quantity,
              requestedUnit: parsed[line.index].requestedUnit || line.unit || undefined,
              priceOverride: parsed[line.index].priceOverride ?? line.price ?? undefined,
              needsClarification: line.needsClarification };
          }
        } catch {
          usedFallback = true;
        }
      }
      // A cancelled request must never restore a discarded review.
      if (requestController.current !== controller) return;
      if (parsed.length > 0) {
        buildDraft(parsed);
        appendRecording.current = false;
        if (usedFallback) setMessage(label("Check the suggested products below, or search by name.", "खालील सुचवलेल्या वस्तू तपासा किंवा नावाने शोधा."));
      } else {
        setMessage(
          label("No products recognised. Edit the words below or search.", "वस्तू ओळखता आल्या नाहीत. खाली शब्द दुरुस्त करा किंवा शोधा."),
        );
      }
    } finally {
      window.clearTimeout(timer);
      if (requestController.current === controller) {
        requestController.current = null;
        parsingRef.current = false;
        setBusy(false);
      }
    }
  };

  const review = async () => {
    await parseTranscript(command.trim());
  };

  const parseLatest = useRef(parseTranscript);
  parseLatest.current = parseTranscript;

  const startListening = () => {
    if (typeof window === "undefined" || recording.current) return;
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => RecognitionEngine;
      webkitSpeechRecognition?: new () => RecognitionEngine;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage(label("Voice unavailable here. Use product search.", "येथे आवाजाने नोंद उपलब्ध नाही. वस्तू शोधून जोडा."));
      return;
    }
    appendRecording.current = true;
    setCommand("");
    setListening(true);
    setMessage(label("Listening… tap Done when finished.", "ऐकत आहे… बोलून झाल्यावर पूर्ण झाले दाबा."));
    const id = ++recordingId.current;
    const session = createVoiceRecording(() => new Recognition(), "mr-IN", {
      onText: (text) => { if (recordingId.current === id) setCommand(text); },
      onFinish: (text) => {
        if (recordingId.current !== id) return;
        recording.current = null;
        setListening(false);
        if (text) void parseLatest.current(text);
        else setMessage(label("Nothing was heard. Try again.", "आवाज ऐकू आला नाही. पुन्हा बोला."));
      },
      onError: (code) => {
        if (recordingId.current !== id) return;
        recording.current = null;
        setListening(false);
        const errors: Record<string, [string, string]> = {
          network: ["Connection lost. Edit the saved words or try again.", "इंटरनेट जोडणी तुटली. ऐकलेले शब्द दुरुस्त करा किंवा पुन्हा बोला."],
          "not-allowed": ["Allow microphone access in the browser, then try again.", "ब्राउझरमध्ये माइकची परवानगी द्या आणि पुन्हा प्रयत्न करा."],
          "service-not-allowed": ["Speech recognition is blocked in this browser. Use search.", "ब्राउझरने आवाज ओळखण्याची सुविधा बंद केली आहे. शोध वापरा."],
          "audio-capture": ["No microphone found. Connect it or use search.", "माइक सापडला नाही. माइक जोडा किंवा शोध वापरा."],
          "language-not-supported": ["Marathi speech is unavailable in this browser. Use product search.", "या ब्राउझरमध्ये मराठी आवाज ओळखता येत नाही. वस्तू शोधून जोडा."],
          "no-speech": ["Nothing more was heard. Check the saved words below.", "पुढील आवाज ऐकू आला नाही. खालील शब्द तपासा."],
          "time-limit": ["Recording stopped after two minutes. Check the saved words below.", "दोन मिनिटांनंतर रेकॉर्डिंग थांबले. खालील शब्द तपासा."],
        };
        const error = errors[code] || ["Voice stopped. Check the saved words or try again.", "रेकॉर्डिंग थांबले. ऐकलेले शब्द तपासा किंवा पुन्हा बोला."];
        setMessage(label(error[0], error[1]));
      },
    });
    recording.current = session;
    session.start();
  };
  const stopListening = () => recording.current?.stop();
  const cancelVoice = () => {
    requestController.current?.abort();
    requestController.current = null;
    parsingRef.current = false;
    setBusy(false);
    recordingId.current += 1;
    recording.current?.cancel();
    recording.current = null;
    setListening(false);
    setCommand("");
    appendRecording.current = false;
    setMessage(label("Recording cancelled. Reviewed items are kept.", "रेकॉर्डिंग रद्द झाले. तपासलेल्या वस्तू तशाच आहेत."));
  };
  const choose = (id: string, selectedId: number) => {
    setDraft((current) => current.map((line) => line.id === id ? {...line, selectedId} : line));
    setCommand("");
  };
  const removeDraftLine = (id: string) => {
    setDraft((current) => current.filter((line) => line.id !== id));
    setCommand("");
  };
  // Reserve quantities in spoken order as well as quantities already in the bill.
  const reserved = new Map<number, number>();
  const reviewed = draft.map((line) => {
    const result = resolveDraftLine(line);
    if (result.state !== "ready") return { line, result };
    const sale = result.saleLine;
    const item = items.find((entry) => entry.id === sale.itemId);
    const available = Math.max(0, Number((Number(item?.quantity || 0)
      - addedItems.filter((entry) => entry.itemId === sale.itemId).reduce((sum, entry) => sum + entry.quantity, 0)
      - (reserved.get(sale.itemId) || 0)).toFixed(6)));
    if (sale.quantity > available) return { line, result: { state: "insufficient" as const, available, item } };
    reserved.set(sale.itemId, (reserved.get(sale.itemId) || 0) + sale.quantity);
    return { line, result };
  });
  const ready = reviewed.filter((entry) => entry.result.state === "ready");
  const addConfirmed = () => {
    const ids = new Set<string>();
    setCommand("");
    ready.forEach(({ line, result }) => {
      if (result.state === "ready") { onAdd(result.saleLine); ids.add(line.id); }
    });
    setDraft((current) => current.filter((line) => !ids.has(line.id)));
    setMessage(label(`${ids.size} products added to the bill.`, `${ids.size} वस्तू बिलात जोडल्या.`));
    if (ids.size === draft.length) { setCommand("");  }
  };
  const searchInstead = (line: Draft) => {
    onSearchRequested?.(line.query, (itemId) => choose(line.id, itemId));
    setMessage(label("Choose a product in search to replace this item.", "ही वस्तू बदलण्यासाठी शोधातून वस्तू निवडा."));
  };

  return (
    <section lang={mr ? "mr" : "en"} className="rounded-2xl border border-violet-100 bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy} onClick={listening ? stopListening : startListening}
          className={`h-12 shrink-0 gap-2 rounded-xl ${listening ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"}`}>
          <Mic className="h-5 w-5" />{listening ? label("Done", "पूर्ण झाले") : busy ? label("Checking…", "तपासत आहे…") : label("Speak order", "बोलून वस्तू जोडा")}
        </Button>
        {(busy || listening) && <Button type="button" variant="outline" onClick={cancelVoice}>{label("Cancel", "रद्द करा")}</Button>}
        {<p role="status" className="text-xs text-slate-600">{message || label("Try: two Parle-G and half a litre of milk.", "उदा. दोन पार्ले जी आणि अर्धा लिटर दूध")}</p>}
      </div>
      {listening && command && <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">“{command}”</p>}
      {!listening && command && draft.length === 0 && <div className="mt-3 space-y-2">
        <label className="text-xs text-slate-600" htmlFor="voice-recovery">{label("Edit what was heard", "ऐकलेले शब्द दुरुस्त करा")}</label>
        <Input ref={inputRef} id="voice-recovery" value={command} onChange={(event) => setCommand(event.target.value)} />
        <Button type="button" variant="outline" disabled={busy} onClick={review}>{label("Check these words", "हे शब्द तपासा")}</Button>
      </div>}
      {draft.length > 0 && <fieldset disabled={listening || busy} className="mt-3 min-w-0 space-y-2 disabled:opacity-60">
        <div className={`rounded-xl p-3 ${ready.length > 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
          {ready.length > 0 ? <>
            <p className="font-semibold text-emerald-900">{ready.length} {label("ready", "तयार")} · ₹{ready.reduce((sum, entry) => sum + (entry.result.state === "ready" ? entry.result.saleLine.totalPrice : 0), 0).toFixed(2)}</p>
            {draft.length > ready.length && <p className="mt-0.5 text-xs text-amber-800">{draft.length - ready.length} {label("to check", "वस्तू तपासा")}</p>}
          </> : <>
            <p className="font-semibold text-amber-950">{draft.length} {label("to check", "वस्तू तपासा")}</p>
            <p className="mt-0.5 text-xs text-amber-800">{label("Choose another product or remove the item.", "दुसरी वस्तू निवडा किंवा ही वस्तू काढा.")}</p>
          </>}
        </div>

        {reviewed.map(({line, result}) => {
          const selectedItem = items.find((item) => item.id === line.selectedId);
          const unitName = line.requestedUnit || units.find((unit) => unit.id === selectedItem?.unitId)?.shortForm || "";
          return <div key={line.id} className={`rounded-xl border p-3 ${result.state === "ready" ? "border-emerald-200 bg-white" : "border-amber-200 bg-amber-50/40"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{productName(selectedItem) || line.query}</p>
                <p className="mt-0.5 text-xs text-slate-500">{line.quantity} {unitLabel(unitName)}</p>
              </div>
              {result.state === "ready" && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{label("Ready", "तयार")} · ₹{result.saleLine.totalPrice.toFixed(2)}</span>}
            </div>

            {result.state === "unit" && <p className="mt-2 text-sm text-amber-900">{label("Check the unit. This product is sold in", "एकक तपासा. ही वस्तू या एककात विकली जाते:")} {unitLabel(result.unitName)}. <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => current.map((entry) => entry.id === line.id ? {...entry, requestedUnit: undefined} : entry))}>{label("Use", "वापरा")} {line.quantity} {unitLabel(result.unitName)}</Button></p>}
            {result.state === "expired" && <p className="mt-2 text-sm font-medium text-red-700">{label("This stock is expired.", "या साठ्याची मुदत संपली आहे.")}</p>}
            {result.state === "quantity" && <p className="mt-2 text-sm font-medium text-amber-900">{label("Enter a quantity greater than zero.", "शून्यापेक्षा जास्त प्रमाण भरा.")}</p>}
            {result.state === "variant" && <p className="mt-2 text-sm font-medium text-amber-900">{label("Choose the correct price or pack.", "योग्य किंमत किंवा पॅक निवडा.")}{line.priceOverride != null ? ` (₹${line.priceOverride})` : ""}</p>}
            {result.state === "insufficient" && <p className="mt-2 text-sm font-medium text-amber-900">{result.available > 0 ? label(`Only ${result.available} available for this bill.`, `या बिलासाठी फक्त ${result.available} उपलब्ध आहेत.`) : label("No stock remaining for this bill.", "या बिलासाठी साठा शिल्लक नाही.")}</p>}
            {result.state === "unmatched" && <div className="mt-2">
              <p className="text-sm font-medium text-amber-900">{line.candidates.length ? label("Which product?", "कोणती वस्तू हवी?") : label("Product not found. Search using another name.", "वस्तू सापडली नाही. दुसऱ्या नावाने शोधा.")}</p>
              {line.candidates.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{line.candidates.map((item) => <Button type="button" key={item.id} variant="outline" size="sm" className="h-auto whitespace-normal bg-white text-left" onClick={() => choose(line.id,item.id)}>{productName(item)} · ₹{item.sellPrice}</Button>)}</div>}
            </div>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {result.state === "insufficient" && result.available > 0 && <Button type="button" size="sm" onClick={() => setDraft((current) => current.map((entry) => entry.id === line.id ? {...entry, quantity: result.available, requestedUnit: undefined} : entry))}>{result.available} {label("available — use these", "उपलब्ध — वापरा")}</Button>}
              {result.state === "variant" && <Button type="button" size="sm" onClick={() => { onProductSelected?.(line.selectedId!, line.quantity, line.requestedUnit, () => removeDraftLine(line.id)); }}>{label("Choose price / pack", "किंमत / पॅक निवडा")}</Button>}
              {result.state !== "ready" && onSearchRequested && <Button type="button" size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => searchInstead(line)}>{label("Find replacement", "दुसरी वस्तू शोधा")}</Button>}
              <details open={result.state === "quantity" ? true : undefined} className="text-xs text-slate-500">
                <summary className="cursor-pointer px-1 py-2">{label("Edit quantity", "प्रमाण बदला")}</summary>
                <div className="mt-1 flex items-center gap-2">
                  <Input aria-label={`Quantity for ${selectedItem?.name || line.query}`} type="number" min="0.001" step="any" className="h-9 w-24 bg-white" value={line.quantity} onChange={(event) => setDraft((current) => current.map((entry) => entry.id === line.id ? {...entry, quantity: Number(event.target.value)} : entry))} />
                  <span>{unitLabel(unitName)}</span>
                </div>
              </details>
              <Button type="button" variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => removeDraftLine(line.id)}>{label("Remove", "काढा")}</Button>
            </div>
          </div>;
        })}

        {ready.length > 0 && <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy || listening} onClick={addConfirmed}>{label(`Add ${ready.length} items to bill`, `${ready.length} वस्तू बिलात जोडा`)}</Button>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {command && <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">{label("Edit what was heard", "ऐकलेले शब्द दुरुस्त करा")}</summary>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row"><Input aria-label={label("Correct spoken order", "ऐकलेले शब्द दुरुस्त करा")} value={command} onChange={(event) => setCommand(event.target.value)} /><Button type="button" variant="outline" disabled={busy || listening} onClick={review}>{label("Update", "दुरुस्त करा")}</Button></div>
          </details>}
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => {setDraft([]); setCommand(""); setMessage("");}}>{label("Clear all", "सर्व काढा")}</Button>
        </div>
      </fieldset>}
    </section>
  );
}
