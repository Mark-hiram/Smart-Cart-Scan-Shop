import React, { useState, useEffect } from 'react';
import {
  Camera,
  Search,
  ShoppingCart,
  Wallet,
  FileText,
  History,
  Store,
  Sparkles,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  HelpCircle,
  Award,
  Gift,
  Star,
  LogOut,
  LogIn,
  Tag,
  Lightbulb,
  LifeBuoy,
  Phone,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Bell,
  CheckCircle2,
  Percent,
  Check,
  X,
  PhoneCall,
  Flame,
  Mail,
  User as UserIcon,
  Monitor,
  Smartphone,
  Laptop,
  ShoppingBag,
  CornerDownLeft,
  Wifi,
  Battery,
} from 'lucide-react';
import { api } from '../api.ts';
import {
  Supermarket,
  ShoppingSession,
  CustomerLoyalty,
  User,
  Product,
} from '../types.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { CustomerHelpCenterModal } from './CustomerHelpCenterModal.tsx';
import supermarketHeroImg from '../assets/images/supermarket_hero_1793447689428.jpg';

interface CustomerDashboardProps {
  currentUser?: User;
  supermarket: Supermarket;
  session: ShoppingSession | null;
  loyalty: CustomerLoyalty | null;
  onOpenAccount?: (mode?: 'profile' | 'signin' | 'register') => void;
  onOpenScanner: () => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenBudget: () => void;
  onOpenSummary: () => void;
  onOpenHistory: () => void;
  onOpenLoyalty: () => void;
  onOpenStoreSelector: () => void;
  onQuickScanBarcode: (barcode: string) => void;
  onUpdateCartItemQty: (itemId: string, newQty: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onSignOut?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentUser,
  supermarket,
  session,
  loyalty,
  onOpenAccount,
  onOpenScanner,
  onOpenSearch,
  onOpenCart,
  onOpenBudget,
  onOpenSummary,
  onOpenHistory,
  onOpenLoyalty,
  onOpenStoreSelector,
  onQuickScanBarcode,
  onUpdateCartItemQty,
  onRemoveCartItem,
  onSignOut,
}) => {
  const user = currentUser || {
    id: 'usr_guest',
    name: 'Shopper',
    email: 'guest@smartcart.co.ke',
    role: 'CUSTOMER' as const,
  };
  const userName = user.name || 'Shopper';
  const userEmail = user.email || 'guest@smartcart.co.ke';
  const userInitial = userName.charAt(0).toUpperCase() || 'S';

  const itemCount = session?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const estimatedTotal = session?.estimated_total || 0;
  const budget = session?.budget || 2000;
  const remainingBudget = budget - estimatedTotal;
  const isBudgetExceeded = estimatedTotal > budget;
  const budgetPercent = Math.min(100, Math.round((estimatedTotal / budget) * 100));
  const isNearBudgetLimit = budget > 0 && estimatedTotal >= budget * 0.9 && !isBudgetExceeded;

  const totalPoints = loyalty?.total_points || 0;
  const pointsValue = loyalty?.points_value_ksh || totalPoints;
  const tier = loyalty?.tier || 'Bronze';
  const cartPotentialPoints = Math.floor(estimatedTotal / 100);

  // Device view switcher on desktop screens: 'responsive' (full web app) or 'mobile_frame' (phone simulator)
  const [deviceMode, setDeviceMode] = useState<'responsive' | 'mobile_frame'>('responsive');

  // Quick Actions Modals State (View Specials, Shopping Tips, Support)
  const [showSpecials, setShowSpecials] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Specials data state
  const [specialsProducts, setSpecialsProducts] = useState<Product[]>([]);
  const [quickTestProducts, setQuickTestProducts] = useState<Product[]>([]);
  const [loadingSpecials, setLoadingSpecials] = useState(false);
  const [addedSpecialBarcode, setAddedSpecialBarcode] = useState<string | null>(null);

  // Support data state
  const [selectedAisle, setSelectedAisle] = useState('Aisle 1 - Fresh Produce & Fruits');
  const [attendantRequested, setAttendantRequested] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Load products for specials and desktop quick scan test pills
  useEffect(() => {
    loadStoreCatalog();
  }, [supermarket.id]);

  const loadStoreCatalog = async () => {
    try {
      const res = await api.searchProducts(supermarket.id, '', '');
      if (res.success && res.products) {
        setQuickTestProducts(res.products.slice(0, 6));
        const discounted = res.products.filter(
          (p) => p.discount_price > 0 && p.discount_price < p.selling_price
        );
        setSpecialsProducts(discounted.length > 0 ? discounted : res.products.slice(0, 8));
      }
    } catch (err) {
      console.error('Failed to load store products:', err);
    }
  };

  useEffect(() => {
    if (showSpecials && specialsProducts.length === 0) {
      setLoadingSpecials(true);
      loadStoreCatalog().finally(() => setLoadingSpecials(false));
    }
  }, [showSpecials]);

  // Desktop Keyboard Shortcuts: [S] Scan, [C] Cart, [B] Budget, [/] Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onOpenScanner();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onOpenCart();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onOpenBudget();
      } else if (e.key === '/') {
        e.preventDefault();
        onOpenSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenScanner, onOpenCart, onOpenBudget, onOpenSearch]);

  const handleAddSpecialToCart = (barcode: string) => {
    onQuickScanBarcode(barcode);
    setAddedSpecialBarcode(barcode);
    setTimeout(() => {
      setAddedSpecialBarcode(null);
    }, 1800);
  };

  // Reusable subcomponents for layout flexibility
  const renderHeroSection = (isCompact = false) => (
    <div
      className={`relative overflow-hidden rounded-3xl border border-emerald-900/60 shadow-xl bg-emerald-950 text-white ${
        isCompact ? 'p-4 sm:p-5' : 'p-5 sm:p-7 lg:p-9 mb-5 sm:mb-6'
      }`}
    >
      {/* Background Supermarket Shopping Image with layered gradient overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={supermarketHeroImg}
          onError={(e) => {
            e.currentTarget.src = '/supermarket_hero.jpg';
          }}
          alt="Supermarket grocery shopping aisle"
          className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.05] transition-transform duration-700 hover:scale-105"
          loading="eager"
        />
        {/* Layer 1: Dark green gradient overlay across from left to right */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/92 to-emerald-950/45 lg:via-emerald-950/85 lg:to-transparent" />
        {/* Layer 2: Subtle vertical gradient vignette to ensure high legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/50 to-transparent" />
        {/* Layer 3: Warm subtle amber ambient glow in the top-left */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Hero Foreground Content */}
      <div className="relative z-10 max-w-2xl space-y-3.5 sm:space-y-4">
        {/* Supermarket & Feature Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/90 backdrop-blur-md border border-emerald-700/60 text-[11px] font-bold text-emerald-100 shadow-xs">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[190px] sm:max-w-none">{supermarket.name}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-400/40 text-[11px] font-black text-amber-300 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Scan &amp; Go Self-Checkout</span>
          </span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-1.5 sm:space-y-2">
          <h1
            className={`${
              isCompact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            } font-black tracking-tight text-white leading-tight drop-shadow-sm`}
          >
            Shop Smarter. <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Scan As You Go.
            </span>
          </h1>
          <p
            className={`${
              isCompact ? 'text-xs' : 'text-xs sm:text-sm lg:text-base'
            } text-emerald-100/90 font-medium leading-relaxed max-w-xl`}
          >
            Scan barcodes directly with your smartphone camera, track live spending against your budget,
            and skip long checkout lines with instant digital receipts.
          </p>
        </div>

        {/* Value Highlights with Zero-Pill Typographic Separators */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-emerald-200/90 font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Live Cart &amp; Budget Sentinel</span>
          </span>
          <span aria-hidden="true" className="text-emerald-500/80">·</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>SmartPoints Loyalty</span>
          </span>
          <span aria-hidden="true" className="text-emerald-500/80">·</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Zero Queues</span>
          </span>
        </div>

        {/* Clear Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 pt-2">
          {/* CTA 1: Start Shopping (App Yellow/Orange Branding) */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-emerald-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-950/30 transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 cursor-pointer group"
            title="Browse full supermarket product catalog [Press /]"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4] group-hover:scale-110 transition" />
            <span>Start Shopping</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </button>

          {/* CTA 2: Scan Barcode (App Dark Green Branding with Gold/Amber Accents) */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-emerald-900/95 hover:bg-emerald-800 text-white border-2 border-emerald-500/70 hover:border-amber-400 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/40 backdrop-blur-md transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 cursor-pointer group"
            title="Open camera barcode scanner [Press S]"
          >
            <div className="w-5 h-5 rounded-lg bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>Scan Barcode</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-emerald-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-emerald-700/60 ml-1">
              [S]
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountCard = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-amber-300 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          {userInitial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-900 truncate">{userName}</span>
            <span className="text-[9px] font-bold bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.2 rounded-full shrink-0">
              {tier}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate font-mono">{userEmail}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setShowHelpCenter(true)}
          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
          title="Customer Help Center & System Admin support line"
        >
          <LifeBuoy className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Help Center</span>
        </button>
      </div>
    </div>
  );

  const renderSupermarketCard = () => (
    <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white p-5 rounded-3xl shadow-xl border border-emerald-700/50 relative overflow-hidden">
      {/* Subtle decorative background ring */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-emerald-600/10 pointer-events-none" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-400 text-emerald-950 px-2.5 py-0.5 rounded-full">
            CONNECTED STORE
          </span>
          <button
            onClick={onOpenStoreSelector}
            className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1"
          >
            Switch Store
          </button>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{supermarket.name}</h1>
          <p className="text-xs text-emerald-200/90 flex items-center gap-1 mt-0.5">
            <span>Code: <strong className="font-mono text-amber-300">{supermarket.supermarket_code}</strong></span>
            <span>•</span>
            <span className="truncate">{supermarket.location}</span>
          </p>
        </div>

        <p className="text-[11px] text-emerald-200/75 italic">
          &ldquo;Your shopping, your way. Real-time prices from this supermarket.&rdquo;
        </p>

        {/* Header Visual Budget Progress Bar */}
        <div className={`mt-3 pt-3 border-t bg-emerald-950/40 rounded-2xl p-3 border backdrop-blur-xs space-y-2 transition ${
          isBudgetExceeded
            ? 'border-rose-500/80 ring-2 ring-rose-500/40'
            : isNearBudgetLimit
            ? 'border-amber-400/80 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10'
            : 'border-emerald-600/30 border-t-emerald-700/60'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Wallet className={`w-3.5 h-3.5 ${isNearBudgetLimit ? 'text-amber-300 animate-pulse' : 'text-amber-400'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Budget Utilization
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full transition ${
                  isBudgetExceeded
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isNearBudgetLimit
                    ? 'bg-amber-400 text-amber-950 animate-pulse font-extrabold shadow-sm ring-1 ring-amber-300'
                    : budgetPercent >= 80
                    ? 'bg-amber-400 text-emerald-950'
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                }`}
              >
                {isBudgetExceeded
                  ? `${Math.round((estimatedTotal / (budget || 1)) * 100)}% OVER`
                  : isNearBudgetLimit
                  ? `⚠️ ${budgetPercent}% Warning`
                  : `${budgetPercent}% Used`}
              </span>
              <button
                onClick={onOpenBudget}
                className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                title="Adjust trip budget"
              >
                Adjust
              </button>
            </div>
          </div>

          {/* Visual Progress Bar Track with subtle pulse if near limit */}
          <div className="relative w-full bg-emerald-950/80 h-3 rounded-full overflow-hidden p-0.5 border border-emerald-700/60 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isBudgetExceeded
                  ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 animate-pulse'
                  : isNearBudgetLimit
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 animate-pulse'
                  : budgetPercent >= 80
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                  : 'bg-gradient-to-r from-teal-400 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, (estimatedTotal / (budget || 1)) * 100)}%` }}
            />
          </div>

          {/* Progress Metrics Row */}
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-100/90 pt-0.5">
            <span>
              Spent: <strong className="text-white font-bold">KSh {estimatedTotal.toLocaleString()}</strong>
            </span>
            <span>
              Budget: <strong className="text-amber-300 font-bold">KSh {budget.toLocaleString()}</strong>
            </span>
            <span className={isBudgetExceeded ? 'text-rose-300 font-bold' : isNearBudgetLimit ? 'text-amber-300 font-bold' : 'text-emerald-300'}>
              {isBudgetExceeded
                ? `+KSh ${(estimatedTotal - budget).toLocaleString()} over`
                : `${remainingBudget.toLocaleString()} left`}
            </span>
          </div>

          {/* 90% Threshold Warning in Header */}
          {isNearBudgetLimit && (
            <div className="mt-2 p-2 bg-amber-400/20 border border-amber-400/60 rounded-xl text-amber-200 text-[11px] font-semibold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                <strong>90%+ Warning:</strong> You have reached {budgetPercent}% of your KSh {budget.toLocaleString()} budget. Only KSh {remainingBudget.toLocaleString()} left!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="bg-white p-3 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick Actions
        </span>
        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Store Shortcuts</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* View Specials */}
        <button
          type="button"
          onClick={() => setShowSpecials(true)}
          className="flex flex-col items-center justify-center py-2 px-1 sm:px-2 bg-gradient-to-b from-amber-50/70 via-white to-amber-50/30 hover:from-amber-100 hover:to-amber-50/80 border border-amber-200/80 hover:border-amber-400 rounded-2xl transition-all duration-150 group active:scale-95 text-center shadow-2xs cursor-pointer"
          title="View discounted products and deals in this store"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition mb-1">
            <Tag className="w-4 h-4 stroke-[2.3]" />
          </div>
          <span className="text-[11px] font-black text-slate-900 group-hover:text-amber-950 leading-tight">
            Specials
          </span>
          <span className="text-[9px] text-amber-700 font-bold mt-0.5 hidden sm:inline">
            Deals
          </span>
        </button>

        {/* Shopping Tips */}
        <button
          type="button"
          onClick={() => setShowTips(true)}
          className="flex flex-col items-center justify-center py-2 px-1 sm:px-2 bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 hover:from-emerald-100 hover:to-emerald-50/80 border border-emerald-200/80 hover:border-emerald-400 rounded-2xl transition-all duration-150 group active:scale-95 text-center shadow-2xs cursor-pointer"
          title="Smart self-checkout tips and shopping tricks"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition mb-1">
            <Lightbulb className="w-4 h-4 stroke-[2.3]" />
          </div>
          <span className="text-[11px] font-black text-slate-900 group-hover:text-emerald-950 leading-tight">
            Tips
          </span>
          <span className="text-[9px] text-emerald-700 font-bold mt-0.5 hidden sm:inline">
            Guide
          </span>
        </button>

        {/* Aisle Attendant Support */}
        <button
          type="button"
          onClick={() => setShowSupport(true)}
          className="flex flex-col items-center justify-center py-2 px-1 sm:px-2 bg-gradient-to-b from-blue-50/70 via-white to-blue-50/30 hover:from-blue-100 hover:to-blue-50/80 border border-blue-200/80 hover:border-blue-400 rounded-2xl transition-all duration-150 group active:scale-95 text-center shadow-2xs cursor-pointer"
          title="Call store attendant to your aisle & FAQs"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition mb-1">
            <Bell className="w-4 h-4 stroke-[2.3]" />
          </div>
          <span className="text-[11px] font-black text-slate-900 group-hover:text-blue-950 leading-tight">
            Attendant
          </span>
          <span className="text-[9px] text-blue-700 font-bold mt-0.5 hidden sm:inline">
            Aisle Help
          </span>
        </button>

        {/* System Admin Help Center */}
        <button
          type="button"
          onClick={() => setShowHelpCenter(true)}
          className="flex flex-col items-center justify-center py-2 px-1 sm:px-2 bg-gradient-to-b from-purple-50/70 via-white to-purple-50/30 hover:from-purple-100 hover:to-purple-50/80 border border-purple-200/80 hover:border-purple-400 rounded-2xl transition-all duration-150 group active:scale-95 text-center shadow-2xs cursor-pointer"
          title="Message System Admin regarding price discrepancies, account issues or feedback"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition mb-1">
            <LifeBuoy className="w-4 h-4 stroke-[2.3]" />
          </div>
          <span className="text-[11px] font-black text-slate-900 group-hover:text-purple-950 leading-tight">
            Help Center
          </span>
          <span className="text-[9px] text-purple-700 font-bold mt-0.5 hidden sm:inline">
            Admin Line
          </span>
        </button>
      </div>
    </div>
  );

  const renderPrimaryActionScan = () => (
    <button
      onClick={onOpenScanner}
      className="w-full py-4 sm:py-5 px-5 sm:px-6 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white rounded-3xl shadow-xl shadow-emerald-900/25 border-2 border-emerald-600 flex items-center justify-between group transition-all duration-150 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition duration-150 shrink-0">
          <Camera className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 block">
              CAMERA SCANNER
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono bg-emerald-950/60 text-amber-300 px-1.5 py-0.2 rounded border border-emerald-600">
              Press [S]
            </span>
          </div>
          <span className="text-base sm:text-lg font-black tracking-tight leading-none text-white block mt-0.5">
            SCAN PRODUCT
          </span>
          <span className="text-[11px] text-emerald-200/90 font-medium mt-0.5 block">
            Point camera or enter barcode
          </span>
        </div>
      </div>

      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-950/40 group-hover:bg-amber-400 group-hover:text-emerald-950 flex items-center justify-center text-emerald-200 transition shrink-0">
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </button>
  );

  const renderSearchInput = () => (
    <div
      onClick={onOpenSearch}
      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-500 cursor-pointer transition flex items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-emerald-800 transition">
        <Search className="w-4 h-4" />
        <span className="text-xs font-medium text-slate-500 truncate">
          Search products in {supermarket.name}...
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden sm:inline-block text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
          [/]
        </span>
        <span className="text-[10px] bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
          Catalog
        </span>
      </div>
    </div>
  );

  // Quick 1-Click Scan Barcode Pills for fast web & mobile testing
  const renderQuickBarcodePills = () => {
    if (quickTestProducts.length === 0) return null;
    return (
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              Quick Add / Barcode Shelf
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            1-Click instant scan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickTestProducts.map((p) => {
            const isAdded = addedSpecialBarcode === p.barcode;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddSpecialToCart(p.barcode)}
                className={`p-2 rounded-xl border text-left transition duration-150 flex flex-col justify-between group active:scale-95 cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                    : 'bg-slate-50/70 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300'
                }`}
                title={`Click to add ${p.product_name} (${p.barcode})`}
              >
                <div>
                  <div className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                    {p.product_name}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    {p.unit || '1 pc'}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-black font-mono text-emerald-800">
                    KSh {(p.discount_price > 0 ? p.discount_price : p.selling_price).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                    {isAdded ? (
                      <Check className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLoyaltyCard = () => (
    <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/15 border border-amber-300/80 rounded-3xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-400/20 pointer-events-none" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-xs">
              <Award className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                SmartPoints Loyalty
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 font-sans">
                {tier} Member
              </span>
            </div>
          </div>

          <button
            onClick={onOpenLoyalty}
            className="text-[11px] font-extrabold text-amber-900 hover:text-emerald-800 flex items-center gap-1 group transition"
          >
            <span>Rewards &amp; Tier</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200/70 shadow-2xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Points Earned
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-mono text-emerald-950">
                {totalPoints.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-amber-600">PTS</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium block">
              = KSh {pointsValue.toLocaleString()} credit
            </span>
          </div>

          <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200/70 shadow-2xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              This Cart Will Earn
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-mono text-amber-900">
                +{cartPotentialPoints}
              </span>
              <span className="text-[10px] font-bold text-amber-600">PTS</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block">
              {cartPotentialPoints > 0
                ? 'Calculated from total'
                : 'Add items (KSh 100 = 1 pt)'}
            </span>
          </div>
        </div>

        {loyalty?.next_tier_name && (
          <div className="space-y-1 pt-1 border-t border-amber-200/60">
            <div className="flex justify-between items-center text-[10px] text-amber-950 font-semibold">
              <span>Next Tier: <strong>{loyalty.next_tier_name}</strong></span>
              <span>{loyalty.points_to_next_tier} pts needed</span>
            </div>
            <div className="w-full bg-amber-200/70 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, loyalty.tier_progress_percent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderNavGrid = () => (
    <div className="grid grid-cols-4 gap-2">
      <button
        onClick={onOpenSummary}
        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-2xs group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition mb-1">
          <FileText className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-extrabold text-slate-800 leading-tight">
          Receipt
        </span>
        <span className="text-[8px] text-slate-400 mt-0.5">Summary</span>
      </button>

      <button
        onClick={onOpenBudget}
        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-2xs group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition mb-1">
          <Wallet className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-extrabold text-slate-800 leading-tight">
          Budget
        </span>
        <span className="text-[8px] text-slate-400 mt-0.5">KSh {budget}</span>
      </button>

      <button
        onClick={onOpenLoyalty}
        className="p-2.5 bg-white hover:bg-amber-50/50 border border-amber-200/90 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-2xs group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition mb-1 relative">
          <Award className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        </div>
        <span className="text-[11px] font-extrabold text-amber-950 leading-tight">
          Loyalty
        </span>
        <span className="text-[8px] text-amber-800 font-bold mt-0.5">{totalPoints} pts</span>
      </button>

      <button
        onClick={onOpenHistory}
        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-2xs group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition mb-1">
          <History className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-extrabold text-slate-800 leading-tight">
          History
        </span>
        <span className="text-[8px] text-slate-400 mt-0.5">Visits</span>
      </button>
    </div>
  );

  // Dedicated Desktop Live Shopping Cart Panel (Sticky right column in desktop Web App mode)
  const renderDesktopLiveCartPanel = () => {
    const items = session?.items || [];
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Live Shopping Cart
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Desktop Web Workstation</span>
            </div>
          </div>

          <button
            onClick={onOpenCart}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5"
            title="Expand Full Cart Modal [C]"
          >
            <span>Full Cart [C]</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-slate-700">Your cart is currently empty</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                Press <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-mono">S</kbd> to scan a barcode or click any Quick Add item.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between gap-2 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {item.product_name_snapshot}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <span>KSh {item.effective_price.toLocaleString()}</span>
                    <span>&times;</span>
                    <span className="font-bold text-emerald-800">{item.quantity}</span>
                    <span>=</span>
                    <span className="font-bold text-slate-900">KSh {item.subtotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateCartItemQty(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateCartItemQty(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCartItem(item.id)}
                    className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center ml-1 active:scale-95 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal:</span>
            <span className="font-mono">KSh {((session?.subtotal) || estimatedTotal).toLocaleString()}</span>
          </div>
          {session && session.discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-semibold">
              <span>Discounts Applied:</span>
              <span className="font-mono">-KSh {session.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Estimated Total:
            </span>
            <span className="text-lg font-black font-mono text-emerald-900">
              KSh {estimatedTotal.toLocaleString()}
            </span>
          </div>

          {/* Finish Shopping Button */}
          <button
            type="button"
            onClick={onOpenSummary}
            disabled={itemCount === 0}
            className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 shadow-sm ${
              itemCount > 0
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Finish Shopping &amp; QR Receipt</span>
          </button>
        </div>

        {/* Desktop Keyboard Shortcuts Helper */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700 flex items-center justify-between">
            <span>Web App Keyboard Shortcuts</span>
            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Active
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-slate-600">
            <div><kbd className="bg-white border rounded px-1 text-[9px]">S</kbd> Camera Scan</div>
            <div><kbd className="bg-white border rounded px-1 text-[9px]">C</kbd> Open Cart</div>
            <div><kbd className="bg-white border rounded px-1 text-[9px]">B</kbd> Adjust Budget</div>
            <div><kbd className="bg-white border rounded px-1 text-[9px]">/</kbd> Search Catalog</div>
          </div>
        </div>
      </div>
    );
  };

  // Top Device View Mode Switcher (Visible on desktop screens >= lg)
  const renderDeviceModeSwitcher = () => (
    <div className="hidden lg:flex items-center justify-between bg-white/90 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200 shadow-2xs mb-4">
      <div className="flex items-center gap-2 text-xs text-slate-700">
        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
          Dual Experience
        </span>
        <span className="font-semibold text-slate-600">
          SmartCart is fully optimized as both a Web App and Mobile App
        </span>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setDeviceMode('responsive')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            deviceMode === 'responsive'
              ? 'bg-white text-emerald-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop Web App</span>
        </button>

        <button
          type="button"
          onClick={() => setDeviceMode('mobile_frame')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            deviceMode === 'mobile_frame'
              ? 'bg-white text-emerald-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Mobile Phone Simulator</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      <div className="max-w-6xl xl:max-w-7xl mx-auto">
        {/* Desktop View Switcher */}
        {renderDeviceModeSwitcher()}

        {/* Case 1: Desktop User chose Mobile Phone Simulator Mode */}
        {deviceMode === 'mobile_frame' ? (
          <div className="py-2">
            <div className="text-center mb-3 text-xs text-slate-500">
              Interactive Mobile App Frame (Simulating 390 &times; 844 iPhone / Android PWA experience)
            </div>
            {/* Phone Shell */}
            <div className="max-w-[410px] mx-auto bg-slate-950 p-3 rounded-[50px] shadow-2xl border-4 border-slate-800 ring-1 ring-slate-950/20">
              {/* Phone Speaker & Dynamic Island / Notch */}
              <div className="w-32 h-5 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-between px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
                <div className="w-2 h-2 rounded-full bg-blue-950 border border-blue-900" />
              </div>

              {/* Mobile Screen Container */}
              <div className="bg-slate-50 rounded-[38px] overflow-hidden max-h-[82vh] overflow-y-auto scrollbar-thin p-3.5 space-y-4">
                {/* Mobile Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 px-2 pt-0.5">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Wifi className="w-3 h-3" />
                    <span className="text-[10px] font-mono">5G</span>
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                </div>

                {renderHeroSection(true)}
                {renderAccountCard()}
                {renderSupermarketCard()}
                {renderQuickActions()}
                {renderPrimaryActionScan()}
                {renderSearchInput()}
                {renderQuickBarcodePills()}
                {renderLoyaltyCard()}
                {renderNavGrid()}
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed text-center">
                  <p className="italic">&ldquo;SmartCart provides an estimated shopping total based on the supermarket&apos;s current product database. Final prices may differ at checkout.&rdquo;</p>
                </div>

                {/* Mobile Home Bar indicator */}
                <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>
        ) : (
          /* Case 2: Responsive Mode (Mobile layout on < lg, Multi-Column Web App on >= lg) */
          <>
            {/* Top Responsive Hero Banner */}
            {renderHeroSection(false)}

            <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
              {/* Left Column (Main Workstation) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-4 max-w-xl lg:max-w-none mx-auto w-full">
                {renderAccountCard()}
                {renderSupermarketCard()}
              {renderQuickActions()}
              {renderPrimaryActionScan()}
              {renderSearchInput()}
              {renderQuickBarcodePills()}

              {/* On mobile screens (< lg), show loyalty and nav grid inline */}
              <div className="lg:hidden space-y-4">
                {renderLoyaltyCard()}
                {renderNavGrid()}
                {/* Mandatory Customer Disclaimer */}
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed text-center">
                  <p className="italic">&ldquo;SmartCart provides an estimated shopping total based on the supermarket&apos;s current product database. Final prices may differ because of promotions, weighing, price changes, unavailable stock, or checkout adjustments.&rdquo;</p>
                </div>
              </div>
            </div>

            {/* Right Column (Desktop Sticky Live Shopping Cart & Budget Sentinel) */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-4 sticky top-20">
              {renderDesktopLiveCartPanel()}
              {renderLoyaltyCard()}
              {renderNavGrid()}
            </div>
          </div>
        </>
      )}
      </div>

      {/* MODAL 1: VIEW SPECIALS & DEALS */}
      {showSpecials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-emerald-950 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-amber-300 flex items-center justify-center font-black shadow-sm">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950/20 px-2 py-0.2 rounded-full">
                      Store Offers
                    </span>
                    <span className="text-xs font-bold text-emerald-950/80">Hot Deals</span>
                  </div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                    {supermarket.name} Specials
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecials(false)}
                className="w-8 h-8 rounded-full bg-emerald-950/10 hover:bg-emerald-950/20 text-emerald-950 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
              {loadingSpecials ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium">Checking live supermarket discounts...</p>
                </div>
              ) : specialsProducts.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <Tag className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No active specials right now</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    All store items are priced at regular rates. Check back soon for weekly promotions!
                  </p>
                </div>
              ) : (
                specialsProducts.map((p) => {
                  const hasDiscount = p.discount_price > 0 && p.discount_price < p.selling_price;
                  const discountPct = hasDiscount
                    ? Math.round(((p.selling_price - p.discount_price) / p.selling_price) * 100)
                    : 0;
                  const isAdded = addedSpecialBarcode === p.barcode;

                  return (
                    <div key={p.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {p.product_name}
                          </span>
                          {hasDiscount && (
                            <span className="text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-rose-600" />
                              <span>{discountPct}% OFF</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.brand && <span>{p.brand} &bull; </span>}
                          <span>{p.unit}</span>
                          <span className="text-slate-400 font-mono text-[10px] ml-1">({p.barcode})</span>
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-sm font-black font-mono text-emerald-800">
                            KSh {(hasDiscount ? p.discount_price : p.selling_price).toLocaleString()}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] font-mono text-slate-400 line-through">
                              KSh {p.selling_price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSpecialToCart(p.barcode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                          isAdded
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-amber-400 hover:bg-amber-300 text-emerald-950 active:scale-95'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">Prices synced with store database</span>
              <button
                type="button"
                onClick={() => setShowSpecials(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHOPPING TIPS */}
      {showTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-sm">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-amber-300 px-2 py-0.2 rounded-full">
                    Self-Checkout Guide
                  </span>
                  <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                    Smart Shopping Tips
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTips(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {[
                {
                  icon: <Camera className="w-4 h-4 text-emerald-700" />,
                  title: '1. Clear Barcode Scanning',
                  desc: 'Hold your camera 15-20cm away from the barcode under good aisle lighting. You will hear an audible confirmation chime when registered.',
                },
                {
                  icon: <Wallet className="w-4 h-4 text-amber-600" />,
                  title: '2. Live Budget Sentinel',
                  desc: 'Set your trip budget at the start of your shop. The top bar turns amber at 90% and red with a pulse if you exceed it.',
                },
                {
                  icon: <Award className="w-4 h-4 text-purple-600" />,
                  title: '3. Earn Loyalty SmartPoints',
                  desc: 'Every KSh 100 spent automatically accrues 1 SmartPoint. Accumulate points to climb from Bronze to Silver, Gold, and Platinum tiers.',
                },
                {
                  icon: <Search className="w-4 h-4 text-blue-600" />,
                  title: '4. Hard-to-Scan or Produce Items',
                  desc: 'If a barcode is scuffed, torn, or on produce, tap "Catalog" to search by name or enter the barcode number manually.',
                },
                {
                  icon: <FileText className="w-4 h-4 text-teal-600" />,
                  title: '5. Fast Exit Verification',
                  desc: 'When finished, tap "Finish Shopping" to generate your authenticated QR receipt for instant cashier verification.',
                },
              ].map((tip, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {tip.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{tip.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      {tip.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">SmartCart Customer Guidance</span>
              <button
                type="button"
                onClick={() => setShowTips(false)}
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STORE SUPPORT & ASSISTANCE */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white text-blue-800 flex items-center justify-center font-black shadow-sm">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/40 text-blue-200 px-2 py-0.2 rounded-full">
                    Aisle Assistance
                  </span>
                  <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                    Store Support &amp; Attendant
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupport(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Call Store Attendant Section */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-700" />
                  <h4 className="font-black text-blue-950 text-xs">Call a Floor Attendant</h4>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Need help weighing produce, finding an item, or verifying an age-restricted item?
                </p>

                {attendantRequested ? (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div>Attendant notified!</div>
                      <div className="text-[10px] font-normal text-emerald-800">
                        A staff member from {supermarket.name} is on the way to {selectedAisle}.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">
                      Select your current aisle:
                    </label>
                    <select
                      value={selectedAisle}
                      onChange={(e) => setSelectedAisle(e.target.value)}
                      className="w-full p-2 bg-white rounded-xl border border-blue-200 text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option>Aisle 1 - Fresh Produce &amp; Fruits</option>
                      <option>Aisle 2 - Bakery &amp; Breakfast Cereals</option>
                      <option>Aisle 3 - Dairy, Milk &amp; Eggs</option>
                      <option>Aisle 4 - Flours, Grains &amp; Sugar</option>
                      <option>Aisle 5 - Beverages, Sodas &amp; Water</option>
                      <option>Aisle 6 - Toiletries &amp; Home Cleaners</option>
                      <option>Checkout Lane / Self-Checkout Terminal</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setAttendantRequested(true)}
                      className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Call Attendant to My Aisle</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct System Admin Help Center Channel */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white space-y-2.5 shadow-sm border border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                      <LifeBuoy className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-white block">System Admin Help Line</span>
                      <span className="text-[10px] text-emerald-300 font-medium">Hiram Mark Karanja</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                    Direct Line
                  </span>
                </div>

                <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-800/80 space-y-1 text-[11px] font-mono text-emerald-200">
                  <div className="flex items-center justify-between">
                    <span>Email:</span>
                    <a href="mailto:hirammarkkaranja@gmail.com" className="text-amber-300 hover:underline font-bold">
                      hirammarkkaranja@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Phone:</span>
                    <a href="tel:+254115868897" className="text-amber-300 hover:underline font-bold">
                      +254115868897
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href="tel:+254115868897"
                    className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 border border-emerald-600"
                  >
                    <Phone className="w-3 h-3 text-amber-300" />
                    <span>Call Admin</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupport(false);
                      setShowHelpCenter(true);
                    }}
                    className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Message Admin</span>
                  </button>
                </div>
              </div>

              {/* Direct Supermarket Contacts */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 text-xs">Supermarket Contact Information</h4>
                <div className="grid grid-cols-1 gap-2 pt-1 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Store: <strong className="text-slate-900">{supermarket.name} ({supermarket.supermarket_code})</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Location: <strong className="text-slate-900">{supermarket.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Phone: <a href={`tel:${supermarket.phone}`} className="font-bold text-emerald-700 underline">{supermarket.phone}</a></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Email: <a href={`mailto:${supermarket.email}`} className="font-bold text-blue-700 underline">{supermarket.email}</a></span>
                  </div>
                </div>
              </div>

              {/* Interactive FAQs Accordion */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs">Frequently Asked Questions</h4>
                {[
                  {
                    q: 'How do I remove or adjust quantities in my cart?',
                    a: 'Open your Cart by clicking the Cart button at the top right or on the desktop workstation panel. Use the (+) and (-) controls to adjust the quantity, or the trash icon to remove an item.',
                  },
                  {
                    q: 'What if a barcode is damaged or will not scan?',
                    a: 'Switch to "Manual Barcode Entry" inside the scanner camera, or tap "Catalog" on the dashboard to search for the product by name.',
                  },
                  {
                    q: 'How does payment work at checkout?',
                    a: 'When you are done shopping, tap "Finish Shopping". A verified QR receipt is generated for the cashier or self-checkout terminal to scan and accept M-PESA or Card.',
                  },
                  {
                    q: 'How do I redeem my accumulated SmartPoints?',
                    a: 'Your SmartPoints are tracked automatically with your email account. Point discounts can be applied directly towards your total at checkout.',
                  },
                ].map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/60"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-2.5 text-left font-bold text-slate-900 text-xs flex items-center justify-between gap-2 hover:bg-slate-100/60 transition"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-2.5 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/60 bg-white">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">SmartCart Customer Care</span>
              <button
                type="button"
                onClick={() => setShowSupport(false)}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer to System Admin Help Center Modal */}
      {currentUser && (
        <CustomerHelpCenterModal
          isOpen={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
          currentUser={currentUser}
          currentSupermarket={supermarket}
        />
      )}
    </div>
  );
};
