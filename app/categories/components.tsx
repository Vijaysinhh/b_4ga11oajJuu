'use client';

import { useState } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { useCategories } from '@/hooks/use-db';
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

interface CategoryFormData {
  name: string;
  nameMarathi: string;
  color: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316',
];

export function CategoriesManagement() {
  const { t } = useLanguage();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    nameMarathi: '',
    color: DEFAULT_COLORS[0],
  });

  const handleOpenDialog = (category?: (typeof categories)[0]) => {
    if (category) {
      setEditingId(category.id || null);
      setFormData({
        name: category.name,
        nameMarathi: category.nameMarathi || '',
        color: category.color || DEFAULT_COLORS[0],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        nameMarathi: '',
        color: DEFAULT_COLORS[0],
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          color: formData.color,
        });
        toast.success('Category updated successfully');
      } else {
        await addCategory({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          color: formData.color,
        });
        toast.success('Category added successfully');
      }
      setIsOpen(false);
      setFormData({
        name: '',
        nameMarathi: '',
        color: DEFAULT_COLORS[0],
      });
    } catch (error) {
      console.error('[v0] Error saving category:', error);
      toast.error('Error saving category');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteCategory(deleteId);
        setDeleteId(null);
        toast.success('Category deleted successfully');
      } catch (error) {
        console.error('[v0] Error deleting category:', error);
        toast.error('Error deleting category');
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage your product categories</p>
      </div>

      {/* Add Category Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Update category details' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="text-sm font-semibold">Category Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Grocery, Dairy, Snacks"
                className="mt-1"
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="text-sm font-semibold">Color</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-full h-10 rounded-lg border-2 transition-all ${
                      formData.color === color ? 'border-foreground scale-105' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} className="w-full">
              {editingId ? 'Update Category' : 'Add Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">No categories added yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  {/* Category Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">{category.name}</h3>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(category)}
                      className="gap-1 h-8 w-8 p-0"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(category.id || null)}
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The category will be deleted permanently.
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
