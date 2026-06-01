"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import { useUnits as useSupabaseUnits } from "@/hooks/use-supabase";
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

interface UnitFormData {
  name: string;
  nameMarathi: string;
  shortForm: string;
}

export function UnitsManagement({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const { currentShopId } = useAuth();
  const { units, addUnit, updateUnit, deleteUnit } = useSupabaseUnits(currentShopId);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    name: "",
    nameMarathi: "",
    shortForm: "",
  });

  const handleOpenDialog = (unit?: (typeof units)[0]) => {
    if (unit) {
      setEditingId(unit.id || null);
      setFormData({
        name: unit.name,
        nameMarathi: unit.nameMarathi || "",
        shortForm: unit.shortForm,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        nameMarathi: "",
        shortForm: "",
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.shortForm.trim()) {
      toast.error(t("fill_all_fields"));
      return;
    }

    try {
      if (editingId) {
        await updateUnit(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          shortForm: formData.shortForm,
        });
        toast.success(t("unit_updated"));
      } else {
        await addUnit({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          shortForm: formData.shortForm,
        });
        toast.success(t("unit_added"));
      }
      setIsOpen(false);
      setFormData({
        name: "",
        nameMarathi: "",
        shortForm: "",
      });
    } catch (error) {
      console.error("[v0] Error saving unit:", error);
      toast.error(t("unit_save_error"));
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteUnit(deleteId);
        setDeleteId(null);
        toast.success(t("unit_deleted"));
      } catch (error) {
        console.error("[v0] Error deleting unit:", error);
        toast.error(t("unit_delete_error"));
      }
    }
  };

  const content = (
    <>
      {!embedded ? (
        <PageHeader title={t("units")} description={t("units_desc")} />
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            {t("add_unit")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("edit_unit") : t("add_unit")}
            </DialogTitle>
            <DialogDescription>
              {editingId ? t("update_unit_desc") : t("create_unit_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("unit_name_label")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("unit_name_label")}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t("short_form_label")} *</Label>
              <Input
                value={formData.shortForm}
                onChange={(e) => setFormData({ ...formData, shortForm: e.target.value.toUpperCase() })}
                placeholder={t("short_form")}
                maxLength={5}
                className="mt-1"
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingId ? t("update") : t("add_unit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {units.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t("no_units")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {units.map((unit) => (
            <Card key={unit.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{unit.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Short form: <span className="font-mono font-bold">{unit.shortForm}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(unit)}
                      className="gap-1 h-8 w-8 p-0"
                      title={t("edit")}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(unit.id || null)}
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
            <AlertDialogTitle>{t("delete_unit_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cannot_undo")} {t("delete_unit_desc")}
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
