import React, { useState, useMemo } from 'react';
import {
  Store,
  Camera,
  Search,
  ShoppingCart,
  Wallet,
  Award,
  History,
  LifeBuoy,
  Tag,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  LogIn,
  User as UserIcon,
  ChevronRight,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { Supermarket, User, ShoppingSession, CustomerLoyalty } from '../types.ts';
import { APP_CONFIG } from '../config.ts';

interface CustomerLandingPageProps {
  currentUser: User;
  supermarkets: Supermarket[];
  currentSupermarket: Supermarket | null;
  session: ShoppingSession | null;
  loyalty: CustomerLoyalty | null;
  onSelectSupermarket: (sm: Supermarket) => void;
  onOpenStoreSelector: () => void;
  onOpenScanner: () => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenBudget: () => void;
  onOpenSummary: () => void;
  onOpenHistory: () => void;
  onOpenLoyalty: () => void;
  onOpenAccount: (mode?: 'profile' | 'signin' | 'register' | 'forgot') => void;
  onOpenHelpCenter: () => void;
}

export const CustomerLandingPage: React.FC<CustomerLandingPageProps> = ({
  currentUser,
  supermarkets,
  currentSupermarket,
  session,
  loyalty,
  onSelectSupermarket,
  onOpenStoreSelector,
  onOpenScanner,
  onOpenSearch,
  onOpenCart,
  onOpenBudget,
  onOpenSummary,
  onOpenHistory,
  onOpenLoyalty,
  onOpenAccount,
  onOpenHelpCenter,
}) => {
  const [storeSearch, setStoreSearch] = useState('');

  // 1. Time-of-day greeting calculated for Africa/Nairobi
  const greeting = useMemo(() => {
    try {
      const nairobiDateStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
      const hour = new Date(nairobiDateStr).getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      return 'Good evening';
    } catch {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      return 'Good evening';
    }
  }, []);

  const isGuest =
    !currentUser ||
    currentUser.id === 'usr_guest' ||
    currentUser.email === 'guest@smartcart.co.ke' ||
    currentUser.name === 'Guest Shopper' ||
    currentUser.name === 'Shopper';

  const customerFirstName = !isGuest && currentUser.name
    ? currentUser.name.trim().split(' ')[0]
    : null;

  // Filter supermarkets by search query
  const filteredSupermarkets = useMemo(() => {
    if (!storeSearch.trim()) return supermarkets;
    const q = storeSearch.toLowerCase();
    return supermarkets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.branch && s.branch.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        s.supermarket_code.toLowerCase().includes(q)
    );
  }, [supermarkets, storeSearch]);

  const itemCount = session?.items.reduce((acc, it) => acc + it.quantity, 0) || 0;
  const estimatedTotal = session?.estimated_total || 0;
  const budget = session?.budget || 2000;
  const remainingBudget = budget - estimatedTotal;
  const budgetPercent = Math.min(100, Math.round((estimatedTotal / (budget || 1)) * 100));
  const isOverBudget = estimatedTotal > budget;
  const isNearBudget = budgetPercent >= 80 && !isOverBudget;

  const totalPoints = loyalty?.total_points || 0;
  const tier = loyalty?.tier || 'Bronze';

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* 1. WELCOME SECTION (Top of the page) */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-800/60 shadow-2xl bg-emerald-950 text-white p-6 sm:p-8 lg:p-10">
        {/* Background Supermarket Image & Gradient Layers */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/supermarket_hero.jpg"
            alt="Supermarket interior"
            className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.08] transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/92 to-emerald-950/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/50 to-transparent" />
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          {/* Greeting Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>SmartCart KE &bull; Fast Self-Checkout</span>
          </div>

          {/* Heading with Nairobi Time Greeting */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {customerFirstName ? (
                <>
                  {greeting}, {customerFirstName} 👋
                </>
              ) : (
                'Welcome to SmartCart KE'
              )}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 font-medium leading-relaxed max-w-xl">
              {APP_CONFIG.tagline}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (currentSupermarket) {
                  onOpenScanner();
                } else {
                  const selectorElement = document.getElementById('store-selector-section');
                  if (selectorElement) {
                    selectorElement.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    onOpenStoreSelector();
                  }
                }
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-emerald-950 font-black text-sm shadow-xl shadow-amber-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition" />
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>

            {isGuest && (
              <button
                type="button"
                onClick={() => onOpenAccount('signin')}
                className="px-6 py-3.5 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 text-white border-2 border-emerald-600/70 hover:border-amber-400 font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                <span>Sign in / Create account</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. STORE SELECTION SECTION */}
      <section id="store-selector-section" className="space-y-4">
        {currentSupermarket ? (
          /* Store is already selected: show "Shopping at: [Store name – Branch]" with a "Change store" link */
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Store className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Active Store
                  </span>
                  <span className="text-xs text-emerald-200/80 font-mono">
                    {currentSupermarket.supermarket_code}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white truncate mt-0.5">
                  Shopping at: {currentSupermarket.name} {currentSupermarket.branch ? `– ${currentSupermarket.branch}` : ''}
                </h2>
                <p className="text-xs text-emerald-200/90 truncate">
                  {currentSupermarket.location}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenStoreSelector}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-amber-200 font-bold text-xs transition border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <span>Change store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Store selection card with search box */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-800" />
                  <span>Choose your supermarket</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select a store branch to view live inventory and scan prices as you shop.
                </p>
              </div>

              {supermarkets.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search store or branch..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              )}
            </div>

            {/* Supermarkets list */}
            {supermarkets.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <Store className="w-10 h-10 text-emerald-700 mx-auto opacity-70" />
                <p className="text-sm font-bold text-emerald-950">
                  No supermarkets are available yet. Please check back soon.
                </p>
                <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                  SmartCart is expanding to retail locations across Kenya.
                </p>
              </div>
            ) : filteredSupermarkets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No stores found matching &quot;{storeSearch}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSupermarkets.map((sm) => (
                  <button
                    key={sm.id}
                    type="button"
                    onClick={() => onSelectSupermarket(sm)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-400 text-left transition-all duration-150 flex flex-col justify-between group active:scale-98 cursor-pointer shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 group-hover:border-emerald-300">
                          {sm.supermarket_code}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Open
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-950 mt-2 truncate">
                        {sm.name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                        {sm.branch || 'Main Branch'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {sm.location}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:text-emerald-900">
                      <span>Select Store</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. CUSTOMER DASHBOARD (Shown when a store is selected or customer is signed in) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Customer Dashboard</span>
            {currentSupermarket && (
              <span className="text-xs font-semibold text-emerald-300">
                &bull; {currentSupermarket.name}
              </span>
            )}
          </h2>
        </div>

        {/* Responsive Grid of Cards (1 column on phones, 2 on tablets, 3 on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Quick Actions */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Quick Actions
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Self-Checkout
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Scan, Search &amp; Cart
              </h3>
            </div>

            <div className="space-y-2">
              {/* Big Camera Scan Button */}
              <button
                type="button"
                onClick={onOpenScanner}
                disabled={!currentSupermarket}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-900 hover:to-emerald-950 text-white font-black text-xs transition flex items-center justify-between shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight font-black text-xs">Scan a Barcode</span>
                    <span className="text-[10px] text-emerald-200/90 font-medium">Point camera at product</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenSearch}
                  disabled={!currentSupermarket}
                  className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Search Products</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenCart}
                  className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer relative"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-800" />
                  <span>My Cart</span>
                  {itemCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black">
                      {itemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Budget Tracker */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Spending Sentinel
                </span>
                <button
                  type="button"
                  onClick={onOpenBudget}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                >
                  Set Budget
                </button>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Budget Tracker
              </h3>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Spent:</span>
                <span className="font-mono font-bold text-slate-900">
                  KSh {estimatedTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Trip Budget:</span>
                <span className="font-mono font-bold text-slate-900">
                  KSh {budget.toLocaleString()}
                </span>
              </div>

              {/* Progress bar: green, then amber near 80%, then red when over budget */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? 'bg-rose-500'
                      : isNearBudget
                      ? 'bg-amber-400'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, (estimatedTotal / (budget || 1)) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span
                  className={
                    isOverBudget
                      ? 'text-rose-600'
                      : isNearBudget
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }
                >
                  {isOverBudget
                    ? `Over by KSh ${(estimatedTotal - budget).toLocaleString()}`
                    : `KSh ${remainingBudget.toLocaleString()} remaining`}
                </span>
                <span className="font-mono text-slate-400">{budgetPercent}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Cart Summary */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Current Basket
                </span>
                <span className="text-[10px] font-bold text-emerald-700">
                  Live Authoritative Pricing
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Cart Summary
              </h3>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">Total Items:</span>
                <span className="font-mono font-bold text-slate-900">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-emerald-200/60">
                <span className="text-xs font-bold text-slate-800">Running Total:</span>
                <span className="text-lg font-black font-mono text-emerald-950">
                  KSh {estimatedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSummary}
              disabled={itemCount === 0}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>View Receipt Summary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Loyalty Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/15 rounded-3xl p-5 border border-amber-300/80 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                  SmartPoints
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                  {tier} Member
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Loyalty &amp; Rewards
              </h3>
            </div>

            <div className="p-3.5 bg-white/90 rounded-2xl border border-amber-200/80 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Points Balance
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-emerald-950">
                  {totalPoints.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-700">PTS</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                = KSh {totalPoints.toLocaleString()} shopping credit value
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenLoyalty}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Redeem Rewards</span>
            </button>
          </div>

          {/* Card 5: Recent Receipts / Shopping History */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Visits &amp; Receipts
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Digital records</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Shopping History
              </h3>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                Instant digital receipts saved securely.
              </p>
              <p className="text-[11px] text-slate-500">
                Verify past visits, itemized prices, and download summaries anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenHistory}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>View Past Receipts</span>
            </button>
          </div>

          {/* Card 6: Offers & Discounts Banner */}
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl p-5 border border-emerald-700/60 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full">
                  Deals &amp; Specials
                </span>
                <Tag className="w-4 h-4 text-amber-300" />
              </div>
              <h3 className="text-base font-black text-white mt-1">
                Store Promotions
              </h3>
            </div>

            <div className="space-y-1 text-xs text-emerald-100/90 leading-relaxed">
              <p className="font-bold text-amber-300 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                <span>Save on Daily Essentials</span>
              </p>
              <p className="text-[11px] text-emerald-200/80">
                Discounts automatically applied in real time as you scan items at {currentSupermarket?.name || 'participating stores'}.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Explore Specials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 7: Help Center Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold shrink-0">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Need Customer Support?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Contact the customer help center for price discrepancies, barcode assistance, or feedback.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${APP_CONFIG.developerPhone}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{APP_CONFIG.developerPhone}</span>
                </a>
                <button
                  type="button"
                  onClick={onOpenHelpCenter}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Message Support</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
