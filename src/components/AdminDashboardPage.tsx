import React, { useState, useEffect } from 'react';
import {
  Shield,
  LogOut,
  Loader2,
  Sparkles,
  UserCheck,
  RefreshCw,
  Home,
  ArrowLeft,
  Store,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api.ts';
import { User, Supermarket } from '../types.ts';
import { SystemAdminPortal } from './SystemAdminPortal.tsx';
import { AdminPortal } from './AdminPortal.tsx';
import { Footer } from './Footer.tsx';

export const AdminDashboardPage: React.FC = () => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'supermarket'>('system');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = async () => {
    try {
      const [adminRes, smRes] = await Promise.all([
        api.getAdminMe(),
        api.getSupermarkets(),
      ]);
      if (adminRes.success) {
        setAdminUser(adminRes.admin);
      }
      if (smRes.success) {
        setSupermarkets(smRes.supermarkets);
        if (smRes.supermarkets.length > 0 && !selectedSupermarket) {
          setSelectedSupermarket(smRes.supermarkets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.adminLogout();
      try {
        localStorage.removeItem('smartcart_active_user');
      } catch {
        // ignore
      }
      window.location.replace('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
      window.location.replace('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-300">Loading System Administration Dashboard...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(6, 78, 59, 0.94) 0%, rgba(2, 44, 34, 0.97) 50%, rgba(2, 6, 23, 0.99) 100%), url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1920&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Admin Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-emerald-800/50 shadow-xl px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">SmartCart</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                System Admin
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/90 font-medium">
              Enterprise Dashboard &bull; /admin/dashboard
            </p>
          </div>
        </div>

        {/* Navigation Tabs (System Overview vs Supermarket Dashboard) */}
        <div className="flex items-center bg-slate-900/95 border border-emerald-700/50 rounded-2xl p-1 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>System Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedSupermarket && supermarkets.length > 0) {
                setSelectedSupermarket(supermarkets[0]);
              }
              setActiveTab('supermarket');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'supermarket'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Supermarket Dashboard</span>
            {selectedSupermarket && (
              <span className="text-[10px] bg-slate-950/80 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                {selectedSupermarket.supermarket_code}
              </span>
            )}
          </button>
        </div>

        {/* Admin Session Profile, Exit to Home & Logout */}
        <div className="flex items-center gap-2.5">
          {/* Prominent Back to Home Page Button */}
          <a
            href="/"
            className="py-2 px-3 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-amber-300 hover:text-amber-200 font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Exit admin dashboard and go back to home page"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Back to Home</span>
          </a>

          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
              {adminUser?.name || 'Administrator'}
            </span>
            <span className="text-[10px] font-mono text-emerald-300 truncate max-w-[140px]">
              {adminUser?.email || 'admin@smartcart.co.ke'}
            </span>
          </div>

          <div className="h-7 w-px bg-slate-800 hidden sm:block" />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="py-2 px-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md hover:shadow-red-900/30 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Log out of System Admin Portal"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Portal Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'supermarket' ? (
          /* Supermarket Management Dashboard View */
          selectedSupermarket ? (
            <div className="space-y-4">
              {/* Top Store Sub-Header with Back to System Admin and Store Selector */}
              <div className="bg-slate-900/90 border border-emerald-800/60 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('system')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="Return to System SuperAdmin Overview"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                    <span>Back to System Overview</span>
                  </button>

                  <div className="h-6 w-px bg-slate-700 hidden sm:block" />

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Active Supermarket Store
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                      <span>{selectedSupermarket.name}</span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        ({selectedSupermarket.supermarket_code})
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Store Switcher Dropdown */}
                {supermarkets.length > 1 && (
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-xs text-slate-400 font-medium">Switch Store:</span>
                    <select
                      value={selectedSupermarket.id}
                      onChange={(e) => {
                        const sm = supermarkets.find((s) => s.id === e.target.value);
                        if (sm) setSelectedSupermarket(sm);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      {supermarkets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.supermarket_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Render Full Supermarket Admin Portal */}
              <AdminPortal
                currentSupermarket={selectedSupermarket}
                onRefreshSupermarkets={loadData}
                onSignOut={handleLogout}
              />
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-3xl border border-emerald-800/60 p-8 text-center space-y-4 text-white">
              <Store className="w-12 h-12 text-amber-400 mx-auto" />
              <h2 className="text-xl font-black">No Supermarket Selected</h2>
              <p className="text-sm text-emerald-200/80 max-w-md mx-auto">
                No active supermarkets were found in the database. Please register a supermarket in the System Overview tab.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                Go to System Overview
              </button>
            </div>
          )
        ) : (
          /* System SuperAdmin View */
          <SystemAdminPortal
            supermarkets={supermarkets}
            onRefreshSupermarkets={loadData}
            onSelectSupermarket={(sm) => {
              setSelectedSupermarket(sm);
              setActiveTab('supermarket');
            }}
            onSignOut={handleLogout}
          />
        )}
      </main>

      {/* Unified Footer */}
      <Footer />
    </div>
  );
};
