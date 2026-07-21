"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import {
  useItems as useSupabaseItems,
  useCategories as useSupabaseCategories,
  useUnits as useSupabaseUnits,
  usePriceTiers,
} from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { PriceTierManager } from "@/components/price-tier-manager";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit2, Plus, Search } from "lucide-react";
import { HelpTooltip, LabelWithTooltip } from "@/components/help-tooltip";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  formatPercent,
  formatWholeNumber,
  parseWholeNumberInput,
} from "@/lib/number-format";

interface ItemFormData {
  name: string;
  nameMarathi: string;
  brand: string;
  brandMarathi: string;
  categoryId: number;
  unitId: number;
  quantity: number;
  expiryDate: string;
  buyPrice: number;
  sellPrice: number;
  lowStockLimit: number;
}

export function ItemsManagement() {
  const { t, language } = useLanguage();
  const { currentShopId } = useAuth();
  const { items, addItem, updateItem, deleteItem } =
    useSupabaseItems(currentShopId);
  const { categories } = useSupabaseCategories(currentShopId);
  const { units } = useSupabaseUnits(currentShopId);
  const {
    priceTiers,
    addPriceTier: addPriceTierSupabase,
    deletePriceTier: deletePriceTierSupabase,
  } = usePriceTiers(currentShopId);

  const handleAddPriceTier = async (tierData: any) => {
    try {
      await addPriceTierSupabase(tierData);
      toast.success("Price tier added successfully!");
    } catch (error) {
      console.error("Error adding price tier:", error);
      toast.error("Failed to add price tier");
    }
  };

  const handleDeletePriceTier = async (tierId: number) => {
    try {
      await deletePriceTierSupabase(tierId);
      toast.success("Price tier deleted successfully!");
    } catch (error) {
      console.error("Error deleting price tier:", error);
      toast.error("Failed to delete price tier");
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedExpiryStatus, setSelectedExpiryStatus] = useState<
    string | null
  >(null); // null = All, 'expired', 'expiring', 'notExpiring', 'hasExpiry', 'noExpiry'
  const [selectedStockStatus, setSelectedStockStatus] = useState<string | null>(
    null,
  ); // null = All, 'lowStock', 'inStock', 'outOfStock'
  const [sortBy, setSortBy] = useState<string>("name-asc"); // 'name-asc', 'qty-asc', 'qty-desc', 'expiry-asc', 'margin-desc'
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [focusedItemId, setFocusedItemId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    nameMarathi: "",
    brand: "",
    brandMarathi: "",
    categoryId: categories[0]?.id || 1,
    unitId: units[0]?.id || 1,
    quantity: 0,
    expiryDate: "",
    buyPrice: 0,
    sellPrice: 0,
    lowStockLimit: 0,
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ItemFormData, string>>
  >({});

  const clearFieldError = (field: keyof ItemFormData) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof ItemFormData, string>> = {};
    const name = formData.name.trim();
    const nameMarathi = formData.nameMarathi.trim();
    if (!name && !nameMarathi) {
      errors.name = "Enter item name in English or Marathi.";
    }

    if (!categories.some((c) => c.id === formData.categoryId)) {
      errors.categoryId = "Select a valid category.";
    }

    if (!units.some((u) => u.id === formData.unitId)) {
      errors.unitId = "Select a valid unit.";
    }

    if (!Number.isFinite(formData.quantity) || formData.quantity < 0) {
      errors.quantity = "Enter a valid quantity.";
    }

    if (formData.expiryDate) {
      const parsed = Date.parse(`${formData.expiryDate}T00:00:00`);
      if (Number.isNaN(parsed)) {
        errors.expiryDate = "Enter a valid expiry date.";
      }
    }

    if (!Number.isFinite(formData.buyPrice) || formData.buyPrice <= 0) {
      errors.buyPrice = "Enter a valid buying price.";
    }

    if (!Number.isFinite(formData.sellPrice) || formData.sellPrice <= 0) {
      errors.sellPrice = "Enter a valid selling price.";
    }

    if (
      Number.isFinite(formData.buyPrice) &&
      Number.isFinite(formData.sellPrice) &&
      formData.sellPrice < formData.buyPrice
    ) {
      errors.sellPrice = "Selling price must be greater than buying price.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = items.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.name?.toLowerCase().includes(searchLower) ||
        false ||
        item.nameMarathi?.toLowerCase().includes(searchLower) ||
        false;

      // Category filter
      const matchesCategory =
        selectedCategoryId === null || item.categoryId === selectedCategoryId;

      // Expiry status filter
      let matchesExpiry = true;
      if (selectedExpiryStatus) {
        const expiryObj = item.expiryDate ? new Date(item.expiryDate) : null;
        const expiryStart = expiryObj ? new Date(expiryObj) : null;
        if (expiryStart) expiryStart.setHours(0, 0, 0, 0);

        const isExpired = expiryStart ? expiryStart < today : false;
        const isExpiring = expiryStart
          ? expiryStart <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          : false;

        if (selectedExpiryStatus === "expired") matchesExpiry = isExpired;
        else if (selectedExpiryStatus === "expiring")
          matchesExpiry = isExpiring && !isExpired;
        else if (selectedExpiryStatus === "notExpiring")
          matchesExpiry = !isExpired && !isExpiring;
        else if (selectedExpiryStatus === "hasExpiry")
          matchesExpiry = !!item.expiryDate;
        else if (selectedExpiryStatus === "noExpiry")
          matchesExpiry = !item.expiryDate;
      }

      // Stock status filter
      let matchesStock = true;
      if (selectedStockStatus) {
        const isLowStock = item.quantity <= item.lowStockLimit;
        const isOutOfStock = item.quantity === 0;
        const isInStock = !isLowStock;

        if (selectedStockStatus === "lowStock") matchesStock = isLowStock;
        else if (selectedStockStatus === "outOfStock")
          matchesStock = isOutOfStock;
        else if (selectedStockStatus === "inStock") matchesStock = isInStock;
      }

      return matchesSearch && matchesCategory && matchesExpiry && matchesStock;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc": {
          const nameA = (a.name || a.nameMarathi || "").toLowerCase();
          const nameB = (b.name || b.nameMarathi || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case "qty-asc":
          return a.quantity - b.quantity;
        case "qty-desc":
          return b.quantity - a.quantity;
        case "expiry-asc": {
          const expiryA = a.expiryDate
            ? new Date(a.expiryDate).getTime()
            : Infinity;
          const expiryB = b.expiryDate
            ? new Date(b.expiryDate).getTime()
            : Infinity;
          return expiryA - expiryB;
        }
        case "margin-desc": {
          const marginA =
            a.buyPrice > 0
              ? ((a.sellPrice - a.buyPrice) / a.buyPrice) * 100
              : 0;
          const marginB =
            b.buyPrice > 0
              ? ((b.sellPrice - b.buyPrice) / b.buyPrice) * 100
              : 0;
          return marginB - marginA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [
    items,
    searchTerm,
    selectedCategoryId,
    selectedExpiryStatus,
    selectedStockStatus,
    sortBy,
  ]);

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const cost = Number(item.buyPrice || 0);
      return sum + qty * cost;
    }, 0);
  }, [items]);

  const lowStockCount = useMemo(
    () =>
      items.filter(
        (item) =>
          Number(item.quantity || 0) > 0 &&
          Number(item.quantity || 0) <= Number(item.lowStockLimit || 0),
      ).length,
    [items],
  );

  const outOfStockCount = useMemo(
    () => items.filter((item) => Number(item.quantity || 0) === 0).length,
    [items],
  );

  const expiringSoonCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return items.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays > 0 && diffDays <= 7;
    }).length;
  }, [items]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = Number(params.get("focusItemId"));
    const filter = params.get("filter");

    if (!Number.isFinite(itemId) || itemId <= 0) return;

    setFocusedItemId(itemId);
    setSearchTerm("");
    setSelectedCategoryId(null);

    if (filter === "lowStock") {
      setSelectedStockStatus("lowStock");
      setSelectedExpiryStatus(null);
      setSortBy("qty-asc");
    } else if (filter === "expired" || filter === "expiring") {
      setSelectedExpiryStatus(filter);
      setSelectedStockStatus(null);
      setSortBy("expiry-asc");
    }
  }, []);

  useEffect(() => {
    if (!focusedItemId) return;
    if (!filteredItems.some((item) => item.id === focusedItemId)) return;

    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`stock-item-${focusedItemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    const clearTimer = window.setTimeout(() => setFocusedItemId(null), 5000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [filteredItems, focusedItemId]);

  const handleOpenDialog = (item?: (typeof items)[0]) => {
    setActiveTab("basic");
    if (item) {
      setEditingId(item.id || null);
      setFormData({
        name: item.name,
        nameMarathi: item.nameMarathi || "",
        brand: item.brand || "",
        brandMarathi: item.brandMarathi || "",
        categoryId: item.categoryId,
        unitId: item.unitId,
        quantity: item.quantity,
        expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : "",
        buyPrice: item.buyPrice,
        sellPrice: item.sellPrice,
        lowStockLimit: item.lowStockLimit,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        nameMarathi: "",
        brand: "",
        brandMarathi: "",
        categoryId: categories[0]?.id || 1,
        unitId: units[0]?.id || 1,
        quantity: 0,
        expiryDate: "",
        buyPrice: 0,
        sellPrice: 0,
        lowStockLimit: 0,
      });
    }
    setIsOpen(true);
  };

  const resetForm = () => {
    setActiveTab("basic");
    setFormData({
      name: "",
      nameMarathi: "",
      brand: "",
      brandMarathi: "",
      categoryId: categories[0]?.id || 1,
      unitId: units[0]?.id || 1,
      quantity: 0,
      expiryDate: "",
      buyPrice: 0,
      sellPrice: 0,
      lowStockLimit: 0,
    });
    setEditingId(null);
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      toast.error("Please add a category first.");
      return;
    }
    if (units.length === 0) {
      toast.error("Please add a unit first.");
      return;
    }
    if (!validateForm()) {
      toast.error("Fix the highlighted fields before saving.");
      return;
    }

    const { name, nameMarathi, expiryDate } = formData;

    try {
      const expiryDateIso = expiryDate
        ? new Date(`${expiryDate}T23:59:59`).toISOString()
        : null;
      const savedName =
        language === "mr" ? nameMarathi || name : name || nameMarathi;
      const lowStockDescription =
        formData.lowStockLimit > 0 &&
        formData.quantity <= formData.lowStockLimit
          ? language === "mr"
            ? `⚠️ फक्त ${formatWholeNumber(formData.quantity)} बाकी`
            : `⚠️ Only ${formatWholeNumber(formData.quantity)} left`
          : undefined;
      if (editingId) {
        await updateItem(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          brand: formData.brand,
          brandMarathi: formData.brandMarathi,
          categoryId: formData.categoryId,
          unitId: formData.unitId,
          quantity: formData.quantity,
          expiryDate: expiryDateIso,
          buyPrice: formData.buyPrice,
          sellPrice: formData.sellPrice,
          lowStockLimit: formData.lowStockLimit,
        });
        toast.success(
          language === "mr"
            ? `${savedName} अपडेट झाले`
            : `${savedName} updated`,
          { description: lowStockDescription },
        );
      } else {
        const newId = await addItem({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          brand: formData.brand,
          brandMarathi: formData.brandMarathi,
          categoryId: formData.categoryId,
          unitId: formData.unitId,
          quantity: formData.quantity,
          expiryDate: expiryDateIso,
          buyPrice: formData.buyPrice,
          sellPrice: formData.sellPrice,
          lowStockLimit: formData.lowStockLimit,
        });
        if (!newId) {
          throw new Error("Item saved but could not be loaded");
        }
        toast.success(
          language === "mr"
            ? `${savedName} stock मध्ये जोडले`
            : `${savedName} added to stock`,
          { description: lowStockDescription },
        );
      }
      resetForm();
    } catch (error) {
      console.error("[v0] Error saving item:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.details ||
        (error as any)?.hint ||
        (error as any)?.error_description;
      toast.error(
        message
          ? `Error saving item: ${message}`
          : "Error saving item. Please try again.",
      );
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteItem(deleteId);
        setDeleteId(null);
        setSelectedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(deleteId);
          return newSet;
        });
        toast.success("Item deleted successfully");
      } catch (error) {
        console.error("[v0] Error deleting item:", error);
        toast.error("Error deleting item");
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const itemsToDelete = Array.from(selectedItems);
      for (const id of itemsToDelete) {
        await deleteItem(id);
      }
      setSelectedItems(new Set());
      toast.success(`Deleted ${itemsToDelete.length} item(s)`);
    } catch (error) {
      console.error("[v0] Error batch deleting items:", error);
      toast.error("Error deleting items");
    }
  };

  const toggleItemSelection = (id: number | undefined) => {
    if (!id) return;
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id || 0)));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategoryId(null);
    setSelectedExpiryStatus(null);
    setSelectedStockStatus(null);
    setSortBy("name-asc");
  };

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category?.name || "Unknown";
  };

  const getUnitName = (id: number) => {
    const unit = units.find((u) => u.id === id);
    return unit?.shortForm || unit?.name || "N/A";
  };

  const calculateMargin = (buyPrice: number, sellPrice: number): number => {
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setExpiryInDays = (days: number) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + days);
    setFormData((prev) => ({ ...prev, expiryDate: formatDateInput(base) }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 pt-2 sm:pb-10 sm:pt-4">
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("items")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your product inventory
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">{t("total_value_label")}</p>
            <p className="text-xs text-muted-foreground">
              {items.length} {t("products")}
            </p>
            <p className="mt-3 text-xl font-bold text-purple-700">
              Rs. {formatMoney(totalStockValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Low Stock</p>
            <p className="mt-3 text-2xl font-bold text-orange-700">
              {lowStockCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Items at or below reorder threshold
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Out of Stock</p>
            <p className="mt-3 text-2xl font-bold text-red-700">
              {outOfStockCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Items with zero quantity
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Expiring Soon</p>
            <p className="mt-3 text-2xl font-bold text-amber-700">
              {expiringSoonCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Items expiring within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {filteredItems.length} {t("products")}
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="w-full sm:w-auto gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Item" : "Add New Item"}
              </DialogTitle>
              <DialogDescription>Fill in the details below</DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing" disabled={!editingId}>
                  Price Variants
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 mt-4">
                <div className="rounded-2xl border border-border/70 bg-slate-50 p-5">
                  <p className="text-sm font-semibold">Product details</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <LabelWithTooltip
                        label="Item Name"
                        tooltip="Enter the product name as it appears in your shop (e.g., Basmati Rice, Sunflower Oil, Salt)."
                      />
                      <Input
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          clearFieldError("name");
                        }}
                        placeholder="e.g., Rice, Oil, Salt"
                        className={cn(
                          "mt-1",
                          formErrors.name &&
                            "border-destructive focus:border-destructive focus:ring-destructive/50",
                        )}
                        aria-invalid={!!formErrors.name}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-xs text-destructive">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Category"
                        tooltip="Organize products by type (Grains, Oils, Spices, etc.) for better inventory management"
                        required
                      />
                      <Select
                        value={formData.categoryId.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            categoryId: Number(value),
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id!.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Unit"
                        tooltip="The measurement unit for this product (kg, L, pcs, g, ml, etc.). Used to track and sell quantities"
                        required
                      />
                      <Select
                        value={formData.unitId.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, unitId: Number(value) })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem
                              key={unit.id}
                              value={unit.id!.toString()}
                            >
                              {unit.name} ({unit.shortForm})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Current Quantity"
                        tooltip="How much stock you have right now in the shop"
                        required
                      />
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.quantity || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity: parseWholeNumberInput(e.target.value),
                          })
                        }
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Item Name (Marathi)"
                        tooltip="Enter the product name in Marathi for better local understanding. Fill either this OR English name."
                      />
                      <Input
                        value={formData.nameMarathi}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nameMarathi: e.target.value,
                          })
                        }
                        placeholder="उदा., तांदूळ, तेल, मीठ"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Brand Name"
                        tooltip="Enter the product brand name"
                      />
                      <Input
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value })
                        }
                        placeholder="e.g., Parle, Amul, Nestle"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <LabelWithTooltip
                        label="Brand Name (Marathi)"
                        tooltip="Enter the product brand name in Marathi"
                      />
                      <Input
                        value={formData.brandMarathi}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            brandMarathi: e.target.value,
                          })
                        }
                        placeholder="उदा., पार्ले, अमूल, नेस्टले"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <LabelWithTooltip
                    label="Expiry Date"
                    tooltip="Optional. If set, the system can show expiry alerts for this item."
                  />
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      className="sm:w-[200px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpiryInDays(0)}
                      >
                        Today
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpiryInDays(7)}
                      >
                        +7 days
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpiryInDays(30)}
                      >
                        +30 days
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, expiryDate: "" }))
                        }
                        disabled={!formData.expiryDate}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-slate-50 p-5">
                    <p className="text-sm font-semibold">Pricing</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <LabelWithTooltip
                          label="Buying Price"
                          tooltip="The cost price - how much you pay to buy this item from your supplier (in Rs.)"
                          required
                        />
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.buyPrice || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              buyPrice: parseWholeNumberInput(e.target.value),
                            });
                            clearFieldError("buyPrice");
                          }}
                          placeholder="0"
                          className={cn(
                            "mt-1",
                            formErrors.buyPrice &&
                              "border-destructive focus:border-destructive focus:ring-destructive/50",
                          )}
                          aria-invalid={!!formErrors.buyPrice}
                        />
                        {formErrors.buyPrice && (
                          <p className="mt-1 text-xs text-destructive">
                            {formErrors.buyPrice}
                          </p>
                        )}
                      </div>

                      <div>
                        <LabelWithTooltip
                          label="Selling Price"
                          tooltip="The retail price - how much you sell this item for to customers (in Rs.)"
                          required
                        />
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.sellPrice || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              sellPrice: parseWholeNumberInput(e.target.value),
                            });
                            clearFieldError("sellPrice");
                          }}
                          placeholder="0"
                          className={cn(
                            "mt-1",
                            formErrors.sellPrice &&
                              "border-destructive focus:border-destructive focus:ring-destructive/50",
                          )}
                          aria-invalid={!!formErrors.sellPrice}
                        />
                        {formErrors.sellPrice && (
                          <p className="mt-1 text-xs text-destructive">
                            {formErrors.sellPrice}
                          </p>
                        )}
                        {formData.buyPrice > 0 && formData.sellPrice > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            Margin:{" "}
                            {formatPercent(
                              calculateMargin(
                                formData.buyPrice,
                                formData.sellPrice,
                              ),
                            )}
                            %
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-sm font-semibold">
                            Low Stock Alert Limit
                          </label>
                          <HelpTooltip text="When stock goes below this level, you'll get an alert to reorder. Leave empty to disable alerts" />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={
                              formData.lowStockLimit === 0
                                ? ""
                                : formData.lowStockLimit
                            }
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                lowStockLimit: parseWholeNumberInput(
                                  e.target.value,
                                ),
                              });
                            }}
                            placeholder="Leave empty to disable alerts"
                            className="mt-0"
                          />
                          {formData.lowStockLimit > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFormData({ ...formData, lowStockLimit: 0 })
                              }
                              className="whitespace-nowrap"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-sm font-semibold">Inventory preview</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">
                          Estimated stock value
                        </p>
                        <p className="mt-1 font-semibold">
                          Rs.{" "}
                          {formatMoney(formData.quantity * formData.buyPrice)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">
                          Profit margin
                        </p>
                        <p className="mt-1 font-semibold text-green-600">
                          {formData.buyPrice > 0
                            ? `${formatPercent(
                                calculateMargin(
                                  formData.buyPrice,
                                  formData.sellPrice,
                                ),
                              )}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">
                          Expiry status
                        </p>
                        <p className="mt-1 font-semibold">
                          {formData.expiryDate
                            ? new Date(
                                `${formData.expiryDate}T00:00:00`,
                              ).toLocaleDateString(
                                language === "mr" ? "mr-IN" : "en-IN",
                              )
                            : "None"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">
                          Reorder alert
                        </p>
                        <p className="mt-1 font-semibold">
                          {formData.lowStockLimit > 0
                            ? `${formatWholeNumber(formData.lowStockLimit)} ${getUnitName(formData.unitId)} or less`
                            : "Disabled"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-4">
                {editingId && (
                  <PriceTierManager
                    itemId={editingId}
                    priceTiers={priceTiers.filter(
                      (tier) => tier.itemId === editingId,
                    )}
                    units={units}
                    wholesaleCost={formData.buyPrice}
                    wholesaleQty={formData.quantity}
                    wholesaleUnitId={formData.unitId}
                    onAdd={handleAddPriceTier}
                    onDelete={handleDeletePriceTier}
                  />
                )}
                {!editingId && (
                  <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                    Save the item first to manage price variants.
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                {editingId ? "Update Item" : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("search_items")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-5">
          {/* Category Filter */}
          <Select
            value={selectedCategoryId?.toString() || "all"}
            onValueChange={(value) =>
              setSelectedCategoryId(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id!.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Expiry Status Filter */}
          <Select
            value={selectedExpiryStatus || "all"}
            onValueChange={(value) =>
              setSelectedExpiryStatus(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Expiry Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring">Near Expiry</SelectItem>
              <SelectItem value="notExpiring">Not Expiring Soon</SelectItem>
              <SelectItem value="hasExpiry">Has Expiry Date</SelectItem>
              <SelectItem value="noExpiry">No Expiry Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select
            value={selectedStockStatus || "all"}
            onValueChange={(value) =>
              setSelectedStockStatus(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="lowStock">Low Stock</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
              <SelectItem value="inStock">In Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="qty-asc">Quantity (Low → High)</SelectItem>
              <SelectItem value="qty-desc">Quantity (High → Low)</SelectItem>
              <SelectItem value="expiry-asc">Expiry (Soonest First)</SelectItem>
              <SelectItem value="margin-desc">
                Profit Margin (High → Low)
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full"
            disabled={
              !searchTerm &&
              selectedCategoryId === null &&
              selectedExpiryStatus === null &&
              selectedStockStatus === null &&
              sortBy === "name-asc"
            }
          >
            Clear filters
          </Button>
        </div>

        {(searchTerm ||
          selectedCategoryId ||
          selectedExpiryStatus ||
          selectedStockStatus ||
          sortBy !== "name-asc") && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Search: {searchTerm}
              </span>
            )}
            {selectedCategoryId !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Category: {getCategoryName(selectedCategoryId)}
              </span>
            )}
            {selectedExpiryStatus && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Expiry: {selectedExpiryStatus.replace(/([A-Z])/g, " $1")}
              </span>
            )}
            {selectedStockStatus && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Stock:{" "}
                {selectedStockStatus === "lowStock"
                  ? "Low"
                  : selectedStockStatus === "outOfStock"
                    ? "Out"
                    : "In"}
              </span>
            )}
            {sortBy !== "name-asc" && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Sort:{" "}
                {sortBy
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Batch Operations Toolbar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedItems.size === filteredItems.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-sm">
              {selectedItems.size} item(s) selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={toggleSelectAll} variant="outline" size="sm">
              {selectedItems.size === filteredItems.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Button onClick={handleBatchDelete} variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "No items found" : "No items added yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => {
            const itemPriceTiers = priceTiers.filter(
              (tier) => tier.itemId === item.id,
            );
            const isSelected = selectedItems.has(item.id || 0);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const expiryObj = item.expiryDate
              ? new Date(item.expiryDate)
              : null;
            const expiryStart = expiryObj ? new Date(expiryObj) : null;
            if (expiryStart) expiryStart.setHours(0, 0, 0, 0);
            const expiryStatus =
              expiryStart && expiryStart.getTime() < todayStart.getTime()
                ? "expired"
                : expiryStart &&
                    expiryStart.getTime() <=
                      todayStart.getTime() + 7 * 24 * 60 * 60 * 1000
                  ? "expiring"
                  : null;
            const primaryItemName =
              language === "mr"
                ? item.nameMarathi || item.name
                : item.name || item.nameMarathi;
            const secondaryItemName =
              language === "mr" ? item.name : item.nameMarathi;
            const showSecondaryItemName =
              Boolean(secondaryItemName) &&
              secondaryItemName !== primaryItemName;
            const primaryBrandName =
              language === "mr"
                ? item.brandMarathi || item.brand
                : item.brand || item.brandMarathi;
            const secondaryBrandName =
              language === "mr" ? item.brand : item.brandMarathi;
            const showSecondaryBrandName =
              Boolean(secondaryBrandName) &&
              secondaryBrandName !== primaryBrandName;
            const itemUnitName = getUnitName(item.unitId);
            const itemStockValue =
              Number(item.quantity || 0) * Number(item.buyPrice || 0);
            const isLowStock = item.quantity <= item.lowStockLimit;
            const stockUrgencyText =
              item.quantity <= 0
                ? language === "mr"
                  ? "स्टॉक संपला"
                  : "Out of stock"
                : language === "mr"
                  ? `फक्त ${formatWholeNumber(item.quantity)} ${itemUnitName} बाकी`
                  : `Only ${formatWholeNumber(item.quantity)} ${itemUnitName} left`;
            const expiryUrgencyText =
              expiryStatus === "expired"
                ? language === "mr"
                  ? `₹${formatMoney(itemStockValue)} चा माल एक्सपायर झाला`
                  : `₹${formatMoney(itemStockValue)} stock expired`
                : expiryStatus === "expiring"
                  ? language === "mr"
                    ? `₹${formatMoney(itemStockValue)} चा माल एक्सपायर होण्याच्या मार्गावर आहे`
                    : `₹${formatMoney(itemStockValue)} stock near expiry`
                  : "";

            // Calculate days left
            let daysLeftText = "";
            if (expiryStart && expiryStatus) {
              if (expiryStatus === "expired") {
                const daysAgo = Math.floor(
                  (todayStart.getTime() - expiryStart.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                daysLeftText = ` (${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago)`;
              } else if (expiryStatus === "expiring") {
                const daysLeft = Math.ceil(
                  (expiryStart.getTime() - todayStart.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                daysLeftText = ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`;
              }
            }

            return (
              <div
                key={item.id}
                className={`flex gap-2 items-start ${isSelected ? "opacity-75" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItemSelection(item.id)}
                  className="w-4 h-4 cursor-pointer mt-4"
                />
                <Card
                  id={`stock-item-${item.id}`}
                  className={`flex-1 overflow-hidden transition-all ${
                    isSelected ? "border-blue-300 bg-blue-50" : ""
                  } ${
                    focusedItemId === item.id
                      ? "ring-4 ring-orange-300 border-orange-400 bg-orange-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* Item Name and Category */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-base">
                            {primaryItemName}
                          </h3>
                          {showSecondaryItemName && (
                            <p className="text-sm font-medium text-muted-foreground">
                              {secondaryItemName}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                              {getCategoryName(item.categoryId)}
                            </span>
                            {primaryBrandName && (
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {primaryBrandName}
                              </span>
                            )}
                            {item.quantity === 0 ? (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                Out of stock
                              </span>
                            ) : isLowStock ? (
                              <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                Low stock
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                In stock
                              </span>
                            )}
                          </div>
                          {expiryStart && (
                            <p
                              className={
                                expiryStatus === "expired"
                                  ? "text-xs font-semibold text-red-600"
                                  : expiryStatus === "expiring"
                                    ? "text-xs font-semibold text-orange-600"
                                    : "text-xs text-muted-foreground"
                              }
                            >
                              Expiry:{" "}
                              {expiryStart.toLocaleDateString(
                                language === "mr" ? "mr-IN" : "en-IN",
                              )}
                              {expiryStatus === "expired"
                                ? " (Expired)"
                                : expiryStatus === "expiring"
                                  ? " (Near Expiry)"
                                  : ""}
                              {daysLeftText}
                            </p>
                          )}
                          {expiryUrgencyText && (
                            <p
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                                expiryStatus === "expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              ⚠️ {expiryUrgencyText}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">
                            {formatWholeNumber(item.quantity)} {itemUnitName}
                          </p>
                          {isLowStock && (
                            <p
                              className={`text-xs font-bold ${
                                item.quantity <= 0
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              ⚠️ {stockUrgencyText}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Default Prices */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            {t("buy")}:
                          </span>
                          <p className="font-semibold">
                            Rs. {formatMoney(item.buyPrice)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("sell")}:
                          </span>
                          <p className="font-semibold">
                            Rs. {formatMoney(item.sellPrice)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("margin")}:
                          </span>
                          <p className="font-semibold text-green-600">
                            {formatPercent(
                              calculateMargin(item.buyPrice, item.sellPrice),
                            )}
                            %
                          </p>
                        </div>
                      </div>

                      {/* Price Tiers */}
                      {itemPriceTiers.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {t("price_variants")}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {itemPriceTiers.map((tier) => (
                              <div
                                key={tier.id}
                                className="bg-amber-50 p-2 rounded border border-amber-200"
                              >
                                <p className="text-xs font-semibold text-amber-900">
                                  {formatWholeNumber(tier.quantity)}
                                  {getUnitName(tier.unitId)}
                                </p>
                                <p className="text-xs text-amber-700">
                                  Rs. {formatMoney(tier.price || 0)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stock Value */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          {t("total_value_label")}:{" "}
                          <span className="font-semibold text-foreground">
                            Rs. {formatMoney(item.quantity * item.buyPrice)}
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                          className="flex-1 gap-1 h-8"
                        >
                          <Edit2 className="w-3 h-3" />
                          {t("edit")}
                        </Button>
                        <AlertDialog
                          open={deleteId === item.id}
                          onOpenChange={(open) => {
                            if (!open) setDeleteId(null);
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteId(item.id || null)}
                              className="flex-1 gap-1 h-8"
                            >
                              <Trash2 className="w-3 h-3" />
                              {t("delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("confirm_delete")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;
                                {language === "mr" && item.nameMarathi
                                  ? item.nameMarathi
                                  : item.name}
                                &quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel>
                                {t("cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>
                                {t("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
