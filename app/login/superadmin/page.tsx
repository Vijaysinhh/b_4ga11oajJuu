'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, Store, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const hasNavigated = useRef(false);

  useEffect(() => {
    console.log('SuperAdminLoginPage - isAuthenticated:', isAuthenticated);
    if (isAuthenticated && !hasNavigated.current) {
      hasNavigated.current = true;
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.role === 'super_admin') {
            router.push('/super-admin');
            return;
          }
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
      }
      // If not super admin, redirect to regular login
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please enter both email and password', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast({ title: 'Success', description: 'Logged in successfully!' });
        hasNavigated.current = true;
        setTimeout(() => {
          const savedUser = localStorage.getItem('auth_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.role === 'super_admin') {
              router.push('/super-admin');
            } else {
              toast({ title: 'Error', description: 'Only super admin can access this page', variant: 'destructive' });
              router.push('/login');
            }
          }
        }, 100);
      } else {
        toast({ title: 'Error', description: result.error || 'Invalid credentials', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'An error occurred during login', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-slate-700" />
            Dukan - Super Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter super admin email"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter super admin password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-700 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Logging in...' : 'Login as Super Admin'}
              </button>
            </form>

            <div className="pt-4">
              <button
                onClick={() => router.push('/login')}
                className="w-full text-sm text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Back to Shop Login
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}