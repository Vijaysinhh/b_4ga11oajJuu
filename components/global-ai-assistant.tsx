"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Loader2, Mic, Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeminiUnderstanding } from "@/hooks/use-gemini";
import { useVoiceSearch } from "@/hooks/use-voice-search";

type Action = { label: string; href?: string; prompt?: string };
type Message = { role: "user" | "assistant"; text: string; actions?: Action[] };
type LocalAnswer = Pick<Message, "text" | "actions">;
const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

export function GlobalAiAssistant({ items, sales, customers, language, pathname }: { items: any[]; sales: any[]; customers: any[]; language: "en" | "mr"; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } = useVoiceSearch({ language: language === "mr" ? "mr-IN" : "en-US" });
  const { understand, isLoading } = useGeminiUnderstanding();

  const snapshot = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter((sale) => {
      const date = new Date(sale.createdAt || sale.timestamp || sale.date);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today;
    });
    return {
      todaySales,
      revenue: todaySales.reduce((total, sale) => total + Number(sale.subtotal || sale.total || 0), 0),
      profit: todaySales.reduce((total, sale) => total + Number(sale.totalProfit || 0), 0),
      lowStock: items.filter((item) => Number(item.lowStockLimit || 0) > 0 && Number(item.quantity || 0) <= Number(item.lowStockLimit || 0)).sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0)),
      debtors: customers.filter((customer) => Number(customer.balance || 0) > 0).sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0)),
    };
  }, [customers, items, sales]);

  const getLocalAnswer = (input: string): LocalAnswer | null => {
    const query = input.toLocaleLowerCase();
    const asksAboutStock = /low\s+(?:in\s+)?stock|stock\s+(?:is\s+)?low|running\s+low|running\s+out|reorder|restock|कमी.*स्टॉक/.test(query);
    const asksAboutSales = /today.*(?:sales|revenue|profit)|(?:sales|revenue|profit).*today|aaj.*sale|आज.*विक्री/.test(query);
    const asksAboutUdhari = /highest.*(?:udhari|credit|due|outstanding)|(?:udhari|credit|owe|outstanding|due).*highest|udhari|credit|owe|outstanding|due|उधारी/.test(query);
    if (/start.*sale|new.*sale|add.*sale|create.*bill|make.*bill|sell\s|विक्री.*कर/.test(query)) {
      return {
        text: "I’ll open a sale draft. Tell it the products and quantities by voice or text, then review the cart before saving.",
        actions: [{ label: "Start AI sale", href: "/sales?ai=voice" }],
      };
    }
    if (asksAboutStock) {
      if (!snapshot.lowStock.length) return { text: "Stock looks healthy — no item with an alert limit is currently running low.", actions: [{ label: "Open inventory", href: "/items" }] };
      const list = snapshot.lowStock.slice(0, 5).map((item, index) => `${index + 1}. ${item.name} — ${item.quantity} ${item.unitShortForm || "units"} left (alert at ${item.lowStockLimit})`).join("\n");
      return { text: `Reorder these ${snapshot.lowStock.length} item${snapshot.lowStock.length === 1 ? "" : "s"}:\n${list}${snapshot.lowStock.length > 5 ? `\n+${snapshot.lowStock.length - 5} more items` : ""}`, actions: [{ label: "Open low stock", href: "/items?stock=lowStock" }] };
    }
    if (asksAboutSales) {
      return { text: `Today: ₹${money(snapshot.revenue)} from ${snapshot.todaySales.length} sale${snapshot.todaySales.length === 1 ? "" : "s"}.${snapshot.profit ? ` Recorded profit is ₹${money(snapshot.profit)}.` : ""}`, actions: [{ label: "View sales", href: "/sales" }, { label: "Open report", href: "/reports/overview?period=today" }] };
    }
    if (asksAboutUdhari) {
      const named = snapshot.debtors.find((customer) => query.includes(String(customer.name || "").toLocaleLowerCase()));
      if (named) return { text: `${named.name} has ₹${money(Number(named.balance || 0))} outstanding.`, actions: [{ label: "Open udhari", href: "/udhari" }] };
      if (!snapshot.debtors.length) return { text: "There are no outstanding udhari balances right now.", actions: [{ label: "Open udhari", href: "/udhari" }] };
      const top = snapshot.debtors[0];
      return { text: `${top.name} has the highest outstanding udhari: ₹${money(Number(top.balance || 0))}.`, actions: [{ label: "Review udhari", href: "/udhari" }] };
    }
    return null;
  };

  useEffect(() => { if (transcript) setQuestion(transcript); }, [transcript]);
  const reply = (answer: LocalAnswer) => setMessages((current) => [...current, { role: "assistant", ...answer }]);
  const ask = async (prompt?: string) => {
    const input = (prompt ?? question).trim();
    if (!input || isLoading) return;
    setMessages((current) => [...current, { role: "user", text: input }]);
    setQuestion("");
    const local = getLocalAnswer(input);
    if (local) return reply(local);
    const result = await understand(input, "text", items.slice(0, 100), [], {
      language,
      availableCustomers: customers.slice(0, 100).map((customer) => ({ name: customer.name, phone: customer.phone, balance: Number(customer.balance || 0) })),
      salesSummary: { today: snapshot.revenue, transactionCount: sales.length },
      conversationHistory: messages.slice(-6).map(({ role, text }) => ({ role, text })),
    });
    const parsed = result?.data;
    if (!parsed || parsed.intent === "unknown") return reply({ text: "I can reliably help with today’s sales, low stock, and udhari. For broader questions, connect Gemini in your environment settings and try again.", actions: [{ label: "Today’s sales", prompt: "What are today's sales?" }, { label: "Low stock", prompt: "Which items are low in stock?" }] });
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 2) : [];
    reply({ text: parsed.rawParsing || parsed.action || "I understood your request. What would you like to do next?", actions: suggestions.map((text: string) => ({ label: text, prompt: text })) });
  };
  const quick = ["Start a new sale", "What are today's sales?", "Which items are low in stock?", "Who has the highest udhari?"];

  return <div className="relative">
    <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)} className="h-9 shrink-0 gap-1.5 rounded-full border-violet-200 bg-violet-50 px-2.5 font-medium text-violet-700 shadow-sm hover:bg-violet-100 sm:px-3" aria-expanded={open} aria-label="Open Dukan AI"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Ask AI</span></Button>
    {open && <div className="fixed inset-x-3 top-18 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(29rem,calc(100vw-2rem))]"><section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl shadow-slate-900/15">
      <header className="flex items-start justify-between gap-3 bg-gradient-to-br from-violet-700 to-indigo-700 p-4 text-white"><div><div className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4" />Dukan copilot</div><p className="mt-1 text-xs text-violet-100">Instant answers from your shop data. Ask naturally.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 text-white hover:bg-white/15 hover:text-white" aria-label="Close AI assistant"><X className="h-4 w-4" /></Button></header>
      <div className="p-3 sm:p-4"><div className="mb-3 flex flex-wrap gap-1.5">{quick.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{prompt}</button>)}</div>
        {messages.length > 0 && <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-7" : "mr-4"}><div className={message.role === "user" ? "rounded-2xl rounded-tr-sm bg-violet-600 px-3 py-2 text-sm text-white" : "rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2 text-sm leading-5 text-slate-700 shadow-sm"}><div className="whitespace-pre-wrap">{message.text}</div>{message.actions?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href} className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">{action.label}<ArrowUpRight className="h-3 w-3" /></Link> : <button key={action.label} type="button" onClick={() => void ask(action.prompt)} className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">{action.label}</button>)}</div> : null}</div></div>)}</div>}
        <div className="flex gap-2"><Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} placeholder="e.g. How much does Ramesh owe?" className="h-10 rounded-xl" autoFocus />{isSupported && <Button type="button" variant="outline" size="icon" onClick={() => { if (isListening) stopListening(); else { resetTranscript(); startListening(); } }} className={isListening ? "h-10 w-10 border-red-200 text-red-600" : "h-10 w-10 border-violet-200 text-violet-600"} aria-label={isListening ? "Stop listening" : "Ask by voice"}>{isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>}<Button type="button" size="icon" onClick={() => void ask()} disabled={!question.trim() || isLoading} className="h-10 w-10 rounded-xl" aria-label="Ask AI">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
        {messages.length > 0 && <button type="button" onClick={() => setMessages([])} className="mt-2 text-[11px] text-slate-400 hover:text-slate-600">Clear conversation</button>}<p className="mt-2 text-[10px] text-slate-400">Data-aware insights · read-only · {pathname}</p>
      </div>
    </section></div>}
  </div>;
}
