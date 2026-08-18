"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Minus, PackagePlus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Product = { name: string; marathi: string; category: string; unit: string; emoji: string };

const categories = [
  { name: "All", marathi: "सर्व" }, { name: "Grocery", marathi: "किराणा" },
  { name: "Personal Care", marathi: "साबण व शॅम्पू" }, { name: "Snacks", marathi: "बिस्किटे व स्नॅक्स" },
  { name: "Drinks", marathi: "पेये" }, { name: "Pooja", marathi: "पूजा साहित्य" },
];
const allCategories = ["Grocery", "Personal Care", "Snacks", "Drinks", "Household", "Pooja"];
const units = ["KG", "Gram", "Litre", "Piece", "Box", "Packet", "Bottle", "Sachet"];
const catalog: Product[] = [
  { name: "Tata Salt 1 KG", marathi: "टाटा मीठ १ किलो", category: "Grocery", unit: "Packet", emoji: "🧂" },
  { name: "Parle-G Biscuits", marathi: "पार्ले-जी बिस्किटे", category: "Snacks", unit: "Packet", emoji: "🍪" },
  { name: "Santoor Soap 100 g", marathi: "संतूर साबण १०० ग्रॅम", category: "Personal Care", unit: "Piece", emoji: "🧼" },
  { name: "Dettol Soap 125 g", marathi: "डेटॉल साबण १२५ ग्रॅम", category: "Personal Care", unit: "Piece", emoji: "🧼" },
  { name: "Godrej No.1 Soap 100 g", marathi: "गोदरेज नं. १ साबण १०० ग्रॅम", category: "Personal Care", unit: "Piece", emoji: "🧼" },
  { name: "Lifebuoy Soap 100 g", marathi: "लाइफबॉय साबण १०० ग्रॅम", category: "Personal Care", unit: "Piece", emoji: "🧼" },
  { name: "Clinic Plus Shampoo Pouch", marathi: "क्लिनिक प्लस शॅम्पू पुडी", category: "Personal Care", unit: "Sachet", emoji: "🧴" },
  { name: "Chik Shampoo Pouch", marathi: "चिक शॅम्पू पुडी", category: "Personal Care", unit: "Sachet", emoji: "🧴" },
  { name: "Lays Classic", marathi: "लेज क्लासिक", category: "Snacks", unit: "Packet", emoji: "🥔" },
  { name: "Kurkure Masala Munch", marathi: "कुरकुरे मसाला मंच", category: "Snacks", unit: "Packet", emoji: "🌶️" },
  { name: "Bisleri Water 1 L", marathi: "बिसलेरी पाणी १ लिटर", category: "Drinks", unit: "Bottle", emoji: "💧" },
  { name: "Thums Up 750 ml", marathi: "थम्स अप ७५० मि.ली.", category: "Drinks", unit: "Bottle", emoji: "🥤" },
  { name: "Toor Dal", marathi: "तूर डाळ", category: "Grocery", unit: "KG", emoji: "🫘" },
  { name: "Rice", marathi: "तांदूळ", category: "Grocery", unit: "KG", emoji: "🍚" },
  { name: "Pav Bhaji Masala", marathi: "पावभाजी मसाला", category: "Grocery", unit: "Packet", emoji: "🫙" },
  { name: "Agarbatti", marathi: "अगरबत्ती", category: "Pooja", unit: "Packet", emoji: "🪔" },
  { name: "Camphor", marathi: "कापूर", category: "Pooja", unit: "Packet", emoji: "🔥" },
];
const blankProduct: Product = { name: "", marathi: "", category: "Grocery", unit: "Piece", emoji: "📦" };

export default function NewStockPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [brand, setBrand] = useState("");
  const [packSize, setPackSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buyingPrice, setBuyingPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [lowStockLimit, setLowStockLimit] = useState("1");
  const [saved, setSaved] = useState(false);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((item) => (selectedCategory === "All" || item.category === selectedCategory) && (!term || `${item.name} ${item.marathi}`.toLowerCase().includes(term)));
  }, [search, selectedCategory]);

  const resetStock = () => { setQuantity(1); setBuyingPrice(""); setSellingPrice(""); setHasExpiry(false); setExpiryDate(""); setLowStockLimit("1"); setSaved(false); };
  const selectProduct = (item: Product) => { setProduct(item); setIsOther(false); setShowDetails(false); setBrand(""); setPackSize(""); resetStock(); };
  const addOther = () => { setProduct({ ...blankProduct }); setIsOther(true); setShowDetails(true); setBrand(""); setPackSize(""); resetStock(); };
  const updateProduct = (field: keyof Product, value: string) => setProduct((item) => item ? { ...item, [field]: value } : item);
  const setExpiryDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); setExpiryDate(date.toISOString().slice(0, 10)); setHasExpiry(true); };
  const addDifferentPack = () => { setIsOther(true); setShowDetails(true); setPackSize(""); setBuyingPrice(""); setSellingPrice(""); setQuantity(1); setSaved(false); };

  if (product) {
    const visibleName = product.name || "New product";
    const visibleMarathi = product.marathi || "नवीन वस्तू";
    return <main className="mx-auto max-w-lg px-4 pb-28 pt-4 sm:pt-8">
      <button onClick={() => setProduct(null)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back to products</button>
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">{product.emoji}</span><div className="min-w-0"><p className="text-lg font-bold leading-tight">{visibleName}</p><p className="mt-1 text-base text-muted-foreground">{visibleMarathi}</p><p className="mt-2 text-xs font-semibold text-primary">{product.unit} · Ready to add</p></div></div>

        {(isOther || showDetails) && <div className="mt-6 space-y-4 rounded-2xl border bg-muted/30 p-4"><p className="text-sm font-bold">Product details</p><label className="block text-sm font-semibold">Item name <span className="text-destructive">*</span><Input value={product.name} onChange={(event) => updateProduct("name", event.target.value)} className="mt-1.5" placeholder="e.g. Bathing Soap" /></label><label className="block text-sm font-semibold">Item name (Marathi)<Input value={product.marathi} onChange={(event) => updateProduct("marathi", event.target.value)} className="mt-1.5" placeholder="उदा. आंघोळीचा साबण" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Brand name<Input value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1.5" placeholder="e.g. Santoor" /></label><label className="text-sm font-semibold">Pack size<Input value={packSize} onChange={(event) => setPackSize(event.target.value)} className="mt-1.5" placeholder="e.g. 100 g" /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Category<select value={product.category} onChange={(event) => updateProduct("category", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">{allCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm font-semibold">Unit<select value={product.unit} onChange={(event) => updateProduct("unit", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div></div>}
        {!isOther && !showDetails && <button onClick={() => setShowDetails(true)} className="mt-5 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold text-muted-foreground">Edit product details, brand or pack size <ChevronDown className="h-4 w-4" /></button>}

        <section className="mt-7"><p className="text-sm font-bold">How many do you have?</p><div className="mt-3 flex items-center justify-between rounded-2xl bg-muted p-2"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus className="h-5 w-5" /></Button><span className="text-2xl font-bold">{quantity} <span className="text-sm font-medium text-muted-foreground">{product.unit}</span></span><Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)}><Plus className="h-5 w-5" /></Button></div></section>
        <div className="mt-6 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Buying price <span className="text-destructive">*</span><div className="relative mt-2"><span className="absolute left-3 top-2.5 text-muted-foreground">₹</span><Input inputMode="numeric" value={buyingPrice} onChange={(event) => setBuyingPrice(event.target.value)} className="pl-7 text-base" placeholder="0" /></div></label><label className="text-sm font-semibold">Selling price <span className="text-destructive">*</span><div className="relative mt-2"><span className="absolute left-3 top-2.5 text-muted-foreground">₹</span><Input inputMode="numeric" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} className="pl-7 text-base" placeholder="0" /></div></label></div>
        <section className="mt-7 border-t pt-6"><p className="text-sm font-bold">Expiry</p><div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" variant={!hasExpiry ? "default" : "outline"} onClick={() => { setHasExpiry(false); setExpiryDate(""); }}>No expiry</Button><Button type="button" variant={hasExpiry ? "default" : "outline"} onClick={() => setHasExpiry(true)}>Add expiry date</Button></div>{hasExpiry && <div className="mt-3 space-y-3"><div className="grid grid-cols-3 gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setExpiryDays(0)}>Today</Button><Button type="button" variant="outline" size="sm" onClick={() => setExpiryDays(7)}>+7 days</Button><Button type="button" variant="outline" size="sm" onClick={() => setExpiryDays(30)}>+30 days</Button></div><Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></div>}</section>
        <label className="mt-6 block text-sm font-bold">Low stock alert limit<div className="mt-2 flex items-center gap-2"><Input type="number" min="1" value={lowStockLimit} onChange={(event) => setLowStockLimit(event.target.value)} className="max-w-24" /><span className="text-sm text-muted-foreground">{product.unit}</span></div></label>
        <Button className="mt-7 h-12 w-full rounded-xl text-base font-bold" onClick={() => setSaved(true)} disabled={!product.name.trim() || !buyingPrice || !sellingPrice}><PackagePlus className="mr-2 h-5 w-5" /> Add to stock</Button>
        {saved && <div className="mt-4 rounded-xl bg-green-50 p-3 text-center text-sm font-semibold text-green-700"><span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Ready to add: {visibleName}</span><span className="mt-1 block text-xs font-medium">This prototype does not change real stock.</span></div>}
        <button onClick={addDifferentPack} className="mt-5 w-full text-center text-sm font-semibold text-primary underline underline-offset-4">Add a different pack size or price</button>
      </div>
    </main>;
  }

  return <main className="mx-auto max-w-2xl px-4 pb-28 pt-4 sm:pt-8"><div className="rounded-3xl border border-primary/20 bg-primary/5 p-4"><p className="text-lg font-bold">New Stock — Try it</p><p className="mt-1 text-sm text-muted-foreground">Tap the item you are holding. Product, brand, pack size and unit are ready for common items.</p></div><div className="relative mt-5"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-12 rounded-xl pl-11 pr-10 text-base" placeholder="Search: Santoor, Lays, Salt..." />{search && <button onClick={() => setSearch("")} className="absolute right-3 top-3 text-muted-foreground" aria-label="Clear search"><X className="h-5 w-5" /></button>}</div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category.name} onClick={() => setSelectedCategory(category.name)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", selectedCategory === category.name ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>{category.marathi}</button>)}</div><div className="mt-7 flex items-center justify-between"><div><h1 className="text-xl font-bold">Choose product</h1><p className="text-sm text-muted-foreground">ब्रँड निवडा</p></div><span className="text-xs font-medium text-muted-foreground">{visibleItems.length} products</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{visibleItems.map((item) => <button key={item.name} onClick={() => selectProduct(item)} className="flex min-h-24 items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm transition active:scale-[0.99] hover:border-primary/50 hover:bg-primary/5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">{item.emoji}</span><span className="min-w-0"><span className="block font-bold leading-tight">{item.name}</span><span className="mt-1 block text-sm text-muted-foreground">{item.marathi}</span><span className="mt-1 block text-xs font-semibold text-primary">{item.unit}</span></span></button>)}</div><Button variant="outline" onClick={addOther} className="mt-5 h-12 w-full rounded-xl border-dashed text-base font-bold"><Plus className="mr-2 h-5 w-5" /> Add other product</Button></main>;
}
