"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import { useCategories as useSupabaseCategories } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/page-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit2, Plus } from "lucide-react";

interface CategoryFormData {
  name: string;
  nameMarathi: string;
  color: string;
}

const DEFAULT_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#f97316",
];

export function CategoriesManagement({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const { currentShopId } = useAuth();
  const { categories, addCategory, updateCategory, deleteCategory } = useSupabaseCategories(currentShopId);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    nameMarathi: "",
    color: DEFAULT_COLORS[0],
  });

  const handleOpenDialog = (category?: (typeof categories)[0]) => {
    if (category) {
      setEditingId(category.id || null);
      setFormData({
        name: category.name,
        nameMarathi: category.nameMarathi || "",
        color: category.color || DEFAULT_COLORS[0],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        nameMarathi: "",
        color: DEFAULT_COLORS[0],
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t("category_name_required"));
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          color: formData.color,
        });
        toast.success(t("category_updated"));
      } else {
        await addCategory({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          color: formData.color,
        });
        toast.success(t("category_added"));
      }
      setIsOpen(false);
      setFormData({
        name: "",
        nameMarathi: "",
        color: DEFAULT_COLORS[0],
      });
    } catch (error) {
      console.error("[v0] Error saving category:", error);
      toast.error(t("category_save_error"));
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteCategory(deleteId);
        setDeleteId(null);
        toast.success(t("category_deleted"));
      } catch (error) {
        console.error("[v0] Error deleting category:", error);
        toast.error(t("category_delete_error"));
      }
    }
  };

  const content = (
    <>
      {!embedded ? (
        <PageHeader title={t("categories")} description={t("categories_desc")} />
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            {t("add_category")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("edit_category") : t("add_category")}
            </DialogTitle>
            <DialogDescription>
              {editingId ? t("update_category_desc") : t("create_category_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("category_name_label")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("category_name_label")}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t("color")}</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-full h-10 rounded-lg border-2 transition-all ${
                      formData.color === color ? "border-foreground scale-105" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`${t("color")} ${color}`}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingId ? t("update") : t("add_category")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {categories.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t("no_categories")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">{category.name}</h3>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(category)}
                      className="gap-1 h-8 w-8 p-0"
                      title={t("edit")}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(category.id || null)}
                      className="gap-1 h-8 w-8 p-0"
                      title={t("delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_category_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cannot_undo")} {t("delete_category_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t("delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return <PageContainer>{content}</PageContainer>;
}
