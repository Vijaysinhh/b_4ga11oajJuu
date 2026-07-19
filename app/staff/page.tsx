'use client';

import { useState } from 'react';
import { useStaff } from '@/hooks/use-staff';
import { useAuth, UserPermissions, DEFAULT_WORKER_PERMISSIONS } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Shield, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StaffManagementPage() {
  const { user } = useAuth();
  const { staff, isLoading, addStaff, updateStaff, updateStaffPermissions, removeStaff } = useStaff();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const { toast } = useToast();

  if (user?.role !== 'owner') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Only owners can access this page.</p>
        </div>
      </div>
    );
  }

  const handleAddStaff = async () => {
    if (!newUsername || !newPassword) return;
    const success = await addStaff(newUsername, newPassword);
    if (!success) {
      toast({
        title: "Error",
        description: "Could not add staff member. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setNewUsername('');
    setNewPassword('');
    toast({
      title: "Success",
      description: "Staff member added successfully!",
    });
  };

  const handleTogglePermission = async (userId: number, key: keyof UserPermissions, currentValue: boolean) => {
    const staffMember = staff.find(s => s.id === userId);
    if (!staffMember) return;

    const newPermissions = {
      ...(staffMember.permissions || DEFAULT_WORKER_PERMISSIONS),
      [key]: !currentValue
    };
    const success = await updateStaffPermissions(userId, newPermissions);
    if (!success) {
      toast({
        title: "Error",
        description: "Permission update failed. Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: "Permission updated!",
    });
  };

  const handleSetAllPermissions = async (userId: number, enabled: boolean) => {
    const newPermissions: UserPermissions = enabled
      ? {
          canViewDashboard: true,
          canViewItems: true,
          canManageItems: false,
          canViewSales: true,
          canCreateSales: true,
          canViewUdhari: true,
          canManageUdhari: false,
          canViewReports: false,
          canViewSettings: false,
          canManageStaff: false,
        }
      : DEFAULT_WORKER_PERMISSIONS;

    const success = await updateStaffPermissions(userId, newPermissions);
    if (!success) {
      toast({
        title: "Error",
        description: "Permission update failed. Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: enabled ? "All permissions updated!" : "Default permissions restored!",
    });
  };

  const handleRemoveStaff = async (userId: number) => {
    const success = await removeStaff(userId);
    if (!success) {
      toast({
        title: "Error",
        description: "Could not remove staff member. Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: "Staff member removed!",
    });
  };

  const handleOpenEditDialog = (staffMember: any) => {
    setEditingStaff(staffMember);
    setEditUsername(staffMember.username);
    setEditPassword('');
    setEditDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;
    const success = await updateStaff(editingStaff.id, editUsername, editPassword);
    if (!success) {
      toast({
        title: "Error",
        description: "Could not update staff member. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setEditDialogOpen(false);
    setEditingStaff(null);
    toast({
      title: "Success",
      description: "Staff member updated!",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" />
          Staff Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage your team and their permissions</p>
      </div>

      {/* Add New Staff */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Staff Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input 
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input 
                type="password"
                placeholder="Enter password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddStaff} className="w-full sm:w-auto">
                Add Staff
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading staff...</p>
          </div>
        ) : staff.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No staff members yet. Add your first one above!</p>
            </CardContent>
          </Card>
        ) : (
          staff.map((staffMember) => (
            <Card key={staffMember.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {staffMember.username}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleOpenEditDialog(staffMember)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleRemoveStaff(staffMember.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Actions */}
                <div className="flex gap-2 mb-6 pb-4 border-b border-border">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleSetAllPermissions(staffMember.id, true)}
                  >
                    Allow All
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleSetAllPermissions(staffMember.id, false)}
                  >
                    Reset to Default
                  </Button>
                </div>

                {/* Permissions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'canViewDashboard', label: 'View Dashboard', desc: 'Open the dashboard' },
                    { key: 'canViewItems', label: 'View Items', desc: 'See stock items' },
                    { key: 'canViewSales', label: 'View Sales', desc: 'See sales history' },
                    { key: 'canCreateSales', label: 'Create Sales', desc: 'Record new sales' },
                    { key: 'canViewUdhari', label: 'View Udhari', desc: 'See credit records' },
                  ].map((perm) => {
                    const currentValue = !!(staffMember.permissions || DEFAULT_WORKER_PERMISSIONS)[perm.key as keyof UserPermissions];
                    return (
                      <div key={perm.key} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">{perm.desc}</p>
                        </div>
                        <Switch
                          checked={currentValue}
                          onCheckedChange={() => handleTogglePermission(
                            staffMember.id,
                            perm.key as keyof UserPermissions,
                            currentValue
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Staff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input 
                placeholder="Enter username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Password (leave empty to keep current)</label>
              <Input 
                type="password"
                placeholder="Enter new password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff}>Update Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
