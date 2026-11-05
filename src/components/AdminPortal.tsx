import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  FileSpreadsheet,
  QrCode,
  Users,
  Settings,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpRight,
  Eye,
  EyeOff,
  Printer,
  SlidersHorizontal,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  UserPlus,
  Sparkles,
  Copy,
  Activity,
  Check,
  UserCheck,
  ExternalLink,
  Palette,
  LogOut,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../api.ts';
import {
  Supermarket,
  Product,
  AdminDashboardStats,
  ShoppingSession,
  StoreStaffAccount,
} from '../types.ts';

interface AdminPortalProps {
  currentSupermarket: Supermarket;
  onRefreshSupermarkets: () => void;
  onSignOut?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentSupermarket,
  onRefreshSupermarkets,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'usage' | 'team' | 'import' | 'qr' | 'settings'
  >('overview');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Staff accounts state (Store admin can create up to 3 sub-accounts)
  const [staffList, setStaffList] = useState<StoreStaffAccount[]>([]);
  const [staffSlotsUsed, setStaffSlotsUsed] = useState(0);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalError, setStaffModalError] = useState('');
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null);
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    username: '',
    email: '',
    password: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
    staff_title: 'Assistant Manager',
    permissions: ['manage_inventory', 'view_sessions'],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  // Add / Edit Product Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    barcode: '',
    product_name: '',
    brand: '',
    category: 'Food & Groceries',
    description: '',
    unit: 'piece',
    selling_price: '',
    discount_price: '0',
    stock_quantity: '50',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [productModalError, setProductModalError] = useState('');

  // Low-Inventory Threshold state (< 10 by default, configurable by store admin)
  const [inventoryThreshold, setInventoryThreshold] = useState<number>(10);
  const [onlyShowLowStock, setOnlyShowLowStock] = useState<boolean>(false);

  /**
   * Evaluates inventory level against threshold and returns distinct styling,
   * alert labels, and warning icon.
   */
  const getInventoryAlert = (stockQuantity: number, threshold: number = 10) => {
    if (stockQuantity <= 0) {
      return {
        isLow: true,
        isOutOfStock: true,
        severity: 'critical' as const,
        label: 'Out of Stock (0 units)',
        rowBgClass: 'bg-rose-50/70 border-l-4 border-l-rose-500 hover:bg-rose-100/60',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
        textClass: 'text-rose-700 font-black',
        icon: <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />,
      };
    }
    if (stockQuantity < threshold) {
      return {
        isLow: true,
        isOutOfStock: false,
        severity: 'warning' as const,
        label: `Low Stock (${stockQuantity} < ${threshold})`,
        rowBgClass: 'bg-amber-50/85 border-l-4 border-l-amber-500 hover:bg-amber-100/80',
        badgeClass: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold',
        textClass: 'text-amber-700 font-black',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
      };
    }
    return {
      isLow: false,
      isOutOfStock: false,
      severity: 'normal' as const,
      label: 'Adequate Stock',
      rowBgClass: 'hover:bg-slate-50/80',
      badgeClass: 'bg-slate-100 text-slate-700',
      textClass: 'text-slate-800 font-bold',
      icon: null,
    };
  };

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  // Store Settings & Appearance state
  const [settingsForm, setSettingsForm] = useState({
    name: currentSupermarket.name,
    branch: currentSupermarket.branch || '',
    location: currentSupermarket.location,
    phone: currentSupermarket.phone,
    email: currentSupermarket.email,
    low_stock_threshold: currentSupermarket.low_stock_threshold.toString(),
    bg_color: currentSupermarket.bg_color || '#f8fafc',
    bg_gradient: currentSupermarket.bg_gradient || '',
    theme_color: currentSupermarket.theme_color || '#064e3b',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Sync settings when currentSupermarket updates
  useEffect(() => {
    setSettingsForm({
      name: currentSupermarket.name,
      branch: currentSupermarket.branch || '',
      location: currentSupermarket.location,
      phone: currentSupermarket.phone,
      email: currentSupermarket.email,
      low_stock_threshold: currentSupermarket.low_stock_threshold.toString(),
      bg_color: currentSupermarket.bg_color || '#f8fafc',
      bg_gradient: currentSupermarket.bg_gradient || '',
      theme_color: currentSupermarket.theme_color || '#064e3b',
    });
  }, [currentSupermarket]);

  // Load dashboard data
  useEffect(() => {
    loadDashboard();
    generateStoreQr();
  }, [currentSupermarket.id]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, prodsRes, sessRes, staffRes] = await Promise.all([
        api.getAdminDashboard(currentSupermarket.id),
        api.getAdminProducts(currentSupermarket.id),
        api.getAdminSessions(currentSupermarket.id),
        api.getStoreStaff(currentSupermarket.id),
      ]);
      if (dashRes.success) setStats(dashRes.stats);
      if (prodsRes.success) setProducts(prodsRes.products);
      if (sessRes.success) setSessions(sessRes.sessions);
      if (staffRes.success) {
        setStaffList(staffRes.staff);
        setStaffSlotsUsed(staffRes.slotsUsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddStaff = () => {
    setStaffModalError('');
    setStaffForm({
      name: '',
      username: '',
      email: '',
      password: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      staff_title: 'Assistant Manager',
      permissions: ['manage_inventory', 'view_sessions'],
      status: 'ACTIVE',
    });
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffModalError('');

    if (!staffForm.name.trim()) {
      setStaffModalError('Staff full name is required.');
      return;
    }
    if (!staffForm.username.trim()) {
      setStaffModalError('Login username is required.');
      return;
    }
    if (!staffForm.password.trim()) {
      setStaffModalError('Password is required.');
      return;
    }

    try {
      await api.createStoreStaff(currentSupermarket.id, {
        name: staffForm.name.trim(),
        username: staffForm.username.trim().toLowerCase(),
        email: staffForm.email.trim() || `${staffForm.username.trim().toLowerCase()}@${currentSupermarket.supermarket_code.toLowerCase()}.co.ke`,
        password: staffForm.password.trim(),
        staff_title: staffForm.staff_title,
        permissions: staffForm.permissions,
      });
      setShowStaffModal(false);
      loadDashboard();
    } catch (err: any) {
      setStaffModalError(err.message || 'Failed to create staff account.');
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateStoreStaff(currentSupermarket.id, staffId, { status: nextStatus });
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff status.');
    }
  };

  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove staff account for "${name}"? This will free up 1 staff login slot.`)) {
      return;
    }
    try {
      await api.deleteStoreStaff(currentSupermarket.id, staffId);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff account.');
    }
  };

  const handleCopyStaffCredentials = (stf: StoreStaffAccount) => {
    const text = `SmartCart Store Staff Credentials\nSupermarket: ${currentSupermarket.name} (${currentSupermarket.supermarket_code})\nStaff Name: ${stf.name} (${stf.staff_title})\nLogin Username: ${stf.username}\nStaff Password: ${stf.password}\nStore Code: ${currentSupermarket.supermarket_code}`;
    navigator.clipboard.writeText(text);
    setCopiedStaffId(stf.id);
    setTimeout(() => setCopiedStaffId(null), 2000);
  };

  const generateStoreQr = async () => {
    try {
      // Encode supermarket connect payload
      const qrPayload = JSON.stringify({
        app: 'smartcart',
        supermarket_id: currentSupermarket.id,
        supermarket_code: currentSupermarket.supermarket_code,
        name: currentSupermarket.name,
      });
      const url = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Open modal to add product
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductForm({
      barcode: '',
      product_name: '',
      brand: '',
      category: 'Food & Groceries',
      description: '',
      unit: 'piece',
      selling_price: '',
      discount_price: '0',
      stock_quantity: '50',
      status: 'ACTIVE',
    });
    setProductModalError('');
    setShowProductModal(true);
  };

  // Open modal to edit product
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      barcode: p.barcode,
      product_name: p.product_name,
      brand: p.brand,
      category: p.category,
      description: p.description || '',
      unit: p.unit,
      selling_price: p.selling_price.toString(),
      discount_price: p.discount_price ? p.discount_price.toString() : '0',
      stock_quantity: p.stock_quantity.toString(),
      status: p.status,
    });
    setProductModalError('');
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductModalError('');
    try {
      if (editingProduct) {
        await api.updateProduct(currentSupermarket.id, editingProduct.id, {
          barcode: productForm.barcode,
          product_name: productForm.product_name,
          brand: productForm.brand,
          category: productForm.category,
          description: productForm.description,
          unit: productForm.unit,
          selling_price: parseFloat(productForm.selling_price),
          discount_price: parseFloat(productForm.discount_price),
          stock_quantity: parseInt(productForm.stock_quantity, 10),
          status: productForm.status,
        });
      } else {
        await api.createProduct(currentSupermarket.id, {
          barcode: productForm.barcode,
          product_name: productForm.product_name,
          brand: productForm.brand,
          category: productForm.category,
          description: productForm.description,
          unit: productForm.unit,
          selling_price: parseFloat(productForm.selling_price),
          discount_price: parseFloat(productForm.discount_price),
          stock_quantity: parseInt(productForm.stock_quantity, 10),
          status: productForm.status,
        });
      }
      setShowProductModal(false);
      loadDashboard();
    } catch (err: any) {
      setProductModalError(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from ${currentSupermarket.name}?`)) {
      return;
    }
    try {
      await api.deleteProduct(currentSupermarket.id, productId);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // CSV Import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleProcessCsv = async (actionType: 'create_only' | 'upsert') => {
    if (!csvText.trim()) {
      alert('Please select or paste CSV data first.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.importProductsCSV(currentSupermarket.id, csvText, actionType);
      setImportResult(res);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'CSV Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = `barcode,product_name,brand,category,unit,selling_price,discount_price,stock_quantity,description
6161234567890,White Bread,ABC,Bakery,500g,80,0,150,Freshly baked sliced soft white bread
6161234567891,Fresh Milk,ABC,Dairy,500ml,70,0,200,Pasteurized homogenized whole milk
6161234567892,Sugar,ABC,Food & Groceries,1kg,160,150,100,Refined sweet white crystal sugar
6161234567893,Rice,ABC,Food & Groceries,2kg,320,0,95,Fragrant premium grade pishori rice
6161234567894,Cooking Oil,ABC,Food & Groceries,1L,250,240,80,Fortified vegetable cooking oil
6161234567895,Bath Soap,ABC,Personal Care,125g,120,0,110,Moisturizing beauty cleansing soap
6161234567896,Soda,ABC,Beverages,500ml,70,0,180,Refreshing carbonated soft drink`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartCart_Products_Template_${currentSupermarket.supermarket_code}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSupermarket(currentSupermarket.id, {
        name: settingsForm.name,
        branch: settingsForm.branch,
        location: settingsForm.location,
        phone: settingsForm.phone,
        email: settingsForm.email,
        low_stock_threshold: parseInt(settingsForm.low_stock_threshold, 10),
        bg_color: settingsForm.bg_color,
        bg_gradient: settingsForm.bg_gradient,
        theme_color: settingsForm.theme_color,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      onRefreshSupermarkets();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const lowInventoryProductsCount = products.filter((p) => p.stock_quantity < inventoryThreshold).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.barcode.includes(searchFilter) ||
      p.brand.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.category.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;
    if (onlyShowLowStock) {
      return p.stock_quantity < inventoryThreshold;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Supermarket Admin Store Banner */}
      <div className="relative overflow-hidden text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-700/60 bg-emerald-950">
        {/* Background Supermarket Store Interior Image */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/store_admin_hero.jpg"
            alt="Store inventory aisles"
            className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.1] scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/90 to-emerald-950/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-mono">
                  {currentSupermarket.supermarket_code}
                </span>
                <span className="text-xs text-emerald-200 font-medium">Store Admin Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentSupermarket.name}</h1>
              <p className="text-xs text-emerald-200/80 mt-0.5">{currentSupermarket.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboard}
              className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-xs font-semibold text-emerald-200 hover:text-white transition flex items-center gap-1.5 border border-emerald-700/80 backdrop-blur-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Product
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 border border-rose-500 cursor-pointer active:scale-95"
                title="Log Out of Store Admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Tenant Security & Customer Isolation Notice */}
        <div className="relative z-10 mt-4 pt-3 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-200/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Tenant Isolation: Access restricted exclusively to <strong>{currentSupermarket.name}</strong>. Cross-supermarket data &amp; customer dashboard editing are restricted.</span>
          </div>
          <span className="text-[10px] font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/80 text-emerald-300 font-mono">
            Tenant: {currentSupermarket.supermarket_code}
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-emerald-800/40 text-xs font-bold scrollbar-none shadow-md">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'usage'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Shopper Scans &amp; Usage ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'team'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Store Team ({staffList.length}/3 Logins)
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          CSV Import
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'qr'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          Store QR Code
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-3 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-600" />
          Store Profile &amp; Background Theme
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW & STATS */}
      {/* ============================================================ */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Products
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {stats.totalProducts}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                {stats.activeProducts} Active in Catalog
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Low Stock Alerts
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {stats.lowStockCount}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                Threshold: &le; {currentSupermarket.low_stock_threshold} units
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Out of Stock
              </span>
              <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                {stats.outOfStockCount}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                0 items remaining
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Shoppers
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {stats.activeShoppersCount}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                In-store carts active
              </span>
            </div>
          </div>

          {/* Quick Barcode Testing Banner for Store Admin */}
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl space-y-2">
            <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-700" />
              Independent Supermarket Pricing Active
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Every barcode scanned by a shopper in <strong>{currentSupermarket.name}</strong> directly checks this store's product database.
              If you change prices here, customer scanners instantly reflect the new price.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PRODUCT INVENTORY TABLE */}
      {/* ============================================================ */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Threshold & Quick Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Inventory Alert Threshold Control */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700">
                  Alert Threshold: &lt;
                </span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={inventoryThreshold}
                  onChange={(e) => setInventoryThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  title="Products with inventory below this quantity will be visually highlighted with warning icons"
                />
                <span className="text-[11px] text-slate-500">units</span>
                <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-200">
                  {[5, 10, 15, 20].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInventoryThreshold(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                        inventoryThreshold === t
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      &lt;{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Low Stock Only */}
              <button
                type="button"
                onClick={() => setOnlyShowLowStock(!onlyShowLowStock)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyShowLowStock
                    ? 'bg-amber-400 text-emerald-950 shadow-md ring-2 ring-amber-400'
                    : lowInventoryProductsCount > 0
                    ? 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title="Filter table to only products below inventory threshold"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${onlyShowLowStock ? 'text-emerald-950' : 'text-amber-600'}`} />
                <span>
                  {onlyShowLowStock ? 'Showing Low Stock Only' : `Low Stock (< ${inventoryThreshold})`}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  onlyShowLowStock ? 'bg-emerald-950 text-amber-300' : 'bg-amber-200 text-amber-950'
                }`}>
                  {lowInventoryProductsCount}
                </span>
              </button>

              {/* Add Product Button */}
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </button>
            </div>
          </div>

          {/* Low Inventory Alert Notification Banner */}
          {lowInventoryProductsCount > 0 && !onlyShowLowStock && (
            <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Inventory Notice:</strong> {lowInventoryProductsCount} product{lowInventoryProductsCount > 1 ? 's have' : ' has'} stock levels below <strong>{inventoryThreshold} units</strong> and {lowInventoryProductsCount > 1 ? 'are' : 'is'} highlighted below with distinct warning icons.
                </span>
              </div>
              <button
                onClick={() => setOnlyShowLowStock(true)}
                className="text-[11px] bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold px-2.5 py-1 rounded-lg transition shrink-0"
              >
                Filter Low Stock Only
              </button>
            </div>
          )}

          {/* Product Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Barcode</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Brand</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Price (KSh)</th>
                  <th className="p-3.5">
                    <div className="flex items-center gap-1">
                      <span>Stock</span>
                      <span className="text-[9px] text-slate-400 font-normal">(&lt;{inventoryThreshold} = Alert)</span>
                    </div>
                  </th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {onlyShowLowStock
                        ? `No products currently below the ${inventoryThreshold} units threshold.`
                        : 'No products match your criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const alert = getInventoryAlert(p.stock_quantity, inventoryThreshold);

                    return (
                      <tr key={p.id} className={`${alert.rowBgClass} transition`}>
                        <td className="p-3.5 font-mono font-bold text-slate-700">{p.barcode}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900">{p.product_name}</span>
                            {alert.isLow && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${alert.badgeClass}`}
                                title={`Inventory level (${p.stock_quantity}) is below warning threshold of ${inventoryThreshold} units`}
                              >
                                {alert.icon}
                                <span>
                                  {alert.isOutOfStock ? 'OUT OF STOCK' : `LOW (< ${inventoryThreshold})`}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{p.unit}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">{p.brand}</td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="font-bold text-emerald-800">
                            KSh {p.selling_price.toLocaleString()}
                          </span>
                          {p.discount_price && p.discount_price > 0 && p.discount_price < p.selling_price && (
                            <div className="text-[10px] text-slate-400 line-through">
                              Disc: KSh {p.discount_price}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            {alert.isLow && alert.icon}
                            <div>
                              <span className={`font-mono font-bold text-xs ${alert.textClass}`}>
                                {p.stock_quantity}
                              </span>
                              {alert.isLow && (
                                <div className="text-[10px] mt-0.5">
                                  {alert.isOutOfStock ? (
                                    <span className="font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-md inline-block">
                                      0 Units Left
                                    </span>
                                  ) : (
                                    <span className="font-bold text-amber-950 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded-md inline-block">
                                      Needs Restock
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.product_name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: CSV PRODUCT IMPORT (Section 11) */}
      {/* ============================================================ */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Bulk CSV Product Importer
              </h2>
              <p className="text-xs text-slate-500">
                Upload or paste catalog CSV to import new barcodes or bulk update prices &amp; inventory.
              </p>
            </div>
            <button
              onClick={handleDownloadSampleCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </div>

          {/* CSV File Input & Paste Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select CSV File from Device
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
              />
              <p className="text-[11px] text-slate-400">
                Required columns: <code className="text-emerald-700">barcode, product_name, selling_price</code>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Or Paste Raw CSV Data
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="barcode,product_name,brand,category,unit,selling_price,discount_price,stock_quantity&#10;6161234567890,White Bread,ABC,Bakery,500g,80,0,150"
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => handleProcessCsv('upsert')}
              disabled={importing || !csvText.trim()}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Processing CSV...' : 'Import & Update Existing (Upsert)'}
            </button>
            <button
              onClick={() => handleProcessCsv('create_only')}
              disabled={importing || !csvText.trim()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Insert New Only (Skip Existing)
            </button>
          </div>

          {/* Import Results Box */}
          {importResult && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  CSV Processed: {importResult.imported} added, {importResult.updated} updated, {importResult.errors?.length || 0} errors.
                </span>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-rose-700">Errors Encountered:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-rose-200 text-[11px] text-rose-600 font-mono">
                    {importResult.errors.map((err: any, idx: number) => (
                      <div key={idx}>
                        Row {err.row}: {err.message} {err.barcode ? `(${err.barcode})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: STORE QR CODE (Section 14) */}
      {/* ============================================================ */}
      {activeTab === 'qr' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center max-w-md mx-auto space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Official Supermarket QR
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">{currentSupermarket.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Code: <strong className="font-mono text-emerald-800">{currentSupermarket.supermarket_code}</strong> • {currentSupermarket.location}
            </p>
          </div>

          {/* QR Container */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-emerald-300 rounded-3xl inline-block shadow-inner">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Store QR Code" className="w-64 h-64 mx-auto rounded-2xl" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            Place this QR poster at the entrance of {currentSupermarket.name}. Customers scan it with their camera or enter code <span className="font-mono font-bold text-emerald-800">{currentSupermarket.supermarket_code}</span> to connect.
          </p>

          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Entrance Poster
            </button>
            <a
              href={qrDataUrl}
              download={`SmartCart_QR_${currentSupermarket.supermarket_code}.png`}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Image
            </a>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SHOPPER SCANS & USAGE ANALYTICS (VIEW-ONLY FOR THIS STORE) */}
      {/* ============================================================ */}
      {activeTab === 'usage' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
          {/* Header & Access Control Notice */}
          <div className="border-b border-slate-100 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-mono">
                    {currentSupermarket.supermarket_code} Telemetry
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Store-Isolated
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 mt-1">
                  Shopper Scans &amp; System Usage Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time telemetry of shoppers who scanned barcodes and used the SmartCart system strictly inside <strong>{currentSupermarket.name}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Store Feed
                </span>
              </div>
            </div>

            {/* Strict Access Control Restriction Warning */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Access Restriction Policy Enforced:</p>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Store administrators cannot edit, alter, or manipulate customers&apos; personal dashboards, live shopping carts, budgets, or loyalty points. You have strictly view-only telemetry to inspect scan metrics and transaction volume for your supermarket only. Access to other supermarkets&apos; data is restricted.
                </p>
              </div>
            </div>
          </div>

          {/* Shopper & Scan KPI Cards (Strictly for this supermarket) */}
          {(() => {
            const uniqueShoppers = new Set(sessions.map((s) => s.customer_id || s.customer_name)).size;
            const totalUnitsScanned = sessions.reduce(
              (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
              0
            );
            const activeShoppers = sessions.filter((s) => s.status === 'ACTIVE').length;
            const completedTrips = sessions.filter((s) => s.status === 'COMPLETED').length;
            const totalScannedSales = sessions.reduce((acc, s) => acc + s.estimated_total, 0);

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Shoppers Scanned
                    </span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950 font-mono">
                    {uniqueShoppers}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Unique customers scanned in {currentSupermarket.supermarket_code}
                  </span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                      Total Items Scanned
                    </span>
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-950 font-mono">
                    {totalUnitsScanned} <span className="text-xs font-bold text-blue-700">units</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-medium">
                    Barcode scans registered
                  </span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      Active In-Store Carts
                    </span>
                    <Store className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-950 font-mono">
                    {activeShoppers}
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">
                    Currently shopping aisles
                  </span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                      Completed Trips
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-950 font-mono">
                    {completedTrips}
                  </div>
                  <span className="text-[10px] text-purple-700 font-medium">
                    Digital checkout receipts
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Shopper Sessions Breakdown List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>In-Store Shopper Sessions Telemetry</span>
                <span className="text-slate-400 font-mono text-[10px]">({sessions.length})</span>
              </h3>
              <span className="text-[10px] text-slate-400">Read-Only Customer Privacy Protected</span>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No Shopper Scans Recorded Yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  When customers connect to {currentSupermarket.name} and scan products, their session activity and scan count will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((sess) => {
                  const totalUnits = sess.items.reduce((a, b) => a + b.quantity, 0);
                  return (
                    <div
                      key={sess.id}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            {sess.customer_name || 'Customer Shopper'}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              sess.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {sess.status === 'ACTIVE' ? '🟢 LIVE SHOPPER' : 'COMPLETED'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                            {sess.id.slice(0, 14)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-600">
                          <span>
                            <strong>{sess.items.length}</strong> unique products • <strong>{totalUnits}</strong> items scanned
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">
                            Started {new Date(sess.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Scanned Items Badges */}
                        {sess.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {sess.items.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                              >
                                {item.quantity}x {item.product_name_snapshot}
                              </span>
                            ))}
                            {sess.items.length > 4 && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-bold">
                                +{sess.items.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Scanned Total
                        </span>
                        <div className="font-mono font-black text-sm text-emerald-900">
                          KSh {sess.estimated_total.toLocaleString()}
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                          Read-Only Monitor
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: STORE TEAM & STAFF ACCOUNTS (UP TO 3 LOGINS) */}
      {/* ============================================================ */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-mono">
                    Staff Delegation
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                    Max 3 Sub-Accounts
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 mt-1">
                  Store Team &amp; Staff Logins
                </h2>
                <p className="text-xs text-slate-500">
                  As Store Admin, create and manage up to 3 sub-accounts with their own unique logins and passwords to access this supermarket&apos;s management portal.
                </p>
              </div>

              <button
                onClick={handleOpenAddStaff}
                disabled={staffList.length >= 3}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-950 text-xs font-black shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Staff Account ({staffList.length}/3)</span>
              </button>
            </div>
          </div>

          {/* Quota & Slots Visual Tracker */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Store Staff Slots Quota</span>
              </span>
              <span className="text-xs font-black text-emerald-900 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {staffList.length} of 3 Slots Used ({Math.max(0, 3 - staffList.length)} Available)
              </span>
            </div>

            {/* 3 Visual Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[0, 1, 2].map((slotIdx) => {
                const staffMember = staffList[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    className={`p-3 rounded-xl border transition ${
                      staffMember
                        ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-white/60 border-dashed border-slate-300 text-center flex flex-col items-center justify-center py-4'
                    }`}
                  >
                    {staffMember ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                            Slot {slotIdx + 1}: In Use
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              staffMember.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {staffMember.status}
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900 truncate">{staffMember.name}</p>
                        <p className="text-[11px] text-amber-800 font-medium truncate">{staffMember.staff_title}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">Login: {staffMember.username}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Slot {slotIdx + 1}: Available
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium">Unallocated Staff Slot</p>
                        <button
                          onClick={handleOpenAddStaff}
                          className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline mt-1 block"
                        >
                          + Assign Staff Member
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff Accounts List */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Active Store Team Members ({staffList.length})
            </h3>

            {staffList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No Staff Accounts Created Yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Click &ldquo;Create Staff Account&rdquo; above to provision your first assistant manager, supervisor, or stock clerk login.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {staffList.map((stf) => {
                  const isCopied = copiedStaffId === stf.id;
                  const isPasswordRevealed = revealedPasswordId === stf.id;
                  return (
                    <div
                      key={stf.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-slate-100/60"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{stf.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            {stf.staff_title}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              stf.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {stf.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 text-[11px]">Login Username: </span>
                            <strong className="font-mono text-slate-900">{stf.username}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Staff Email: </span>
                            <span className="font-mono text-slate-800">{stf.email}</span>
                          </div>
                        </div>

                        {/* Password Display & Copy */}
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-slate-400 text-[11px]">Staff Password: </span>
                          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                            {isPasswordRevealed ? stf.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswordId(isPasswordRevealed ? null : stf.id)
                            }
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Permissions Tags */}
                        {stf.permissions && stf.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {stf.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium"
                              >
                                {perm.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                        <button
                          onClick={() => handleCopyStaffCredentials(stf)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Credentials</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleToggleStaffStatus(stf.id, stf.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                            stf.status === 'ACTIVE'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          {stf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleDeleteStaff(stf.id, stf.name)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          title="Delete staff account (frees 1 slot)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: SETTINGS & THRESHOLDS */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* TAB 6: SETTINGS & THRESHOLDS & BACKGROUND CUSTOMIZATION */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          {settingsSaved && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Store profile and custom background colors updated successfully!</span>
            </div>
          )}

          {/* Section 1: Store Background & Appearance Customization */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                    <Palette className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Store Background &amp; Brand Colors
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Customize the look and feel for <strong>{currentSupermarket.name}</strong>. Customers shopping at your branch will see this custom background and brand theme!
                </p>
              </div>
            </div>

            {/* 1-Click Designer Themes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quick Theme Presets (1-Click Apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    name: 'Fresh Mint',
                    bg: '#f0fdf4',
                    gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    theme: '#064e3b',
                  },
                  {
                    name: 'Warm Amber',
                    bg: '#fffbeb',
                    gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    theme: '#78350f',
                  },
                  {
                    name: 'Sky Azure',
                    bg: '#f0f9ff',
                    gradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    theme: '#0369a1',
                  },
                  {
                    name: 'Modern Slate',
                    bg: '#f8fafc',
                    gradient: '',
                    theme: '#0f172a',
                  },
                  {
                    name: 'Lavender Rose',
                    bg: '#faf5ff',
                    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                    theme: '#581c87',
                  },
                  {
                    name: 'Coral Sunset',
                    bg: '#fff7ed',
                    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    theme: '#9a3412',
                  },
                  {
                    name: 'Midnight Dark',
                    bg: '#0f172a',
                    gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    theme: '#10b981',
                  },
                  {
                    name: 'Rose Petal',
                    bg: '#fff1f2',
                    gradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                    theme: '#9f1239',
                  },
                ].map((preset) => {
                  const isCurrent =
                    settingsForm.bg_color === preset.bg &&
                    (settingsForm.bg_gradient || '') === (preset.gradient || '');
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setSettingsForm({
                          ...settingsForm,
                          bg_color: preset.bg,
                          bg_gradient: preset.gradient,
                          theme_color: preset.theme,
                        })
                      }
                      className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between h-20 shadow-xs ${
                        isCurrent
                          ? 'border-emerald-600 ring-2 ring-emerald-500 shadow-md scale-[1.02]'
                          : 'border-slate-200 hover:border-slate-300 hover:scale-[1.01]'
                      }`}
                      style={{ background: preset.gradient || preset.bg }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: preset.theme }} />
                        {isCurrent && (
                          <span className="text-[10px] font-black bg-emerald-700 text-white px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-900 drop-shadow-2xs">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store Background Color (Hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsForm.bg_color}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        bg_color: e.target.value,
                        bg_gradient: '',
                      })
                    }
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    title="Choose background color"
                  />
                  <input
                    type="text"
                    value={settingsForm.bg_color}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        bg_color: e.target.value,
                        bg_gradient: '',
                      })
                    }
                    placeholder="#f8fafc"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary solid background for the customer shopping interface.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store Brand / Header Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsForm.theme_color}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, theme_color: e.target.value })
                    }
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    title="Choose brand accent color"
                  />
                  <input
                    type="text"
                    value={settingsForm.theme_color}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, theme_color: e.target.value })
                    }
                    placeholder="#064e3b"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Accent color for buttons, store badges, and navbar header.
                </p>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Custom CSS Gradient (Optional)
                  </label>
                  {settingsForm.bg_gradient && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, bg_gradient: '' })}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Gradient (Use Solid Color)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={settingsForm.bg_gradient}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, bg_gradient: e.target.value })
                  }
                  placeholder="e.g. linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Live Customer Preview */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Customer View Live Preview
              </span>
              <div
                className="p-4 rounded-2xl border border-slate-300 shadow-inner relative overflow-hidden transition-all duration-300"
                style={{
                  background: settingsForm.bg_gradient || settingsForm.bg_color,
                }}
              >
                {/* Mini Header */}
                <div
                  className="p-2.5 rounded-xl text-white shadow-sm flex items-center justify-between mb-3 text-xs"
                  style={{ backgroundColor: settingsForm.theme_color }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-900 font-black flex items-center justify-center text-[10px]">
                      SC
                    </span>
                    <span className="font-extrabold">{settingsForm.name || currentSupermarket.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {currentSupermarket.supermarket_code}
                  </span>
                </div>

                {/* Mock Customer Card */}
                <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80 shadow-xs text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Scanner &amp; Active Cart</span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Live Running Total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Customers shopping in <strong>{settingsForm.name || currentSupermarket.name}</strong> will see this custom ambient background.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Store Details & Thresholds */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">Store Profile &amp; Rules</h2>
              <p className="text-xs text-slate-500">
                Configure branch details and low inventory threshold triggers
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Supermarket Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={settingsForm.branch}
                  onChange={(e) => setSettingsForm({ ...settingsForm, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Physical Location Address</label>
                <input
                  type="text"
                  value={settingsForm.location}
                  onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Admin Email</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Low Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={settingsForm.low_stock_threshold}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, low_stock_threshold: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 active:scale-[0.98]"
              >
                <Palette className="w-4 h-4 text-amber-300" />
                <span>Save Store Settings &amp; Background Colors</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ============================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product to ' + currentSupermarket.name}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-emerald-200 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {productModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {productModalError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Barcode (Unique per Store)</label>
                <input
                  type="text"
                  placeholder="e.g. 6161234567890"
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. White Bread"
                  value={productForm.product_name}
                  onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. 500g, 1L, 1kg"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (KSh)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="80"
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Price (KSh, optional)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={productForm.discount_price}
                    onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Bakery">Bakery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Food & Groceries">Food &amp; Groceries</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Cleaning Products">Cleaning Products</option>
                    <option value="Fresh Produce">Fresh Produce</option>
                    <option value="Household & Electronics">Household &amp; Electronics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Account Modal (Max 3 Slots) */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white p-5 relative">
              <button
                onClick={() => setShowStaffModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-mono">
                  Slot {staffList.length + 1} of 3
                </span>
                <span className="text-[10px] font-bold bg-white/10 text-emerald-200 px-2 py-0.5 rounded-md">
                  {currentSupermarket.supermarket_code}
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight">Create Store Staff Account</h3>
              <p className="text-xs text-emerald-200/90 mt-1">
                Provide individual login credentials for a supervisor or clerk to access this store&apos;s portal.
              </p>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4 overflow-y-auto text-xs text-slate-800">
              {staffModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{staffModalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Staff Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Peter Maina"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Login Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value.toLowerCase().trim() })}
                    placeholder="e.g. pmaina"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Staff Designation
                  </label>
                  <select
                    value={staffForm.staff_title}
                    onChange={(e) => setStaffForm({ ...staffForm, staff_title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Assistant Manager">Assistant Manager</option>
                    <option value="Inventory & Stock Clerk">Inventory &amp; Stock Clerk</option>
                    <option value="Cashier Supervisor">Cashier Supervisor</option>
                    <option value="Floor Supervisor">Floor Supervisor</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    Staff Login Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setStaffForm({
                        ...staffForm,
                        password: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
                      })
                    }
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The staff member will use this password alongside store code <strong>{currentSupermarket.supermarket_code}</strong>.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Staff Email (Optional)
                </label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder={`e.g. ${staffForm.username || 'staff'}@${currentSupermarket.supermarket_code.toLowerCase()}.co.ke`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl font-black shadow-md flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
