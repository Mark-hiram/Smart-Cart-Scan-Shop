import React, { useState } from 'react';
import {
  Store,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  KeyRound,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api.ts';
import { Supermarket, User } from '../types.ts';

interface StoreAdminSignInProps {
  supermarkets: Supermarket[];
  selectedSupermarket: Supermarket | null;
  onSuccess: (user: User, supermarket: Supermarket) => void;
  onSwitchToSystemAdmin: () => void;
  onBackToCustomer: () => void;
}

export const StoreAdminSignIn: React.FC<StoreAdminSignInProps> = ({
  supermarkets,
  selectedSupermarket,
  onSuccess,
  onSwitchToSystemAdmin,
  onBackToCustomer,
}) => {
  const [supermarketCode, setSupermarketCode] = useState<string>(
    selectedSupermarket ? selectedSupermarket.supermarket_code : ''
  );
  const [password, setPassword] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginRoleBadge, setLoginRoleBadge] = useState<string>('');

  // Forgot password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<{
    newPassword: string;
    targetEmail: string;
    supermarketName: string;
    accountType: string;
  } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  /**
   * Helper function to identify the linked supermarket by code.
   * Matches against loaded supermarkets and validates existence.
   */
  const identifyLinkedSupermarket = (code: string): Supermarket | null => {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    return (
      supermarkets.find(
        (s) => s.supermarket_code.trim().toUpperCase() === normalized
      ) || null
    );
  };

  /**
   * Helper function to route the validated store admin to their specific
   * management dashboard with full supermarket context and access.
   */
  const routeToStoreManagementDashboard = (user: User, linkedStore: Supermarket) => {
    onSuccess(user, linkedStore);
  };

  const identifiedSupermarket = identifyLinkedSupermarket(supermarketCode);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const code = supermarketCode.trim().toUpperCase();
      if (!code) {
        throw new Error('Please enter your Supermarket Code.');
      }
      if (!password) {
        throw new Error('Please enter your store password.');
      }

      // Validates supermarket credentials directly against backend
      // Supports both Primary Store Admin password and authorized Staff Member passwords
      const res = await api.storeAdminLogin(code, password, usernameOrEmail.trim() || undefined);

      if (res.success && res.user && res.supermarket) {
        const targetStore = res.supermarket || identifyLinkedSupermarket(code);
        if (!targetStore) {
          throw new Error('Linked supermarket could not be resolved.');
        }

        routeToStoreManagementDashboard(res.user, targetStore);
      } else {
        throw new Error('Authentication failed. Check your Supermarket Code and Password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStorePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const code = supermarketCode.trim().toUpperCase();
      if (!code) {
        throw new Error('Please enter your Supermarket Code (e.g. SM001, QS002).');
      }
      const res = await api.storeAdminForgotPassword(code, usernameOrEmail.trim() || undefined);
      if (res.success) {
        setForgotSuccess({
          newPassword: res.newPassword,
          targetEmail: res.targetEmail,
          supermarketName: res.supermarketName,
          accountType: res.accountType,
        });
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to dispatch new password. Check your Supermarket Code.');
    } finally {
      setForgotLoading(false);
    }
  };



  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Banner with Appealing Store Aisles Background */}
        <div className="relative overflow-hidden text-white p-6 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/store_admin_hero.jpg"
              alt="Store aisles"
              className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 space-y-2">
            <button
              onClick={onBackToCustomer}
              className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 font-semibold mb-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Customer Scanner
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg">
                <Store className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  Store Portal
                </span>
                <h1 className="text-xl font-black tracking-tight mt-0.5">Supermarket Admin Sign In</h1>
              </div>
            </div>

            <p className="text-xs text-emerald-200/90 pt-1">
              Securely authenticate with your Supermarket Code to access inventory, live shopper sessions, and price management.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {errorMsg && !isForgotMode && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isForgotMode ? (
            /* STORE ADMIN FORGOT PASSWORD VIEW (NO SIGNUP) */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Receive Store Admin Password via Email</span>
                </div>
                Enter your Supermarket Code (and optional staff username). The system will generate a new password and dispatch it directly to the store manager or staff email.
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>New Password Dispatched to Store Email!</span>
                  </div>
                  <div className="text-xs text-emerald-800 space-y-1">
                    <p>
                      Store: <strong>{forgotSuccess.supermarketName}</strong> ({forgotSuccess.accountType})
                    </p>
                    <p className="text-[11px] text-slate-600">Dispatched to registered store email:</p>
                    <p className="font-mono font-bold bg-white p-2 rounded-lg border border-emerald-200 text-emerald-950">
                      {forgotSuccess.targetEmail}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Generated New Password:
                    </span>
                    <span className="text-base font-black font-mono text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-md inline-block select-all">
                      {forgotSuccess.newPassword}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPassword(forgotSuccess.newPassword);
                      setIsForgotMode(false);
                      setForgotSuccess(null);
                    }}
                    className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                  >
                    <span>Use this Password to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotStorePassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Supermarket Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={supermarketCode}
                        onChange={(e) => setSupermarketCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ENTER STORE CODE"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Staff Username / Email <span className="text-slate-400 font-normal lowercase">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Leave blank for Store Manager password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setForgotError('');
                        setForgotSuccess(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                    >
                      Back to Sign In
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" />
                      )}
                      <span>Send New Password</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Field 1: Supermarket Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>Supermarket Code</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Assigned store ID</span>
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={supermarketCode}
                    onChange={(e) => {
                      setSupermarketCode(e.target.value.toUpperCase());
                      setErrorMsg('');
                    }}
                    placeholder="e.g. ENTER STORE CODE"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase tracking-wider transition"
                    required
                  />
                </div>

                {/* Dynamic Linked Supermarket Preview */}
                {identifiedSupermarket ? (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-900">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Linked: <strong>{identifiedSupermarket.name}</strong> ({identifiedSupermarket.location})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-mono">
                      {identifiedSupermarket.supermarket_code}
                    </span>
                  </div>
                ) : supermarketCode.trim() ? (
                  <p className="mt-1.5 text-[11px] text-amber-700 italic">
                    Will verify code &ldquo;{supermarketCode.trim().toUpperCase()}&rdquo; against store database.
                  </p>
                ) : null}
              </div>

              {/* Optional Field: Staff Username / Login ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>Staff Username / Email</span>
                    <span className="text-slate-400 font-normal lowercase">(Optional for staff)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Leave blank for Store Manager</span>
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. staff username or email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>Password</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setForgotError('');
                      setForgotSuccess(null);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter store password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? 'Validating Supermarket Credentials...' : 'Sign In to Store Dashboard'}
              </button>
            </form>
          )}



          {/* Switch to System Admin */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need platform-wide access?</span>
            <a
              href="/admin/login"
              className="font-bold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center gap-1"
            >
              System Admin Sign In
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
