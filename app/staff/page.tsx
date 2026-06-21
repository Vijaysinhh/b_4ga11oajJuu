'use client';

import { useState } from 'react';
import { useStaff } from '@/hooks/use-staff';
import { useAuth, UserPermissions, DEFAULT_WORKER_PERMISSIONS } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Users, Shield } from 'lucide-react';

export default function StaffManagementPage() {
  const { user } = useAuth();
  const { staff, isLoading, addStaff, updateStaffPermissions, removeStaff } = useStaff();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

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
    await addStaff(newUsername, newPassword);
    setNewUsername('');
    setNewPassword('');
  };

  const handleTogglePermission = (userId: number, key: keyof UserPermissions, currentValue: boolean) => {
    const staffMember = staff.find(s => s.id === userId);
    if (!staffMember) return;

    const newPermissions = {
      ...(staffMember.permissions || DEFAULT_WORKER_PERMISSIONS),
      [key]: !currentValue
    };
    updateStaffPermissions(userId, newPermissions);
  };

  const handleSetAllPermissions = (userId: number, enabled: boolean) => {
    const newPermissions: UserPermissions = {
      canViewDashboard: enabled,
      canViewItems: enabled,
      canManageItems: enabled,
      canViewSales: enabled,
      canCreateSales: enabled,
      canViewUdhari: enabled,
      canManageUdhari: enabled,
      canViewReports: enabled,
      canViewSettings: enabled,
      canManageStaff: false, // Never allow staff to manage other staff
    };
    updateStaffPermissions(userId, newPermissions);
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
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => removeStaff(staffMember.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
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
                    { key: 'canViewDashboard', label: 'View Dashboard', desc: 'Access dashboard stats' },
                    { key: 'canViewItems', label: 'View Items', desc: 'See inventory items' },
                    { key: 'canManageItems', label: 'Manage Items', desc: 'Add, edit, delete items' },
                    { key: 'canViewSales', label: 'View Sales', desc: 'See sales history' },
                    { key: 'canCreateSales', label: 'Create Sales', desc: 'Record new sales' },
                    { key: 'canViewUdhari', label: 'View Udhari', desc: 'See credit records' },
                    { key: 'canManageUdhari', label: 'Manage Udhari', desc: 'Add, edit credit entries' },
                    { key: 'canViewReports', label: 'View Reports', desc: 'Access reports' },
                    { key: 'canViewSettings', label: 'View Settings', desc: 'Access settings' },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.desc}</p>
                      </div>
                      <button
                        onClick={() => handleTogglePermission(
                          staffMember.id, 
                          perm.key as keyof UserPermissions, 
                          !!(staffMember.permissions || DEFAULT_WORKER_PERMISSIONS)[perm.key as keyof UserPermissions]
                        )}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          (staffMember.permissions || DEFAULT_WORKER_PERMISSIONS)[perm.key as keyof UserPermissions] 
                            ? 'bg-primary' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                          (staffMember.permissions || DEFAULT_WORKER_PERMISSIONS)[perm.key as keyof UserPermissions]
                            ? 'left-5'
                            : 'left-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
