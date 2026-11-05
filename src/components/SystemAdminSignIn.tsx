import React, { useEffect } from 'react';
import { Shield, ArrowRight, Lock, ArrowLeft } from 'lucide-react';

interface SystemAdminSignInProps {
  onSuccess?: any;
  onSwitchToStoreAdmin: () => void;
  onBackToCustomer: () => void;
}

export const SystemAdminSignIn: React.FC<SystemAdminSignInProps> = ({
  onSwitchToStoreAdmin,
  onBackToCustomer,
}) => {
  useEffect(() => {
    // Redirect to dedicated /admin/login gateway
    window.location.replace('/admin/login');
  }, []);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 text-white p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto font-black shadow-lg">
          <Shield className="w-7 h-7 stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Redirecting to System Admin Portal...</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            System Administrator authentication has moved to the hardened zero-password Google + TOTP 2FA portal at <code className="text-amber-300">/admin/login</code>.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/admin/login"
            className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Proceed to /admin/login</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBackToCustomer}
            className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Shopper
          </button>
          <button
            type="button"
            onClick={onSwitchToStoreAdmin}
            className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
          >
            Store Admin Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
