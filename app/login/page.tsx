'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const hasNavigated = useRef(false);

  useEffect(() => {
    console.log('LoginPage - isAuthenticated:', isAuthenticated);
    if (isAuthenticated && !hasNavigated.current) {
      hasNavigated.current = true;
      const savedUser = localStorage.getItem('auth_user');
      let redirectPath = '/dashboard';
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.role === 'super_admin') {
            redirectPath = '/super-admin';
          } else if (parsedUser.role === 'worker') {
            redirectPath = '/sales';
          }
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
      }
      router.push(redirectPath);
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      toast({ title: 'Error', description: 'Please enter both mobile number/email and password', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        toast({ title: 'Success', description: 'Logged in successfully!' });
        hasNavigated.current = true;
        // Directly redirect based on user type RIGHT AWAY
        setTimeout(() => {
          const savedUser = localStorage.getItem('auth_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.role === 'super_admin') {
              router.push('/super-admin');
            } else if (parsedUser.role === 'worker') {
              router.push('/sales');
            } else {
              router.push('/dashboard');
            }
          } else {
            router.push('/dashboard');
          }
        }, 100); // Small delay for localStorage to update
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Store className="h-8 w-8 text-purple-600" />
            Dukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username or Mobile Number</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username or mobile number"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 relative z-50 cursor-pointer"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
