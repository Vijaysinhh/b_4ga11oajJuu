"use client";

import { useMemo, useRef, useState } from "react";
import { Mic, Search, Volume2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeVoiceText,
  parseVoiceSaleCommand,
} from "@/lib/voice-sale-parser";
import { useGeminiUnderstanding } from "@/hooks/use-gemini";

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

export function VoiceSaleAssistant({
  items,
  units,
  onAdd,
}: {
  items: any[];
  units: any[];
  onAdd: (line: SaleLine) => void;
}) {
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [useGemini, setUseGemini] = useState(false);
  const [geminiParsing, setGeminiParsing] = useState(false);
  const recognition = useRef<any>(null);
  const keepListening = useRef(false);
  const { parseVoiceCommand } = useGeminiUnderstanding();

  const inStockItems = useMemo(
    () => items.filter((item) => Number(item.quantity) > 0),
    [items],
  );

  const processCommandWithGemini = async () => {
    if (!command.trim()) return;
    setGeminiParsing(true);
    setFeedback(["Processing with AI…"]);

    try {
      const result = await parseVoiceCommand(command, items, units);

      if (!result || !result.data) {
        setFeedback(["Failed to parse with AI, trying standard method…"]);
        processCommandFallback();
        return;
      }

      const requests = result.data;
      const messages: string[] = [];
      let added = 0;

      for (const request of requests) {
        const { productName, quantity } = request;

        // Find matching item
        const match = inStockItems.find((item) => {
          const normalized = normalizeVoiceText(productName);
          return (
            normalizeVoiceText(item.name) === normalized ||
            normalizeVoiceText(item.nameMarathi) === normalized ||
            normalizeVoiceText(`${item.name} ${item.brand || ""}`) ===
              normalized
          );
        });

        if (!match) {
          messages.push(`Not found: "${productName}"`);
          continue;
        }

        if (Number(match.quantity) < quantity) {
          messages.push(
            `${match.name}: only ${match.quantity} available (requested ${quantity}).`,
          );
          continue;
        }

        const unit = units.find((candidate) => candidate.id === match.unitId);
        const label = match.brand
          ? `${match.name} (${match.brand})`
          : match.name;

        onAdd({
          itemId: match.id,
          itemName: label,
          quantity,
          displayQuantity: `${quantity} ${unit?.shortForm || "unit"}`,
          unitId: match.unitId,
          unitShortForm: unit?.shortForm || "unit",
          pricePerUnit: Number(match.sellPrice),
          totalPrice: quantity * Number(match.sellPrice),
          costPerUnit: Number(match.buyPrice),
          totalCost: quantity * Number(match.buyPrice),
        });
        messages.push(`Added ${quantity} × ${label}.`);
        added += 1;
      }

      setFeedback(
        messages.length ? messages : ["I could not understand that command."],
      );
      if (added) setCommand("");
    } catch (error) {
      console.error("Error with Gemini parsing:", error);
      setFeedback(["AI parsing failed, using standard method…"]);
      processCommandFallback();
    } finally {
      setGeminiParsing(false);
    }
  };

  const processCommandFallback = () => {
    if (!command.trim()) return;
    const requests = parseVoiceSaleCommand(command);
    const messages: string[] = [];
    let added = 0;

    for (const request of requests) {
      const { quantity, productQuery: query } = request;
      const terms = normalizeVoiceText(query)
        .split(" ")
        .filter((term) => term.length > 1);
      const match = inStockItems
        .map((item) => {
          const searchable = normalizeVoiceText(
            `${item.name || ""} ${item.nameMarathi || ""} ${item.brand || ""} ${item.brandMarathi || ""}`,
          );
          const exactName =
            normalizeVoiceText(`${item.name || ""} ${item.brand || ""}`) ===
            normalizeVoiceText(query);
          const fullQueryMatch = searchable.includes(normalizeVoiceText(query));
          const score =
            terms.filter((term) => searchable.includes(term)).length +
            (exactName ? 3 : 0) +
            (fullQueryMatch ? 2 : 0);
          return { item, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)[0]?.item;

      if (!match) {
        messages.push(`Not found: “${query || request}”`);
        continue;
      }
      if (Number(match.quantity) < quantity) {
        messages.push(
          `${match.name}: only ${match.quantity} available (requested ${quantity}).`,
        );
        continue;
      }
      const unit = units.find((candidate) => candidate.id === match.unitId);
      const label = match.brand ? `${match.name} (${match.brand})` : match.name;
      onAdd({
        itemId: match.id,
        itemName: label,
        quantity,
        displayQuantity: `${quantity} ${unit?.shortForm || "unit"}`,
        unitId: match.unitId,
        unitShortForm: unit?.shortForm || "unit",
        pricePerUnit: Number(match.sellPrice),
        totalPrice: quantity * Number(match.sellPrice),
        costPerUnit: Number(match.buyPrice),
        totalCost: quantity * Number(match.buyPrice),
      });
      messages.push(`Added ${quantity} × ${label}.`);
      added += 1;
    }
    setFeedback(
      messages.length ? messages : ["I could not understand that command."],
    );
    if (added) setCommand("");
  };

  const processCommand = () => {
    if (useGemini) {
      processCommandWithGemini();
    } else {
      processCommandFallback();
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback([
        "Voice recognition is not available in this browser. Use Chrome or Edge, or type the command instead.",
      ]);
      return;
    }
    recognition.current?.abort?.();
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = "mr-IN";
    instance.interimResults = true;
    instance.continuous = true;
    keepListening.current = true;
    instance.onstart = () => {
      setListening(true);
      setFeedback(["Listening… say all products and quantities, then pause."]);
    };
    instance.onresult = (event: any) => {
      const heard = Array.from(event.results as any[])
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setCommand(heard);
      if (event.results[event.results.length - 1]?.isFinal)
        setFeedback([`Heard: “${heard}”. Tap Add to update this sale cart.`]);
    };
    instance.onend = () => {
      if (keepListening.current) {
        try {
          instance.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    instance.onerror = (event: any) => {
      keepListening.current = false;
      setListening(false);
      const errors: Record<string, string> = {
        "not-allowed":
          "Microphone permission is blocked. Allow microphone access in your browser, then try again.",
        "no-speech":
          "No speech was detected. Tap Speak, wait for Listening, then say the items clearly.",
        "audio-capture":
          "No microphone was found. Connect or enable a microphone, then try again.",
        network:
          "Your browser's speech service is unavailable. Type the command instead, or try Chrome with an internet connection.",
      };
      setFeedback([
        errors[event.error] ||
          "Voice input stopped. You can tap Speak again or type the command.",
      ]);
    };
    instance.start();
  };

  const stopListening = () => {
    keepListening.current = false;
    recognition.current?.stop?.();
    setListening(false);
  };

  return (
    <div className="mb-4 border-b border-border pb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Add multiple items by voice or text
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseGemini(!useGemini)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              useGemini
                ? "bg-violet-100 text-violet-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Use AI-powered parsing (Gemini)"
          >
            <Sparkles className="h-3 w-3" />
            AI
          </button>
          <span className="text-[11px] text-muted-foreground">
            Results go to this sale cart
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Volume2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
          <Input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && processCommand()}
            disabled={geminiParsing}
            className="bg-white pl-9"
            placeholder="e.g. दोन Parle-G आणि 3 bread add करा"
          />
        </div>
        <Button
          type="button"
          onClick={listening ? stopListening : startListening}
          variant="outline"
          className="border-violet-300 text-violet-700 hover:bg-violet-50"
        >
          <Mic className="mr-2 h-4 w-4" />
          {listening ? "Stop" : "Speak"}
        </Button>
        <Button
          type="button"
          onClick={processCommand}
          disabled={geminiParsing}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
        >
          {geminiParsing ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Add
            </>
          )}
        </Button>
      </div>
      {feedback.length > 0 && (
        <div className="mt-2 space-y-1 rounded-md bg-muted/60 p-2 text-xs">
          {feedback.map((message, index) => (
            <p
              key={`${message}-${index}`}
              className={
                message.startsWith("Not found") || message.includes("only")
                  ? "text-amber-700"
                  : message.includes("AI") || message.includes("Processing")
                    ? "text-blue-700"
                    : "text-emerald-700"
              }
            >
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
