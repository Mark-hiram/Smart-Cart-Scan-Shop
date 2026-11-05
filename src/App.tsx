import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CustomerDashboard } from './components/CustomerDashboard.tsx';
import { CustomerLandingPage } from './components/CustomerLandingPage.tsx';
import { SupermarketSelectorModal } from './components/SupermarketSelectorModal.tsx';
import { BarcodeScannerModal } from './components/BarcodeScannerModal.tsx';
import { CartModal } from './components/CartModal.tsx';
import { BudgetModal } from './components/BudgetModal.tsx';
import { ReceiptSummaryModal } from './components/ReceiptSummaryModal.tsx';
import { ProductSearchModal } from './components/ProductSearchModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { LoyaltyModal } from './components/LoyaltyModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { SystemAdminPortal } from './components/SystemAdminPortal.tsx';
import { StoreAdminSignIn } from './components/StoreAdminSignIn.tsx';
import { SystemAdminSignIn } from './components/SystemAdminSignIn.tsx';
import { CustomerAccountModal } from './components/CustomerAccountModal.tsx';
import { CustomerHelpCenterModal } from './components/CustomerHelpCenterModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { AdminLoginPage } from './components/AdminLoginPage.tsx';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute.tsx';
import { AdminDashboardPage } from './components/AdminDashboardPage.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { api } from './api.ts';
import { Supermarket, User, ShoppingSession, CustomerLoyalty } from './types.ts';
import { playScanBeep } from './utils/audio.ts';

const GUEST_CUSTOMER: User = {
  id: 'usr_guest',
  email: 'guest@smartcart.co.ke',
  name: 'Shopper',
  role: 'CUSTOMER',
  created_at: '2026-01-01T08:00:00Z',
};

// Route Table Definition for clean, declarative routing
interface RouteDef {
  path: string;
  exact?: boolean;
  protectedAdmin?: boolean;
  component: React.ComponentType<any>;
}

const routesTable: RouteDef[] = [
  { path: '/admin/login', exact: true, component: AdminLoginPage },
  { path: '/admin', exact: true, protectedAdmin: true, component: AdminDashboardPage },
  { path: '/admin/dashboard', exact: false, protectedAdmin: true, component: AdminDashboardPage },
  { path: '/', exact: true, component: MainAppRoot },
];

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') || '/' : '/';

  // 1. Check matching route from routes table
  const matchedRoute = routesTable.find((r) => {
    if (r.exact) {
      return pathname === r.path;
    }
    return pathname.startsWith(r.path);
  });

  // If unknown route, return clean 404 page with "Back to home" button
  if (!matchedRoute) {
    return <NotFoundPage />;
  }

  // Admin protected routes wrapped in ProtectedAdminRoute
  if (matchedRoute.protectedAdmin) {
    const Component = matchedRoute.component;
    return (
      <ProtectedAdminRoute>
        <Component />
      </ProtectedAdminRoute>
    );
  }

  // Admin login page or other unauthenticated standalone route
  if (matchedRoute.path === '/admin/login') {
    const Component = matchedRoute.component;
    return <Component />;
  }

  // Main customer & store application root
  return <MainAppRoot />;
}

/**
 * Main Application View with Unified Layout (Navbar, Active View, Unified Footer)
 */
function MainAppRoot() {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('smartcart_active_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return GUEST_CUSTOMER;
  });

  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [currentSupermarket, setCurrentSupermarket] = useState<Supermarket | null>(null);
  const [session, setSession] = useState<ShoppingSession | null>(null);
  const [currentView, setCurrentView] = useState<'customer' | 'admin' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('smartcart_active_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'SYSTEM_ADMIN') return 'system';
        if (u.role === 'SUPERMARKET_ADMIN') return 'admin';
      }
    } catch {
      // ignore
    }
    return 'customer';
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState<'profile' | 'signin' | 'register' | 'forgot'>('profile');
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);

  const handleOpenAccount = (mode: 'profile' | 'signin' | 'register' | 'forgot' = 'profile') => {
    setAccountModalMode(mode);
    setIsAccountOpen(true);
  };

  const handleUserLogin = (user: User) => {
    try {
      localStorage.setItem('smartcart_active_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    setCurrentUser(user);
    if (user.role === 'SYSTEM_ADMIN') {
      setCurrentView('system');
    } else if (user.role === 'SUPERMARKET_ADMIN') {
      setCurrentView('admin');
      if (user.supermarket_id) {
        const sm = supermarkets.find((s) => s.id === user.supermarket_id);
        if (sm) setCurrentSupermarket(sm);
      }
    } else {
      setCurrentView('customer');
      if (currentSupermarket) {
        initSession(user.id, currentSupermarket.id, user.name);
      }
      loadCustomerLoyalty(user.id);
    }
  };

  // Initial startup
  useEffect(() => {
    loadSupermarkets();
    loadCustomerLoyalty(currentUser.id);
  }, []);

const DEFAULT_GUEST_LOYALTY: CustomerLoyalty = {
  total_points: 0,
  points_value_ksh: 0,
  total_spent: 0,
  completed_sessions_count: 0,
  tier: 'Bronze',
  tier_progress_percent: 0,
  next_tier_name: 'Silver',
  points_to_next_tier: 500,
  next_tier_threshold: 500,
  history: [],
};

  const loadCustomerLoyalty = async (customerId: string) => {
    if (!customerId || customerId === 'usr_guest') {
      setLoyalty(DEFAULT_GUEST_LOYALTY);
      return;
    }
    try {
      const res = await api.getCustomerLoyalty(customerId);
      if (res.success) {
        setLoyalty(res.loyalty);
      }
    } catch {
      // If session expired or unauthorized, fallback to default loyalty
      setLoyalty(DEFAULT_GUEST_LOYALTY);
    }
  };

  const loadSupermarkets = async () => {
    try {
      const res = await api.getSupermarkets();
      if (res.success && res.supermarkets.length > 0) {
        setSupermarkets(res.supermarkets);
        if (!currentSupermarket || !res.supermarkets.some((s) => s.id === currentSupermarket.id)) {
          const defaultSm = res.supermarkets[0];
          setCurrentSupermarket(defaultSm);
          if (currentUser.role === 'CUSTOMER') {
            initSession(currentUser.id, defaultSm.id, currentUser.name);
          }
        } else {
          const updated = res.supermarkets.find((s) => s.id === currentSupermarket.id);
          if (updated) setCurrentSupermarket(updated);
        }
      } else {
        setSupermarkets([]);
        setCurrentSupermarket(null);
        setSession(null);
      }
    } catch (e) {
      console.error('Failed to load supermarkets:', e);
    } finally {
      setLoading(false);
    }
  };

  const initSession = async (customerId: string, supermarketId: string, customerName: string) => {
    try {
      const res = await api.createSession({
        customer_id: customerId,
        supermarket_id: supermarketId,
        customer_name: customerName,
      });
      if (res.success) {
        setSession(res.session);
      }
    } catch (e) {
      console.error('Failed to init session:', e);
    }
  };

  const handleSelectSupermarket = (sm: Supermarket) => {
    setCurrentSupermarket(sm);
    initSession(currentUser.id, sm.id, currentUser.name);
  };

  // Cart actions with server-side authoritative pricing
  const handleItemAdded = async (barcode: string, quantity: number) => {
    if (!session) return;
    const res = await api.addToCart(session.id, barcode, quantity);
    if (res.success) {
      setSession(res.session);
    }
  };

  const handleUpdateCartItem = async (itemId: string, newQty: number) => {
    if (!session) return;
    try {
      const res = await api.updateCartItem(session.id, itemId, newQty);
      if (res.success) {
        setSession(res.session);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    if (!session) return;
    try {
      const res = await api.removeCartItem(session.id, itemId);
      if (res.success) {
        setSession(res.session);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove item');
    }
  };

  const handleSaveBudget = (budgetAmount: number) => {
    if (!session) return;
    setSession({
      ...session,
      budget: budgetAmount,
    });
  };

  const handleFinishShopping = async () => {
    if (!session) return;
    try {
      const res = await api.completeSession(session.id);
      if (res.success) {
        setSession(res.session);
        await loadCustomerLoyalty(currentUser.id);
        if (currentSupermarket) {
          setTimeout(() => {
            initSession(currentUser.id, currentSupermarket.id, currentUser.name);
          }, 1500);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete session');
    }
  };

  const handleQuickScanBarcode = async (barcode: string) => {
    if (!session || !currentSupermarket) return;
    try {
      const lookup = await api.lookupBarcode(currentSupermarket.id, barcode);
      if (lookup.success && lookup.product) {
        playScanBeep(true);
        await handleItemAdded(barcode, 1);
        setIsCartOpen(true);
      }
    } catch (err: any) {
      playScanBeep(false);
      alert(err.message || 'Product not found in this store.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('smartcart_active_user');
    setCurrentUser(GUEST_CUSTOMER);
    setCurrentView('customer');
    if (currentSupermarket) {
      initSession(GUEST_CUSTOMER.id, currentSupermarket.id, GUEST_CUSTOMER.name);
    } else {
      setSession(null);
    }
    loadCustomerLoyalty(GUEST_CUSTOMER.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans']">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter blur-xs"
          style={{ backgroundImage: "url('/supermarket_hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-emerald-950/80 to-slate-950 pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 max-w-sm mx-auto p-6 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-emerald-800/50 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 font-black flex items-center justify-center mx-auto animate-bounce text-xl shadow-lg shadow-amber-400/20">
            SC
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">SmartCart Scan &amp; Shop</h2>
          <p className="text-xs text-emerald-200/80 font-medium">Connecting to retail supermarket servers...</p>
        </div>
      </div>
    );
  }

  const currentBgImage =
    currentView === 'system'
      ? '/system_admin_hero.jpg'
      : currentView === 'admin'
      ? '/store_admin_hero.jpg'
      : '/supermarket_hero.jpg';

  return (
    <div className="min-h-screen flex flex-col font-['Plus_Jakarta_Sans'] text-slate-900 antialiased relative">
      {/* Background Wallpaper */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url('${currentBgImage}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/92 via-slate-950/90 to-emerald-950/94 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Shared Layout Top Navigation */}
        <Navbar
          currentUser={currentUser}
          currentSupermarket={currentSupermarket}
          itemCount={session?.items.reduce((acc, it) => acc + it.quantity, 0) || 0}
          estimatedTotal={session?.estimated_total || 0}
          onOpenSupermarketSelector={() => setIsSelectorOpen(true)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAccount={handleOpenAccount}
          onSignOut={handleSignOut}
          currentView={currentView}
          onNavigateView={(view) => setCurrentView(view)}
          onOpenHelpCenter={() => setIsHelpCenterOpen(true)}
        />

        {/* Shared Layout Main Content View */}
        <main className="flex-1 pb-16">
          {currentView === 'customer' && (
            currentSupermarket ? (
              <CustomerDashboard
                currentUser={currentUser}
                supermarket={currentSupermarket}
                session={session}
                loyalty={loyalty}
                onOpenAccount={handleOpenAccount}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenBudget={() => setIsBudgetOpen(true)}
                onOpenSummary={() => setIsSummaryOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenLoyalty={() => setIsLoyaltyOpen(true)}
                onOpenStoreSelector={() => setIsSelectorOpen(true)}
                onQuickScanBarcode={handleQuickScanBarcode}
                onUpdateCartItemQty={handleUpdateCartItem}
                onRemoveCartItem={handleRemoveCartItem}
                onSignOut={handleSignOut}
              />
            ) : (
              /* Redesigned Customer Landing Page when no store selected (Zero Admin mentions) */
              <CustomerLandingPage
                currentUser={currentUser}
                supermarkets={supermarkets}
                currentSupermarket={currentSupermarket}
                session={session}
                loyalty={loyalty}
                onSelectSupermarket={handleSelectSupermarket}
                onOpenStoreSelector={() => setIsSelectorOpen(true)}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenBudget={() => setIsBudgetOpen(true)}
                onOpenSummary={() => setIsSummaryOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenLoyalty={() => setIsLoyaltyOpen(true)}
                onOpenAccount={handleOpenAccount}
                onOpenHelpCenter={() => setIsHelpCenterOpen(true)}
              />
            )
          )}

          {currentView === 'admin' && (
            currentUser.role === 'SUPERMARKET_ADMIN' || currentUser.role === 'SYSTEM_ADMIN' ? (
              currentSupermarket ? (
                <AdminPortal
                  currentSupermarket={currentSupermarket}
                  onRefreshSupermarkets={loadSupermarkets}
                  onSignOut={handleSignOut}
                />
              ) : (
                <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4 bg-slate-900/90 rounded-3xl border border-emerald-800/60 p-8 text-white mt-8">
                  <h2 className="text-xl font-black text-white">No Supermarket Selected</h2>
                  <p className="text-sm text-emerald-200/80">
                    Please select or register a supermarket to access the store management dashboard.
                  </p>
                  <button
                    onClick={() => setCurrentView('system')}
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition cursor-pointer"
                  >
                    Open System Admin Portal
                  </button>
                </div>
              )
            ) : (
              <StoreAdminSignIn
                supermarkets={supermarkets}
                selectedSupermarket={currentSupermarket}
                onSuccess={(user, sm) => {
                  localStorage.setItem('smartcart_active_user', JSON.stringify(user));
                  setCurrentUser(user);
                  setCurrentSupermarket(sm);
                  setCurrentView('admin');
                }}
                onSwitchToSystemAdmin={() => setCurrentView('system')}
                onBackToCustomer={() => setCurrentView('customer')}
              />
            )
          )}

          {currentView === 'system' && (
            currentUser.role === 'SYSTEM_ADMIN' ? (
              <SystemAdminPortal
                supermarkets={supermarkets}
                onRefreshSupermarkets={loadSupermarkets}
                onSelectSupermarket={(sm) => {
                  handleSelectSupermarket(sm);
                  setCurrentView('admin');
                }}
                onSignOut={handleSignOut}
              />
            ) : (
              <SystemAdminSignIn
                onSuccess={(user: User) => {
                  localStorage.setItem('smartcart_active_user', JSON.stringify(user));
                  setCurrentUser(user);
                }}
                onSwitchToStoreAdmin={() => setCurrentView('admin')}
                onBackToCustomer={() => setCurrentView('customer')}
              />
            )
          )}
        </main>

        {/* Modals */}
        <SupermarketSelectorModal
          isOpen={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          supermarkets={supermarkets}
          currentSupermarket={currentSupermarket}
          onSelectSupermarket={handleSelectSupermarket}
        />

        {currentSupermarket && session && (
          <BarcodeScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            supermarket={currentSupermarket}
            sessionId={session.id}
            onItemAdded={handleItemAdded}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          session={session}
          supermarket={currentSupermarket}
          onUpdateQuantity={handleUpdateCartItem}
          onRemoveItem={handleRemoveCartItem}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenSummary={() => setIsSummaryOpen(true)}
          onOpenBudget={() => setIsBudgetOpen(true)}
        />

        {session && (
          <BudgetModal
            isOpen={isBudgetOpen}
            onClose={() => setIsBudgetOpen(false)}
            currentBudget={session.budget || 2000}
            currentTotal={session.estimated_total}
            onSaveBudget={handleSaveBudget}
          />
        )}

        <ReceiptSummaryModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          session={session}
          supermarket={currentSupermarket}
          onFinishShopping={handleFinishShopping}
          customerEmail={currentUser.email}
        />

        {currentSupermarket && (
          <ProductSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            supermarket={currentSupermarket}
            onAddToCart={handleItemAdded}
          />
        )}

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          customerId={currentUser.id}
          onViewSessionDetails={(historicalSession) => {
            setSession(historicalSession);
            setIsSummaryOpen(true);
          }}
        />

        <LoyaltyModal
          isOpen={isLoyaltyOpen}
          onClose={() => setIsLoyaltyOpen(false)}
          loyalty={loyalty}
          customerName={currentUser.name}
        />

        <CustomerAccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          currentUser={currentUser}
          initialMode={accountModalMode}
          onUserChanged={handleUserLogin}
          currentSupermarket={currentSupermarket}
          loyalty={loyalty}
          onRefreshLoyalty={loadCustomerLoyalty}
          onSignOut={handleSignOut}
          onOpenHelpCenter={() => setIsHelpCenterOpen(true)}
        />

        <CustomerHelpCenterModal
          isOpen={isHelpCenterOpen}
          onClose={() => setIsHelpCenterOpen(false)}
          currentUser={currentUser}
          currentSupermarket={currentSupermarket}
        />

        {/* Unified Application Footer Rendered Exactly Once Per Page */}
        <Footer
          onOpenHelp={() => setIsHelpCenterOpen(true)}
          onStaffLogin={() => {
            window.location.href = '/admin/login';
          }}
        />

        {/* PWA Offline Connectivity Indicator */}
        <OfflineIndicator />
      </div>
    </div>
  );
}
