import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  ShoppingCart,
  Store,
  Shield,
  User as UserIcon,
  LogOut,
  UserCheck,
  LogIn,
  KeyRound,
  ArrowRight,
  LifeBuoy,
  Check,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { Supermarket, User } from '../types.ts';

interface NavbarProps {
  currentUser: User;
  currentSupermarket: Supermarket | null;
  itemCount: number;
  estimatedTotal: number;
  onOpenSupermarketSelector: () => void;
  onOpenCart: () => void;
  onSwitchUser?: (user: User) => void;
  onOpenAccount?: (mode?: 'profile' | 'signin' | 'register' | 'forgot') => void;
  onSignOut: () => void;
  availableUsers?: User[];
  currentView: 'customer' | 'admin' | 'system';
  onNavigateView: (view: 'customer' | 'admin' | 'system') => void;
  onOpenHelpCenter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentSupermarket,
  itemCount,
  estimatedTotal,
  onOpenSupermarketSelector,
  onOpenCart,
  onOpenAccount,
  onSignOut,
  currentView,
  onNavigateView,
  onOpenHelpCenter,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when master menu is open on mobile
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const closeMenuAnd = (action?: () => void) => {
    setIsMenuOpen(false);
    if (action) action();
  };

  const isGuest =
    currentUser.id === 'usr_guest' || currentUser.email === 'guest@smartcart.co.ke';

  return (
    <>
      <header className="sticky top-0 z-40 bg-emerald-950/92 backdrop-blur-md text-white shadow-xl border-b border-emerald-800/60">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo & Store Info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                if (currentUser.role === 'SUPERMARKET_ADMIN') {
                  onNavigateView('admin');
                } else if (currentUser.role === 'SYSTEM_ADMIN') {
                  onNavigateView('system');
                } else {
                  onNavigateView('customer');
                }
              }}
              className="flex items-center gap-2.5 text-left group shrink-0 cursor-pointer"
              title="SmartCart Supermarket System"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
                <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight leading-none text-white font-['Plus_Jakarta_Sans']">
                    SMART<span className="text-amber-400">CART</span>
                  </span>
                  <span className="text-[9px] font-extrabold bg-amber-400 text-emerald-950 px-1.5 py-0.2 rounded leading-tight tracking-wider uppercase">
                    KE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {currentSupermarket ? (
                    <span className="text-[11px] text-emerald-200/90 font-medium truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">{currentSupermarket.name}</span>
                      <span className="text-[9px] font-mono bg-emerald-900/80 text-amber-300 px-1 rounded border border-emerald-700/60 shrink-0">
                        {currentSupermarket.supermarket_code}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-300/70 font-medium truncate">
                      Supermarket Scan &amp; Shop System
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* SINGLE COLLAPSED MASTER MENU ICON BUTTON */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={isMenuOpen}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md active:scale-95 cursor-pointer relative ${
                isMenuOpen
                  ? 'bg-amber-400 text-emerald-950 ring-2 ring-amber-300'
                  : 'bg-emerald-900/90 hover:bg-emerald-800 text-white border-2 border-emerald-600/70 hover:border-amber-400'
              }`}
              title="Open Navigation & Actions Menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2.5]" />
              )}

              {/* Live Cart Item Count Badge */}
              {!isMenuOpen && itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-emerald-950 font-black text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-md border-2 border-emerald-950 animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MASTER QUICK-ACCESS HUB MODAL / DRAWER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          {/* Backdrop Click Closes Menu */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-full max-w-md h-full max-h-screen bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight leading-tight">
                    Quick Access Hub
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-medium">
                    All SmartCart Tools &amp; Navigation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Close Menu (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
              {/* SECTION 1: USER ACCOUNT CARD */}
              <div className="p-3.5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {currentUser.name || 'Shopper'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          {currentUser.role === 'SYSTEM_ADMIN'
                            ? 'SuperAdmin'
                            : currentUser.role === 'SUPERMARKET_ADMIN'
                            ? 'Store Admin'
                            : 'Shopper'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => closeMenuAnd(() => onOpenAccount?.(isGuest ? 'signin' : 'profile'))}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                      <span>{isGuest ? 'Shopper Account & Identification' : 'My Profile & Account Settings'}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* SECTION 2: LIVE SHOPPING CART */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Shopping Cart</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} scanned
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total</span>
                    <span className="text-sm font-black font-mono text-emerald-900">
                      KSh {estimatedTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => closeMenuAnd(onOpenCart)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-900 hover:to-emerald-950 text-white font-black text-xs transition flex items-center justify-between shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
                    <span>Open Live Shopping Cart</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
                </button>
              </div>

              {/* SECTION 3: CONNECTED SUPERMARKET */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 truncate block">
                        {currentSupermarket ? currentSupermarket.name : 'No Supermarket Selected'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {currentSupermarket ? currentSupermarket.supermarket_code : 'Tap below to connect store'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => closeMenuAnd(onOpenSupermarketSelector)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-between cursor-pointer"
                >
                  <span>Switch / Select Supermarket</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* SECTION 4: HELP CENTER & SYSTEM ADMIN DESK */}
              {onOpenHelpCenter && (
                <div className="p-3.5 bg-gradient-to-r from-purple-50 via-white to-purple-50/60 rounded-2xl border border-purple-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      <LifeBuoy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-purple-950 block">Customer Help Center</span>
                      <span className="text-[11px] text-purple-700 font-medium">
                        Direct support line to System Admin Hiram Mark Karanja
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => closeMenuAnd(onOpenHelpCenter)}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs transition flex items-center justify-between shadow-xs cursor-pointer active:scale-95"
                  >
                    <span>Message System Administrator</span>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-200" />
                  </button>
                </div>
              )}

              {/* SECTION 5: APPLICATION VIEW & PORTAL SWITCHER (Only shown to authenticated staff/admins) */}
              {(currentUser.role === 'admin' ||
                currentUser.role === 'SYSTEM_ADMIN' ||
                currentUser.role === 'SUPERMARKET_ADMIN') && (
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                    Portals &amp; Views
                  </span>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => closeMenuAnd(() => onNavigateView('customer'))}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        currentView === 'customer'
                          ? 'bg-amber-100 text-amber-950 font-black'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-800" />
                        <span>Customer Scan &amp; Shop</span>
                      </span>
                      {currentView === 'customer' && <Check className="w-4 h-4 text-amber-900 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => closeMenuAnd(() => onNavigateView('admin'))}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        currentView === 'admin'
                          ? 'bg-amber-100 text-amber-950 font-black'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-800" />
                        <span>Store Admin Portal</span>
                      </span>
                      {currentView === 'admin' && <Check className="w-4 h-4 text-amber-900 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => closeMenuAnd(() => onNavigateView('system'))}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        currentView === 'system'
                          ? 'bg-amber-100 text-amber-950 font-black'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span>System SuperAdmin Portal</span>
                      </span>
                      {currentView === 'system' && <Check className="w-4 h-4 text-amber-900 stroke-[3]" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
