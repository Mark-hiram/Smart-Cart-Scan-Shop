import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { api } from '../api.ts';
import { User } from '../types.ts';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [adminUser, setAdminUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    api
      .getAdminMe()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.admin && (res.admin.role === 'admin' || res.admin.role === 'SYSTEM_ADMIN')) {
          setAdminUser(res.admin);
          setStatus('authorized');
        } else {
          setStatus('unauthorized');
          window.location.replace('/admin/login');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('unauthorized');
        window.location.replace('/admin/login');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-xl">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">Validating Admin Access</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying administrator session &amp; security tokens...</p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/30 flex items-center justify-center mb-4 shadow-xl">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 mt-1">Redirecting to administrator login...</p>
      </div>
    );
  }

  return <>{children}</>;
};
