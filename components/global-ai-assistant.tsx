"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeminiUnderstanding } from "@/hooks/use-gemini";

type Action = { label: string; href?: string; prompt?: string };
type Message = { role: "user" | "assistant"; text: string; actions?: Action[] };
const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

export function GlobalAiAssistant({ items, sales, customers }: { items: any[]; sales: any[]; customers: any[] }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { understand, isLoading } = useGeminiUnderstanding();
  const snapshot = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter((sale) => new Date(sale.createdAt || sale.timestamp || sale.date).toDateString() === today);
    const revenue = todaySales.reduce((sum, sale) => sum + Number(sale.subtotal || sale.total || 0), 0);
    const lowStock = items.filter((item) => Number(item.lowStockLimit || 0) > 0 && Number(item.quantity || 0) <= Number(item.lowStockLimit || 0));
    const debtors = customers.filter((customer) => Number(customer.balance || 0) > 0).sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    return { todaySales, revenue, lowStock, debtors };
  }, [items, sales, customers]);

  const localReply = (input: string): Omit<Message, "role"> | null => {
    const query = input.toLowerCase();
    if (/low\s+(?:in\s+)?stock|stock.*low|reorder|restock/.test(query)) {
      const rows = snapshot.lowStock.slice(0, 4).map((item) => item.name + " — " + item.quantity + " left").join("\n");
      return snapshot.lowStock.length ? { text: "Here is what needs attention:\n" + rows, actions: [{ label: "Open low stock", href: "/items?stock=lowStock" }] } : { text: "Good news — no item with an alert limit is running low.", actions: [{ label: "View inventory", href: "/items" }] };
    }
    if (/today.*(?:sales|revenue|profit)|(?:sales|revenue|profit).*today/.test(query)) return { text: "Today you have ₹" + money(snapshot.revenue) + " from " + snapshot.todaySales.length + " sale" + (snapshot.todaySales.length === 1 ? "" : "s") + ".", actions: [{ label: "View sales", href: "/sales" }, { label: "See report", href: "/reports/overview?period=today" }] };
    if (/udhari|credit|owe|outstanding|due/.test(query)) {
      const top = snapshot.debtors[0];
      return top ? { text: top.name + " has the highest outstanding balance: ₹" + money(Number(top.balance || 0)) + ".", actions: [{ label: "Review udhari", href: "/udhari" }] } : { text: "There are no outstanding udhari balances right now.", actions: [{ label: "Open udhari", href: "/udhari" }] };
    }
    return null;
  };

  const ask = async (prompt?: string) => {
    const input = (prompt || question).trim();
    if (!input || isLoading) return;
    setMessages((current) => [...current, { role: "user", text: input }]);
    setQuestion("");
    const direct = localReply(input);
    if (direct) return setMessages((current) => [...current, { role: "assistant", ...direct }]);
    const result = await understand(input, "text", items.slice(0, 80), [], { availableCustomers: customers.slice(0, 50).map((customer) => ({ name: customer.name, balance: Number(customer.balance || 0) })), salesSummary: { today: snapshot.revenue, transactionCount: sales.length } });
    const reply = result?.data?.rawParsing || result?.data?.action;
    setMessages((current) => [...current, { role: "assistant", text: reply || "I can help with sales, stock, and udhari. Try asking about one of those.", actions: [{ label: "Low stock", prompt: "Which items are low in stock?" }, { label: "Today’s sales", prompt: "What are today's sales?" }] }]);
  };

  const prompts = ["Give me a shop health check", "Which items are low in stock?", "Who has the highest udhari?"];
  return <div className="relative">
    <Button type="button" onClick={() => setOpen((value) => !value)} className="h-9 gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Dukan AI</span></Button>
    {open && <div className="fixed inset-x-3 top-18 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[30rem] sm:max-w-[calc(100vw-2rem)]"><section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl shadow-slate-900/20">
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 px-5 py-4 text-white"><div className="relative flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-base font-bold"><Bot className="h-5 w-5" /> Dukan AI</p><p className="mt-1 text-xs text-violet-100">Your shop’s live co-pilot</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></Button></div></header>
      <div className="p-4"><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Today</p><p className="mt-1 text-sm font-bold text-emerald-950">₹{money(snapshot.revenue)}</p></div><div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Reorder</p><p className="mt-1 text-sm font-bold text-amber-950">{snapshot.lowStock.length} items</p></div><div className="rounded-xl bg-orange-50 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">Udhari</p><p className="mt-1 truncate text-sm font-bold text-orange-950">{snapshot.debtors.length} due</p></div></div>
      {messages.length === 0 && <div className="mt-4"><p className="text-xs font-semibold text-slate-500">Ask Dukan AI</p><div className="mt-2 flex flex-wrap gap-1.5">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{prompt}</button>)}</div></div>}
      {messages.length > 0 && <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2">{messages.map((message, index) => <div key={message.role + index} className={message.role === "user" ? "ml-8" : "mr-4"}><div className={message.role === "user" ? "rounded-2xl rounded-tr-sm bg-violet-600 px-3 py-2 text-sm text-white" : "rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"}><div className="whitespace-pre-wrap">{message.text}</div>{message.actions && <div className="mt-2 flex flex-wrap gap-1.5">{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href} className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{action.label}<ArrowUpRight className="h-3 w-3" /></Link> : <button key={action.label} type="button" onClick={() => void ask(action.prompt)} className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{action.label}</button>)}</div>}</div></div>)}</div>}
      <div className="mt-3 flex gap-2"><Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void ask()} placeholder="Ask about your shop…" className="h-10 rounded-xl" autoFocus /><Button type="button" size="icon" onClick={() => void ask()} disabled={!question.trim() || isLoading} className="h-10 w-10 rounded-xl">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div></div>
    </section></div>}
  </div>;
}
