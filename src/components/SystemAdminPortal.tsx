import React, { useState, useEffect } from 'react';
import {
  Shield,
  Store,
  Database,
  RefreshCw,
  Plus,
  CheckCircle2,
  Download,
  Activity,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Search,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  Phone,
  Mail,
  Building2,
  Sparkles,
  X,
  AlertCircle,
  Package,
  Users,
  KeyRound,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Hash,
  Edit2,
  UserPlus,
  Lock,
  LogOut,
  LifeBuoy,
  Send,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { api } from '../api.ts';
import { Supermarket, ActivityLog, User, SupportTicket, TicketStatus } from '../types.ts';

interface SystemAdminPortalProps {
  supermarkets: Supermarket[];
  onRefreshSupermarkets: () => void;
  onSelectSupermarket: (sm: Supermarket) => void;
  onSignOut?: () => void;
}

export const SystemAdminPortal: React.FC<SystemAdminPortalProps> = ({
  supermarkets,
  onRefreshSupermarkets,
  onSelectSupermarket,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'supermarkets' | 'customers' | 'support' | 'logs'>('supermarkets');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // System Health state
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // One-time password display modal notice
  const [oneTimePasswordNotice, setOneTimePasswordNotice] = useState<{
    title: string;
    targetName: string;
    targetCodeOrEmail: string;
    password: string;
  } | null>(null);
  const [copiedNoticePassword, setCopiedNoticePassword] = useState(false);

  // Add Supermarket Modal
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [createdStoreCredentials, setCreatedStoreCredentials] = useState<{
    name: string;
    code: string;
    adminPassword: string;
  } | null>(null);

  const [newStoreForm, setNewStoreForm] = useState({
    name: '',
    supermarket_code: '',
    branch: '',
    location: '',
    phone: '',
    email: '',
    currency: 'KSh',
    low_stock_threshold: '15',
    admin_password: '',
    seedProducts: false,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Supermarket Confirmation Modal
  const [storeToDelete, setStoreToDelete] = useState<Supermarket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Supermarket Password Modal
  const [storeToResetPwd, setStoreToResetPwd] = useState<Supermarket | null>(null);
  const [newStorePasswordInput, setNewStorePasswordInput] = useState('');
  const [resetPwdSuccess, setResetPwdSuccess] = useState<string | null>(null);

  // ==========================================
  // CUSTOMER MANAGEMENT STATE
  // ==========================================
  const [customers, setCustomers] = useState<User[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    id_number: '',
    phone: '',
    password: '',
  });
  const [addCustomerError, setAddCustomerError] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Edit Customer Modal (Name, ID number, Phone, Password in case forgotten)
  const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: '',
    email: '',
    id_number: '',
    phone: '',
    password: '',
  });
  const [editCustomerError, setEditCustomerError] = useState('');
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // Delete Customer Confirmation
  const [customerToDelete, setCustomerToDelete] = useState<User | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // Revealed customer passwords
  const [revealedCustomerPasswords, setRevealedCustomerPasswords] = useState<Record<string, boolean>>({});

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await api.getSystemHealth();
      if (res.success) {
        setSystemHealth(res.health);
      }
    } catch (e) {
      console.error('Failed to load system health:', e);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadCustomers();
    loadTickets();
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTickets = async () => {
    try {
      const res = await api.getSupportTickets();
      if (res.success) {
        setTickets(res.tickets);
        if (selectedTicket) {
          const updated = res.tickets.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load support tickets:', e);
    }
  };

  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReplyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await api.sendSupportMessage({
        ticket_id: selectedTicket.id,
        message: adminReplyText.trim(),
        sender: 'SYSTEM_ADMIN',
        sender_name: 'Hiram Mark Karanja (SuperAdmin)',
        sender_email: 'hirammarkkaranja@gmail.com',
      });
      if (res.success && res.ticket) {
        setSelectedTicket(res.ticket);
        setAdminReplyText('');
        loadTickets();
        loadLogs();
      }
    } catch (e) {
      console.error('Failed to send admin reply:', e);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const res = await api.updateSupportTicketStatus(ticketId, status);
      if (res.success && res.ticket) {
        setSelectedTicket(res.ticket);
        loadTickets();
        loadLogs();
      }
    } catch (e) {
      console.error('Failed to update ticket status:', e);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.getActivityLogs();
      if (res.success) setLogs(res.logs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await api.getCustomerList();
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleToggleStoreStatus = async (sm: Supermarket) => {
    const nextStatus = sm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateSupermarket(sm.id, { status: nextStatus });
      onRefreshSupermarkets();
    } catch (err: any) {
      alert(err.message || 'Failed to update store status');
    }
  };



  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newStoreForm.name.trim()) {
      setFormError('Supermarket name is required.');
      return;
    }
    if (!newStoreForm.supermarket_code.trim()) {
      setFormError('Unique store code is required (e.g. SM001, CFP004).');
      return;
    }
    if (!newStoreForm.location.trim()) {
      setFormError('Physical store location is required.');
      return;
    }

    const assignedPassword =
      newStoreForm.admin_password.trim() || `SMK-${Math.floor(1000 + Math.random() * 9000)}`;

    setIsSubmitting(true);
    try {
      const res = await api.createSupermarket({
        supermarket_code: newStoreForm.supermarket_code.trim().toUpperCase(),
        name: newStoreForm.name.trim(),
        branch: newStoreForm.branch.trim() || 'Main Branch',
        location: newStoreForm.location.trim(),
        phone: newStoreForm.phone.trim() || '+254 700 000 000',
        email: newStoreForm.email.trim() || 'store@smartcart.co.ke',
        currency: newStoreForm.currency || 'KSh',
        low_stock_threshold: parseInt(newStoreForm.low_stock_threshold, 10) || 15,
        admin_password: assignedPassword,
        seedProducts: newStoreForm.seedProducts,
      });

      setCreatedStoreCredentials({
        name: res.supermarket.name,
        code: res.supermarket.supermarket_code,
        adminPassword: assignedPassword,
      });

      setShowAddStoreModal(false);
      setNewStoreForm({
        name: '',
        supermarket_code: '',
        branch: '',
        location: '',
        phone: '',
        email: '',
        currency: 'KSh',
        low_stock_threshold: '15',
        admin_password: `SMK-${Math.floor(1000 + Math.random() * 9000)}`,
        seedProducts: false,
      });
      onRefreshSupermarkets();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register supermarket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteSupermarket = async () => {
    if (!storeToDelete) return;

    if (supermarkets.length <= 1) {
      alert('Cannot delete the only supermarket in the network. At least one supermarket must remain active.');
      setStoreToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await api.deleteSupermarket(storeToDelete.id);
      alert(
        `Supermarket "${storeToDelete.name}" (${storeToDelete.supermarket_code}) was deleted successfully. ${
          res.productsRemoved || 0
        } associated products cleaned up.`
      );
      setStoreToDelete(null);
      onRefreshSupermarkets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete supermarket.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetSupermarketPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeToResetPwd) return;

    try {
      const newPwd = newStorePasswordInput.trim() || undefined;
      const res = await api.resetSupermarketPassword(storeToResetPwd.id, newPwd);
      setStoreToResetPwd(null);
      setNewStorePasswordInput('');
      setOneTimePasswordNotice({
        title: 'Supermarket Admin Password Reset',
        targetName: storeToResetPwd.name,
        targetCodeOrEmail: storeToResetPwd.supermarket_code,
        password: res.newPassword,
      });
      onRefreshSupermarkets();
      loadLogs();
      loadHealth();
    } catch (err: any) {
      alert(err.message || 'Failed to reset supermarket password.');
    }
  };

  const handleResetCustomerPassword = async (cust: User) => {
    if (!confirm(`Generate a new temporary password for customer account: ${cust.name} (${cust.email})?`)) return;
    try {
      const res = await api.resetCustomerPassword(cust.id);
      if (res.success) {
        setOneTimePasswordNotice({
          title: 'Customer Password Reset',
          targetName: cust.name,
          targetCodeOrEmail: cust.email,
          password: res.newPassword,
        });
        loadCustomers();
        loadLogs();
        loadHealth();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset customer password.');
    }
  };

  const handleCopyStorePassword = (code: string, pwd?: string) => {
    if (!pwd) return;
    navigator.clipboard.writeText(`Store Code: ${code} | Password: ${pwd}`);
  };

  const handleDownloadSQL = () => {
    window.open('/api/system/sql-script', '_blank');
  };

  // ==========================================
  // CUSTOMER HANDLERS
  // ==========================================
  const handleOpenAddCustomer = () => {
    setAddCustomerError('');
    setNewCustomerForm({
      name: '',
      email: '',
      id_number: '',
      phone: '',
      password: '',
    });
    setShowAddCustomerModal(true);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCustomerError('');

    if (!newCustomerForm.name.trim()) {
      setAddCustomerError('Customer name is required.');
      return;
    }
    if (!newCustomerForm.email.trim() || !newCustomerForm.email.includes('@')) {
      setAddCustomerError('A valid email address is required.');
      return;
    }

    setIsAddingCustomer(true);
    try {
      await api.addCustomer({
        name: newCustomerForm.name.trim(),
        email: newCustomerForm.email.trim().toLowerCase(),
        id_number: newCustomerForm.id_number.trim() || undefined,
        phone: newCustomerForm.phone.trim() || undefined,
        password: newCustomerForm.password.trim() || undefined,
      });
      setShowAddCustomerModal(false);
      loadCustomers();
      loadLogs();
    } catch (err: any) {
      setAddCustomerError(err.message || 'Failed to add customer.');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleOpenEditCustomer = (cust: User) => {
    setEditCustomerError('');
    setEditingCustomer(cust);
    setEditCustomerForm({
      name: cust.name,
      email: cust.email,
      id_number: cust.id_number || '',
      phone: cust.phone || '',
      password: cust.password || '',
    });
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditCustomerError('');

    if (!editCustomerForm.name.trim()) {
      setEditCustomerError('Customer full name is required.');
      return;
    }
    if (!editCustomerForm.email.trim() || !editCustomerForm.email.includes('@')) {
      setEditCustomerError('A valid email address is required.');
      return;
    }

    setIsEditingCustomer(true);
    try {
      await api.updateCustomer(editingCustomer.id, {
        name: editCustomerForm.name.trim(),
        email: editCustomerForm.email.trim().toLowerCase(),
        id_number: editCustomerForm.id_number.trim(),
        phone: editCustomerForm.phone.trim(),
        password: editCustomerForm.password.trim() || undefined,
      });
      setEditingCustomer(null);
      loadCustomers();
      loadLogs();
    } catch (err: any) {
      setEditCustomerError(err.message || 'Failed to update customer profile.');
    } finally {
      setIsEditingCustomer(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      await api.deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      loadCustomers();
      loadLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.');
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedCustomerPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered lists
  const filteredSupermarkets = supermarkets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supermarket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.branch && s.branch.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.id_number && c.id_number.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
      (c.phone && c.phone.toLowerCase().includes(customerSearchQuery.toLowerCase()))
  );

  const activeCount = supermarkets.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = supermarkets.length - activeCount;
  const totalCustomerLogins = customers.reduce((acc, c) => acc + (c.login_count || 1), 0);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Platform Banner */}
      <div className="relative overflow-hidden text-white rounded-3xl p-6 shadow-2xl border border-slate-700/80 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Background Network Operations Image */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/system_admin_hero.jpg"
            alt="Retail command operations center"
            className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.15] scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-emerald-950/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                System SuperAdmin
              </span>
              <span className="text-xs text-emerald-300 font-medium">Platform Command Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SmartCart Network Admin</h1>
            <p className="text-xs text-slate-200/90 mt-0.5">
              Supermarket onboarding &amp; passwords, customer account administration, and database exports
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 items-center">
          <button
            onClick={handleDownloadSQL}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 border border-emerald-600/60 cursor-pointer active:scale-95"
            title="Download smartcart.sql file for XAMPP / MySQL installation"
          >
            <Download className="w-3.5 h-3.5" />
            Download smartcart.sql
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowAddStoreModal(true);
            }}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add New Supermarket
          </button>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 border border-rose-500 cursor-pointer active:scale-95"
              title="Log Out of System SuperAdmin session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Server Health, Active Sessions & Error Logs Widget */}
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-4 sm:p-5 text-white shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              System Health &amp; Multi-Store Operations
            </span>
            <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              LIVE MONITOR
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {systemHealth && (
              <span className="text-slate-400 font-mono text-[11px]">
                Uptime: {Math.floor(systemHealth.uptime_seconds / 3600)}h {Math.floor((systemHealth.uptime_seconds % 3600) / 60)}m {Math.floor(systemHealth.uptime_seconds % 60)}s
              </span>
            )}
            <button
              type="button"
              onClick={loadHealth}
              disabled={loadingHealth}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Node &amp; Memory</span>
            <div className="text-slate-100 font-mono font-bold text-base">
              {systemHealth?.memory_usage_mb || 0} MB
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {systemHealth?.node_version || 'Node.js'} • {systemHealth?.system_load_status || 'Operational'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active Supermarkets</span>
            <div className="text-emerald-400 font-black text-base">
              {supermarkets.length} Supermarkets
            </div>
            <span className="text-[10px] text-slate-400 block">
              All tenants secure with bcrypt
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Live Active Shoppers</span>
            <div className="text-amber-400 font-black text-base">
              {systemHealth?.active_shopping_sessions?.total_active || 0} Sessions
            </div>
            <span className="text-[10px] text-slate-400 block">
              Real-time self-checkout carts
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Registered Shoppers</span>
            <div className="text-slate-100 font-black text-base">
              {customers.length} Accounts
            </div>
            <span className="text-[10px] text-slate-400 block">
              Zero plaintext passwords stored
            </span>
          </div>
        </div>

        {/* Active shopping sessions detail across all stores */}
        {systemHealth?.active_shopping_sessions?.sessions && systemHealth.active_shopping_sessions.sessions.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Self-Checkout Sessions Across Stores</span>
              <span className="text-emerald-400 font-mono">{systemHealth.active_shopping_sessions.sessions.length} Live Cart(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {systemHealth.active_shopping_sessions.sessions.map((sess: any) => (
                <div key={sess.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-200">{sess.customer_name}</span>
                    <span className="text-amber-400 font-mono">KSh {sess.current_total_ksh.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{sess.supermarket_name}</span>
                    <span>{sess.items_count} items in cart</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent System Alerts & Error Logs */}
        {systemHealth?.recent_error_logs && systemHealth.recent_error_logs.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-950/50 border border-rose-900/40 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Recent Error &amp; Security Audits</span>
              </span>
              <span className="text-[10px] text-slate-400">System Activity</span>
            </div>
            <div className="space-y-1">
              {systemHealth.recent_error_logs.slice(0, 3).map((errLog: any) => (
                <div key={errLog.id} className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-rose-400 mr-2">[{errLog.action}]</span>
                    <span className="text-slate-300 truncate">{errLog.details}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(errLog.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-md">
        <button
          onClick={() => setActiveTab('supermarkets')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'supermarkets'
              ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Supermarkets ({supermarkets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Accounts ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 relative ${
            activeTab === 'support'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-amber-400" />
          <span>Support Desk</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'support' ? 'bg-amber-400 text-emerald-950' : 'bg-slate-200 text-slate-800'
          }`}>
            {tickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Logs ({logs.length})</span>
        </button>
      </div>

      {/* Notification banner when a new supermarket was created with system password */}
      {createdStoreCredentials && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-950">
                Supermarket Account Created &amp; Initial Password Generated!
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Supermarket <strong>{createdStoreCredentials.name}</strong> has been registered with store code{' '}
                <strong className="font-mono bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-950">
                  {createdStoreCredentials.code}
                </strong>
                .
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-600 font-bold">System Generated Password:</span>
                <span className="font-mono font-black text-sm bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-950 select-all">
                  {createdStoreCredentials.adminPassword}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyStorePassword(createdStoreCredentials.code, createdStoreCredentials.adminPassword)
                  }
                  className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCreatedStoreCredentials(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: SUPERMARKETS WORKSPACE */}
      {/* ======================================================== */}
      {activeTab === 'supermarkets' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Supermarket Records
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {supermarkets.length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Registered tenants</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Stores
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {activeCount}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Available to shoppers</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Inactive Stores
              </span>
              <div className="text-2xl font-black font-mono text-slate-500 mt-1">
                {inactiveCount}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Temporarily paused</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Store Isolation
              </span>
              <div className="text-sm font-black font-mono text-amber-600 mt-2">
                STRICT TENANT
              </div>
              <span className="text-[10px] text-slate-500 font-mono">UNIQUE(store_id, barcode)</span>
            </div>
          </div>

          {/* Supermarket Records Management Workspace */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Workspace Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Supermarket Database Records &amp; Passwords
                </h2>
                <p className="text-xs text-slate-500">
                  Manage independent store databases, view/reset store passwords, or delete supermarkets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'grid'
                        ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'table'
                        ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Data Table View"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setFormError('');
                    setShowAddStoreModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Supermarket
                </button>
              </div>
            </div>

            {/* Filter / Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search supermarkets by store name, branch, code, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />
            </div>

            {/* GRID CARDS VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {filteredSupermarkets.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                    No supermarkets match your search query.
                  </div>
                ) : (
                  filteredSupermarkets.map((sm) => {
                    return (
                      <div
                        key={sm.id}
                        className="p-4 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-2xl transition space-y-3 flex flex-col justify-between group shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                {sm.supermarket_code}
                              </span>
                              <h3 className="font-extrabold text-sm text-slate-900 mt-1 leading-tight">
                                {sm.name}
                              </h3>
                              {sm.branch && (
                                <span className="text-[11px] text-emerald-700 font-medium block">
                                  {sm.branch}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleToggleStoreStatus(sm)}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition ${
                                sm.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                              title="Click to toggle status"
                            >
                              {sm.status}
                            </button>
                          </div>

                          {/* System-Assigned Store Password Widget */}
                          <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 text-[11px]">Admin Password:</span>
                              <span className="font-mono font-bold text-slate-500 text-[11px]">
                                •••••••• (Hidden)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setStoreToResetPwd(sm);
                                setNewStorePasswordInput('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-bold text-[10px] transition shrink-0 cursor-pointer"
                              title="Reset password and display new temporary password once"
                            >
                              Reset Password
                            </button>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/80">
                            <p className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{sm.location}</span>
                            </p>
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{sm.phone}</span>
                            </p>
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{sm.email}</span>
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectSupermarket(sm)}
                              className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
                            >
                              <span>Manage</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setStoreToResetPwd(sm);
                                setNewStorePasswordInput(`SMK-${Math.floor(1000 + Math.random() * 9000)}`);
                                setResetPwdSuccess(null);
                              }}
                              className="text-[11px] text-amber-700 hover:underline font-semibold"
                            >
                              Reset Pwd
                            </button>
                          </div>

                          <button
                            onClick={() => setStoreToDelete(sm)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center gap-1"
                            title={`Permanently delete ${sm.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* DETAILED DATA TABLE VIEW */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Code</th>
                      <th className="p-3">Supermarket Name &amp; Branch</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Admin Password</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSupermarkets.map((sm) => (
                      <tr key={sm.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-emerald-900">{sm.supermarket_code}</td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{sm.name}</div>
                          {sm.branch && <div className="text-[11px] text-slate-500">{sm.branch}</div>}
                        </td>
                        <td className="p-3 text-slate-600">{sm.location}</td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500 text-xs">•••••••• (Hidden)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setStoreToResetPwd(sm);
                                setNewStorePasswordInput('');
                              }}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-bold text-[10px] transition cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleStoreStatus(sm)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              sm.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sm.status}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectSupermarket(sm)}
                              className="text-emerald-800 hover:underline font-bold"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => {
                                setStoreToResetPwd(sm);
                                setNewStorePasswordInput('');
                              }}
                              className="text-amber-700 hover:underline text-[11px] font-semibold"
                            >
                              Reset Pwd
                            </button>
                            <button
                              onClick={() => setStoreToDelete(sm)}
                              className="text-rose-600 hover:text-rose-800 font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CUSTOMER ACCOUNTS WORKSPACE */}
      {/* (See login counts, edit details, name, ID, phone, reset pwd, add, delete) */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Customer Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Registered Customers
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {customers.length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Linked email shopper profiles</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Customer Logins
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {totalCustomerLogins}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Across all self-checkouts</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Average Logins / Shopper
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {customers.length > 0 ? (totalCustomerLogins / customers.length).toFixed(1) : 0}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Returning customer rate</span>
            </div>
          </div>

          {/* Customers Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Customer Accounts &amp; Login Tracking
                </h2>
                <p className="text-xs text-slate-500">
                  System administrators can view login counts, edit customer details (name, National ID, phone, password in case forgotten), add new customers, or delete accounts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadCustomers}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Reload Customer List"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCustomers ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleOpenAddCustomer}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Customer</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, National ID, or phone number..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Email (Linked)</th>
                    <th className="p-3">National / ID No.</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-center">Login Count</th>
                    <th className="p-3">Password</th>
                    <th className="p-3">Registered</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No customer accounts match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const loginCount = cust.login_count || 1;

                      return (
                        <tr key={cust.id} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-800 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-extrabold text-slate-900">{cust.name}</div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{cust.email}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {cust.id_number || '28491023'}
                          </td>
                          <td className="p-3 text-slate-600">{cust.phone || '+254 700 000 000'}</td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px]">
                              {loginCount} {loginCount === 1 ? 'login' : 'logins'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-500">•••••••• (Hidden)</span>
                              <button
                                type="button"
                                onClick={() => handleResetCustomerPassword(cust)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-bold text-[10px] transition cursor-pointer"
                                title="Reset customer password and generate one-time temporary key"
                              >
                                Reset
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 font-mono">
                            {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : 'Active'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditCustomer(cust)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-bold rounded-lg transition flex items-center gap-1"
                                title="Edit details, ID number, phone, and reset password"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit / Reset</span>
                              </button>

                              <button
                                onClick={() => setCustomerToDelete(cust)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-bold rounded-lg transition"
                                title="Delete customer account"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CUSTOMER SUPPORT & HELP DESK */}
      {/* ======================================================== */}
      {activeTab === 'support' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Customer Help Center &amp; Support Desk
                </h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  Direct Two-Way Channel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Answer customer price disputes, scanner inquiries, and account recovery requests in real time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={ticketFilterStatus}
                onChange={(e) => setTicketFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="ALL">All Statuses ({tickets.length})</option>
                <option value="OPEN">Open Only</option>
                <option value="REPLIED">Replied</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <button
                onClick={loadTickets}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
            {/* Left: Ticket list */}
            <div className="lg:col-span-5 border border-slate-200 rounded-2xl p-2 bg-slate-50/60 flex flex-col max-h-[550px] overflow-hidden">
              <div className="px-2 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Support Requests
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 p-1 pt-2">
                {tickets
                  .filter((t) => (ticketFilterStatus === 'ALL' ? true : t.status === ticketFilterStatus))
                  .length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No customer support tickets found.</p>
                  </div>
                ) : (
                  tickets
                    .filter((t) => (ticketFilterStatus === 'ALL' ? true : t.status === ticketFilterStatus))
                    .map((t) => {
                      const isSelected = selectedTicket?.id === t.id;
                      const lastMsg = t.messages[t.messages.length - 1];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-extrabold text-slate-900 truncate">
                              {t.subject}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black shrink-0 ${
                                t.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.status === 'REPLIED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <span className="truncate">{t.customer_name} ({t.customer_email})</span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(t.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {lastMsg && (
                            <p className="text-[10px] text-slate-600 truncate bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              <strong className="text-slate-800">{lastMsg.sender === 'SYSTEM_ADMIN' ? 'You: ' : 'Shopper: '}</strong>
                              {lastMsg.message}
                            </p>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right: Selected Ticket Detail & Interactive Chat */}
            <div className="lg:col-span-7 border border-slate-200 rounded-2xl p-4 bg-white flex flex-col max-h-[550px]">
              {selectedTicket ? (
                <div className="flex flex-col h-full space-y-3">
                  {/* Top Ticket Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          #{selectedTicket.id.slice(-6)}
                        </span>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                          {selectedTicket.category.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                          Priority: {selectedTicket.priority}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {selectedTicket.subject}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mt-1">
                        <span>Customer: <strong className="text-slate-800">{selectedTicket.customer_name}</strong></span>
                        <span>•</span>
                        <a href={`mailto:${selectedTicket.customer_email}`} className="text-emerald-800 font-mono hover:underline">
                          {selectedTicket.customer_email}
                        </a>
                        {selectedTicket.customer_phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{selectedTicket.customer_phone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedTicket.status !== 'RESOLVED' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'RESOLVED')}
                          className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Mark Resolved</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'OPEN')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Timeline */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {selectedTicket.messages.map((m) => {
                      const isAdmin = m.sender === 'SYSTEM_ADMIN';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl text-xs space-y-1 border ${
                            isAdmin
                              ? 'bg-emerald-950 text-white border-emerald-900 ml-6'
                              : 'bg-slate-50 border-slate-200 text-slate-800 mr-6'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold flex items-center gap-1 ${isAdmin ? 'text-amber-300' : 'text-slate-700'}`}>
                              {isAdmin ? (
                                <>
                                  <Shield className="w-3 h-3 text-amber-400" />
                                  <span>You (System SuperAdmin)</span>
                                </>
                              ) : (
                                <>
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span>{m.sender_name}</span>
                                </>
                              )}
                            </span>
                            <span className={`font-mono ${isAdmin ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleAdminSendReply} className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
                    <input
                      type="text"
                      required
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder={`Reply to ${selectedTicket.customer_name}...`}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply}
                      className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {isSendingReply ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>Send Reply</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">No Ticket Selected</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Select a support inquiry from the left to view customer details and reply directly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PLATFORM AUDIT LOGS */}
      {/* ======================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Network Activity &amp; Security Logs
              </h2>
              <p className="text-xs text-slate-500">
                Immutable audit trail of customer logins, admin password resets, product updates, and system operations.
              </p>
            </div>
            <button
              onClick={loadLogs}
              className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-400 text-center py-6">No activity logged yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-slate-800 font-medium">{log.details}</span>
                    </div>
                    {log.user_name && (
                      <span className="text-[10px] text-slate-500 font-medium">User: {log.user_name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD NEW SUPERMARKET RECORD */}
      {/* (WITH SYSTEM-GENERATED PASSWORD AS REQUESTED) */}
      {/* ======================================================== */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Register New Supermarket Record</h3>
                  <p className="text-[10px] text-emerald-300">
                    System provides initial admin password for store management
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStoreModal(false)}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}



              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supermarket Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cleanshelf Supermarket"
                    value={newStoreForm.name}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supermarket Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS003"
                    value={newStoreForm.supermarket_code}
                    onChange={(e) =>
                      setNewStoreForm({ ...newStoreForm, supermarket_code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
              </div>

              {/* System Generated Password Field */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>System Generated Admin Password:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewStoreForm({
                        ...newStoreForm,
                        admin_password: `SMK-${Math.floor(1000 + Math.random() * 9000)}`,
                      })
                    }
                    className="text-[11px] font-bold text-emerald-800 hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStoreForm.admin_password}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, admin_password: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-black text-emerald-950 text-xs focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newStoreForm.admin_password);
                      alert('Password copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 font-bold transition flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Given by the system on admin side for store managers to access their store dashboard.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch / Outlet Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ruaka Branch"
                  value={newStoreForm.branch}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Location / Physical Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Limuru Road, Ruaka Town, Kiambu"
                  value={newStoreForm.location}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Store Phone Contact</label>
                  <input
                    type="text"
                    placeholder="+254 700 123 456"
                    value={newStoreForm.phone}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    placeholder="admin@cleanshelf.co.ke"
                    value={newStoreForm.email}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>



              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Registering...' : 'Register Supermarket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RESET SUPERMARKET ADMIN PASSWORD */}
      {/* ======================================================== */}
      {storeToResetPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                <KeyRound className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Reset Supermarket Password</h3>
                <p className="text-xs text-slate-500">
                  {storeToResetPwd.name} ({storeToResetPwd.supermarket_code})
                </p>
              </div>
            </div>

            {resetPwdSuccess ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetPwdSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleResetSupermarketPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    New Supermarket Password
                  </label>
                  <input
                    type="text"
                    value={newStorePasswordInput}
                    onChange={(e) => setNewStorePasswordInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="Leave blank to auto-generate secure password"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">Current: •••••••• (Hashed with bcrypt)</span>
                    <span className="text-[10px] text-emerald-800 font-semibold">Min 8 characters</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStoreToResetPwd(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs shadow-md transition"
                  >
                    Generate &amp; Assign Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ONE-TIME TEMPORARY PASSWORD DISPLAY MODAL */}
      {oneTimePasswordNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{oneTimePasswordNotice.title}</h3>
                <p className="text-xs text-slate-500">
                  {oneTimePasswordNotice.targetName} ({oneTimePasswordNotice.targetCodeOrEmail})
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                One-Time Temporary Password:
              </span>
              <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-amber-300">
                <code className="text-base font-mono font-black text-slate-900 select-all">
                  {oneTimePasswordNotice.password}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(oneTimePasswordNotice.password);
                    setCopiedNoticePassword(true);
                    setTimeout(() => setCopiedNoticePassword(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedNoticePassword ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNoticePassword ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-rose-600 font-semibold pt-1">
                Attention: For security, this password is shown ONCE and will not be displayed again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOneTimePasswordNotice(null);
                setCopiedNoticePassword(false);
              }}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              I Have Stored This Password Securely
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD CUSTOMER */}
      {/* ======================================================== */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Add Customer Account</h3>
                  <p className="text-[10px] text-slate-500">System Admin direct registration</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addCustomerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{addCustomerError}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="e.g. Samuel Mutua"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  placeholder="e.g. samuel.mutua@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID No.</label>
                  <input
                    type="text"
                    value={newCustomerForm.id_number}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, id_number: e.target.value })}
                    placeholder="29384751"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+254 712..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newCustomerForm.password}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                  placeholder="Account password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCustomer}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingCustomer ? 'Adding...' : 'Add Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: EDIT CUSTOMER DETAILS & PASSWORD RESET */}
      {/* ======================================================== */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Edit Customer Details</h3>
                  <p className="text-[10px] text-slate-500">
                    Update profile or reset password in case forgotten
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editCustomerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editCustomerError}</span>
              </div>
            )}

            <form onSubmit={handleEditCustomerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={editCustomerForm.name}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editCustomerForm.email}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID No.</label>
                  <input
                    type="text"
                    value={editCustomerForm.id_number}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, id_number: e.target.value })}
                    placeholder="e.g. 28491023"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editCustomerForm.phone}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                    placeholder="+254 712..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Password edit / reset */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Password (In Case Forgotten)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditCustomerForm({
                        ...editCustomerForm,
                        password: `sc${Math.floor(100000 + Math.random() * 900000)}`,
                      })
                    }
                    className="text-[11px] font-bold text-emerald-800 hover:underline"
                  >
                    Generate New
                  </button>
                </div>
                <input
                  type="text"
                  value={editCustomerForm.password}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, password: e.target.value })}
                  placeholder="Enter new customer password"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-amber-950"
                />
                <p className="text-[10px] text-amber-900/80">
                  Customer will be able to log in with this new password immediately.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingCustomer}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition"
                >
                  {isEditingCustomer ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: DELETE CUSTOMER CONFIRMATION */}
      {/* ======================================================== */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Delete Customer Account?</h3>
                <p className="text-xs text-rose-600 font-semibold">Irreversible customer deletion</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{customerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-900">{customerToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">National ID:</span>
                <span className="font-mono">{customerToDelete.id_number || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Logins:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {customerToDelete.login_count || 1}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomer}
                disabled={isDeletingCustomer}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCustomer ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: CONFIRM PERMANENT DELETE SUPERMARKET */}
      {/* ======================================================== */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Delete Supermarket Record?</h3>
                <p className="text-xs text-rose-600 font-semibold">Irreversible database deletion</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Store Name:</span>
                <span className="font-extrabold text-slate-900">{storeToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Store Code:</span>
                <span className="font-mono font-bold text-emerald-800">{storeToDelete.supermarket_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="truncate max-w-[200px] text-right">{storeToDelete.location}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1 text-rose-900">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                Cascading Deletion Notice:
              </p>
              <p>
                Deleting this supermarket record will permanently wipe all registered products, barcode associations, prices, and active shopping sessions belonging exclusively to <strong>{storeToDelete.name}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSupermarket}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Confirm Permanent Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
