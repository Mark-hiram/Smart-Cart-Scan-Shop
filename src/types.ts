export type UserRole = 'customer' | 'admin' | 'CUSTOMER' | 'SUPERMARKET_ADMIN' | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password_hash?: string;
  totp_enrolled?: boolean;
  totp_secret_encrypted?: string;
  backup_code_hashes?: string[];
  last_used_step?: number;
  supermarket_id?: string;
  phone?: string;
  id_number?: string;
  password?: string;
  username?: string;
  staff_title?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  login_count?: number;
  last_login_at?: string;
  created_at: string;
}

export interface Supermarket {
  id: string;
  supermarket_code: string;
  name: string;
  branch?: string;
  location: string;
  phone: string;
  email: string;
  currency: string; // e.g. "KSh"
  status: 'ACTIVE' | 'INACTIVE';
  low_stock_threshold: number;
  admin_password_hash?: string;
  admin_password?: string;
  admin_name?: string;
  qr_code?: string;
  bg_color?: string; // e.g. '#f8fafc', '#f0fdf4', '#0f172a'
  bg_gradient?: string; // e.g. 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
  theme_color?: string; // primary store header/brand color, e.g. '#064e3b'
  created_at: string;
}

export interface StoreStaffAccount {
  id: string;
  supermarket_id: string;
  name: string;
  username: string;
  email: string;
  password_hash?: string;
  password?: string;
  staff_title: string;
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  last_login?: string;
}

export interface Product {
  id: string;
  supermarket_id: string;
  barcode: string;
  product_name: string;
  brand: string;
  category: string;
  description: string;
  unit: string;
  selling_price: number;
  discount_price: number;
  stock_quantity: number;
  image?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  session_id: string;
  product_id: string;
  barcode: string;
  product_name_snapshot: string;
  brand_snapshot: string;
  unit_snapshot: string;
  unit_price_snapshot: number;
  discount_price_snapshot: number;
  effective_price: number;
  quantity: number;
  subtotal: number;
  image_snapshot?: string;
  created_at: string;
}

export interface ShoppingSession {
  id: string;
  customer_id: string;
  customer_name?: string;
  supermarket_id: string;
  supermarket_name?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  discount: number;
  estimated_total: number;
  budget?: number;
  receipt_code?: string;
  loyalty_points_earned?: number;
  items: ShoppingItem[];
}

export interface LoyaltyTransaction {
  session_id: string;
  receipt_code?: string;
  supermarket_id: string;
  supermarket_name: string;
  date: string;
  session_total: number;
  points_earned: number;
}

export interface CustomerLoyalty {
  total_points: number;
  points_value_ksh: number;
  total_spent: number;
  completed_sessions_count: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  next_tier_name?: string;
  points_to_next_tier?: number;
  next_tier_threshold?: number;
  tier_progress_percent: number;
  history: LoyaltyTransaction[];
}

export interface Category {
  id: string;
  supermarket_id?: string; // empty means global default
  name: string;
  icon?: string;
}

export interface ActivityLog {
  id: string;
  supermarket_id?: string;
  user_name?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminDashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySessionsCount: number;
  todayEstimatedSales: number;
  activeShoppersCount: number;
  totalItemsScannedInStore: number;
  uniqueCustomersUsedCount: number;
  totalSessionsInStore: number;
}

export interface HelpTicketMessage {
  id: string;
  sender: 'CUSTOMER' | 'SYSTEM_ADMIN';
  sender_name: string;
  sender_email: string;
  message: string;
  timestamp: string;
}

export type TicketCategory =
  | 'PRICE_DISPUTE'
  | 'TECHNICAL_ISSUE'
  | 'ACCOUNT_HELP'
  | 'FEEDBACK'
  | 'EMERGENCY';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'REPLIED' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  supermarket_id?: string;
  supermarket_name?: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: HelpTicketMessage[];
  created_at: string;
  updated_at: string;
}

