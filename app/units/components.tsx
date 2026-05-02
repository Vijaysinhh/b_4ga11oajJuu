'use client';

import { useState } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { useUnits } from '@/hooks/use-db';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface UnitFormData {
  name: string;
  nameMarathi: string;
  shortForm: string;
}

export function UnitsManagement() {
  const { t } = useLanguage();
  const { units, addUnit, updateUnit, deleteUnit } = useUnits();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    nameMarathi: '',
    shortForm: '',
  });

  const handleOpenDialog = (unit?: (typeof units)[0]) => {
    if (unit) {
      setEditingId(unit.id || null);
      setFormData({
        name: unit.name,
        nameMarathi: unit.nameMarathi || '',
        shortForm: unit.shortForm,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        nameMarathi: '',
        shortForm: '',
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.shortForm.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      if (editingId) {
        await updateUnit(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          shortForm: formData.shortForm,
        });
        toast.success('Unit updated successfully');
      } else {
        await addUnit({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          shortForm: formData.shortForm,
        });
        toast.success('Unit added successfully');
      }
      setIsOpen(false);
      setFormData({
        name: '',
        nameMarathi: '',
        shortForm: '',
      });
    } catch (error) {
      console.error('[v0] Error saving unit:', error);
      toast.error('Error saving unit');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteUnit(deleteId);
        setDeleteId(null);
        toast.success('Unit deleted successfully');
      } catch (error) {
        console.error('[v0] Error deleting unit:', error);
        toast.error('Error deleting unit');
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Units</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage measurement units for products</p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Add Unit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Unit' : 'Add New Unit'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Update unit details' : 'Create a new measurement unit'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Unit Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Kilogram, Liter, Piece"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Short Form *</label>
              <Input
                value={formData.shortForm}
                onChange={(e) => setFormData({ ...formData, shortForm: e.target.value.toUpperCase() })}
                placeholder="e.g., KG, L, PCS"
                maxLength={5}
                className="mt-1"
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingId ? 'Update Unit' : 'Add Unit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {units.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">No units added yet</p>
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
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(unit.id || null)}
                      className="gap-1 h-8 w-8 p-0"
                      title="Delete"
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
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The unit will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
