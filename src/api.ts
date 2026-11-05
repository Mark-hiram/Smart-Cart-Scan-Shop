import {
  User,
  Supermarket,
  Product,
  ShoppingSession,
  Category,
  ActivityLog,
  AdminDashboardStats,
  CustomerLoyalty,
  StoreStaffAccount,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './types.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `API error ${res.status}`);
  }
  return data;
}

export const api = {
  // Public configuration (Google Client ID, environment flags)
  async getPublicConfig(): Promise<{
    success: boolean;
    googleClientId: string;
    adminEmailConfigured: boolean;
    adminEmail?: string;
    isProduction: boolean;
  }> {
    return fetchJson('/api/config/public');
  },

  // Dedicated System Admin Auth (Google + TOTP 2FA)
  async adminGoogleAuth(data: {
    credential?: string;
    devBypassToken?: string;
  }): Promise<{
    success: boolean;
    requiresEnrollment: boolean;
    twoFactorTicket: string;
    qrCodeDataUrl?: string;
    manualKey?: string;
    email: string;
    name?: string;
  }> {
    return fetchJson('/api/admin/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async adminEnroll2FA(
    twoFactorTicket: string,
    code: string
  ): Promise<{
    success: boolean;
    backupCodes: string[];
    admin: User;
    message: string;
  }> {
    return fetchJson('/api/admin/auth/2fa/enroll', {
      method: 'POST',
      body: JSON.stringify({ twoFactorTicket, code }),
    });
  },

  async adminVerify2FA(
    twoFactorTicket: string,
    code: string
  ): Promise<{
    success: boolean;
    admin: User;
    message?: string;
  }> {
    return fetchJson('/api/admin/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ twoFactorTicket, code }),
    });
  },

  async adminLogin(email: string, password: string): Promise<{ success: boolean; admin: User }> {
    return fetchJson('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async adminLogout(): Promise<{ success: boolean; message: string }> {
    return fetchJson('/api/admin/logout', {
      method: 'POST',
    });
  },

  async getAdminMe(): Promise<{ success: boolean; admin: User }> {
    return fetchJson('/api/admin/me');
  },

  async getSystemHealth(): Promise<{
    success: boolean;
    health: {
      server_time: string;
      node_version: string;
      uptime_seconds: number;
      memory_usage_mb: number;
      system_load_status: string;
      supermarkets_count: number;
      products_count: number;
      customers_count: number;
      active_shopping_sessions: {
        total_active: number;
        sessions: Array<{
          id: string;
          customer_name: string;
          supermarket_name: string;
          items_count: number;
          current_total_ksh: number;
          started_at: string;
          last_activity: string;
        }>;
      };
      recent_error_logs: Array<{
        id: string;
        action: string;
        details: string;
        timestamp: string;
        user_name?: string;
      }>;
    };
  }> {
    return fetchJson('/api/admin/system-health');
  },

  async resetCustomerPassword(customer_id: string): Promise<{
    success: boolean;
    newPassword: string;
    user: User;
    message: string;
  }> {
    return fetchJson('/api/customer/reset-password', {
      method: 'POST',
      body: JSON.stringify({ customer_id }),
    });
  },

  // Auth
  async login(email: string, password?: string): Promise<{ success: boolean; user: User }> {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async storeAdminLogin(
    supermarket_code: string,
    password: string,
    username_or_email?: string
  ): Promise<{ success: boolean; user: User; supermarket: Supermarket; isStaff?: boolean; staffTitle?: string }> {
    return fetchJson('/api/auth/store-admin-login', {
      method: 'POST',
      body: JSON.stringify({ supermarket_code, password, username_or_email }),
    });
  },

  async staffLogin(
    username_or_email: string,
    password: string
  ): Promise<{ success: boolean; user: User; supermarket: Supermarket; staffTitle: string }> {
    return fetchJson('/api/auth/staff-login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
  },

  async register(data: {
    name: string;
    email: string;
    role: string;
    phone?: string;
    supermarket_id?: string;
  }): Promise<{ success: boolean; user: User }> {
    return fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Customer Email Accounts
  async listCustomers(): Promise<{ success: boolean; customers: User[] }> {
    return fetchJson('/api/customer/list');
  },

  async getCustomerByEmail(email: string): Promise<{ success: boolean; customer: User }> {
    return fetchJson(`/api/customer/by-email?email=${encodeURIComponent(email)}`);
  },

  async customerGoogleAuth(email: string, name?: string): Promise<{ success: boolean; user: User; message: string }> {
    return fetchJson('/api/customer/google-auth', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  },

  async customerForgotPassword(
    email: string
  ): Promise<{ success: boolean; newPassword: string; email: string; name: string; message: string }> {
    return fetchJson('/api/auth/customer/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async sendRecoveryCode(
    email: string
  ): Promise<{
    success: boolean;
    email: string;
    code: string;
    expiresInMinutes: number;
    name: string;
    message: string;
  }> {
    return fetchJson('/api/auth/customer/send-recovery-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyRecoveryCode(
    email: string,
    code: string,
    newPassword?: string
  ): Promise<{
    success: boolean;
    user: User;
    newPassword: string;
    message: string;
  }> {
    return fetchJson('/api/auth/customer/verify-recovery-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  async emailReceipt(data: {
    email: string;
    receiptCode?: string;
    supermarketName?: string;
    totalAmount?: number;
  }): Promise<{
    success: boolean;
    message: string;
    deliveryDetails: { email: string; timestamp: string; receiptCode: string };
  }> {
    return fetchJson('/api/customer/email-receipt', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Support & Help Center
  async getSupportTickets(params?: {
    customer_id?: string;
    customer_email?: string;
  }): Promise<{ success: boolean; tickets: SupportTicket[] }> {
    const q = new URLSearchParams();
    if (params?.customer_id) q.set('customer_id', params.customer_id);
    if (params?.customer_email) q.set('customer_email', params.customer_email);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson(`/api/support/tickets${qs}`);
  },

  async createSupportTicket(data: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    supermarket_id?: string;
    supermarket_name?: string;
    subject: string;
    category: TicketCategory;
    priority?: TicketPriority;
    initial_message: string;
  }): Promise<{ success: boolean; ticket: SupportTicket }> {
    return fetchJson('/api/support/tickets/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendSupportMessage(data: {
    ticket_id: string;
    message: string;
    sender: 'CUSTOMER' | 'SYSTEM_ADMIN';
    sender_name: string;
    sender_email: string;
  }): Promise<{ success: boolean; ticket: SupportTicket }> {
    return fetchJson('/api/support/tickets/message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSupportTicketStatus(
    ticket_id: string,
    status: TicketStatus
  ): Promise<{ success: boolean; ticket: SupportTicket }> {
    return fetchJson('/api/support/tickets/status', {
      method: 'POST',
      body: JSON.stringify({ ticket_id, status }),
    });
  },

  async storeAdminForgotPassword(
    supermarket_code: string,
    staff_username_or_email?: string
  ): Promise<{
    success: boolean;
    newPassword: string;
    targetEmail: string;
    supermarketName: string;
    accountType: string;
    message: string;
  }> {
    return fetchJson('/api/auth/store-admin/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ supermarket_code, staff_username_or_email }),
    });
  },

  // Supermarkets
  async getSupermarkets(): Promise<{ success: boolean; supermarkets: Supermarket[] }> {
    return fetchJson('/api/supermarkets/list');
  },

  async getSupermarket(params: { id?: string; code?: string }): Promise<{
    success: boolean;
    supermarket: Supermarket;
  }> {
    const q = new URLSearchParams();
    if (params.id) q.set('id', params.id);
    if (params.code) q.set('code', params.code);
    return fetchJson(`/api/supermarkets/get?${q.toString()}`);
  },

  async createSupermarket(data: Partial<Supermarket> & { seedProducts?: boolean }): Promise<{ success: boolean; supermarket: Supermarket }> {
    return fetchJson('/api/supermarkets/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSupermarket(id: string, updates: Partial<Supermarket>): Promise<{ success: boolean; supermarket: Supermarket }> {
    return fetchJson('/api/supermarkets/update', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  },

  async deleteSupermarket(id: string): Promise<{ success: boolean; message: string; productsRemoved: number }> {
    return fetchJson('/api/supermarkets/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // Products & Barcodes
  async lookupBarcode(
    supermarket_id: string,
    barcode: string
  ): Promise<{
    success: boolean;
    product: {
      id: string;
      barcode: string;
      name: string;
      brand: string;
      unit: string;
      price: number;
      discount_price: number;
      stock: number;
      category: string;
      description?: string;
      status: string;
    };
  }> {
    return fetchJson(
      `/api/products/barcode?supermarket_id=${encodeURIComponent(
        supermarket_id
      )}&barcode=${encodeURIComponent(barcode)}`
    );
  },

  async searchProducts(
    supermarket_id: string,
    query: string = '',
    category: string = ''
  ): Promise<{ success: boolean; products: Product[] }> {
    const q = new URLSearchParams({
      supermarket_id,
      query,
      category,
    });
    return fetchJson(`/api/products/search?${q.toString()}`);
  },

  async getCategories(supermarket_id?: string): Promise<{ success: boolean; categories: Category[] }> {
    const q = supermarket_id ? `?supermarket_id=${encodeURIComponent(supermarket_id)}` : '';
    return fetchJson(`/api/categories${q}`);
  },

  // Sessions & Cart
  async createSession(params: {
    customer_id: string;
    supermarket_id: string;
    customer_name?: string;
    budget?: number;
  }): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson('/api/sessions/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getSession(sessionId: string): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson(`/api/sessions/current?sessionId=${encodeURIComponent(sessionId)}`);
  },

  async addToCart(
    sessionId: string,
    barcode: string,
    quantity: number = 1
  ): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ sessionId, barcode, quantity }),
    });
  },

  async updateCartItem(
    sessionId: string,
    itemId: string,
    quantity: number
  ): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson('/api/cart/update', {
      method: 'POST',
      body: JSON.stringify({ sessionId, itemId, quantity }),
    });
  },

  async removeCartItem(
    sessionId: string,
    itemId: string
  ): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson('/api/cart/remove', {
      method: 'POST',
      body: JSON.stringify({ sessionId, itemId }),
    });
  },

  async completeSession(sessionId: string): Promise<{ success: boolean; session: ShoppingSession }> {
    return fetchJson('/api/sessions/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async getCustomerHistory(customer_id: string): Promise<{ success: boolean; sessions: ShoppingSession[] }> {
    return fetchJson(`/api/customer/history?customer_id=${encodeURIComponent(customer_id)}`);
  },

  async getCustomerLoyalty(customer_id: string): Promise<{ success: boolean; loyalty: CustomerLoyalty }> {
    return fetchJson(`/api/customer/loyalty?customer_id=${encodeURIComponent(customer_id)}`);
  },

  // Customer Account Management & Auth (linking with email)
  async getCustomerList(): Promise<{ success: boolean; customers: User[] }> {
    return fetchJson('/api/customer/list');
  },

  async customerLogin(email: string, password?: string): Promise<{ success: boolean; user: User }> {
    return fetchJson('/api/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async customerLoginOrCreate(
    email: string,
    name?: string,
    phone?: string,
    password?: string
  ): Promise<{ success: boolean; user: User }> {
    return fetchJson('/api/customer/login-or-create', {
      method: 'POST',
      body: JSON.stringify({ email, name, phone, password }),
    });
  },

  async customerRegister(
    name: string,
    email: string,
    id_number?: string,
    phone?: string,
    password?: string
  ): Promise<{ success: boolean; user: User }> {
    return fetchJson('/api/customer/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, id_number, phone, password }),
    });
  },

  async updateCustomer(
    customer_id: string,
    updates: { name?: string; id_number?: string; phone?: string; password?: string; email?: string }
  ): Promise<{ success: boolean; user: User; message: string }> {
    return fetchJson('/api/customer/update', {
      method: 'POST',
      body: JSON.stringify({ customer_id, ...updates }),
    });
  },

  async addCustomer(data: {
    name: string;
    email: string;
    id_number?: string;
    phone?: string;
    password?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    return fetchJson('/api/customer/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCustomer(customer_id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson('/api/customer/delete', {
      method: 'POST',
      body: JSON.stringify({ customer_id }),
    });
  },

  // Supermarket Admin
  async getAdminDashboard(supermarket_id: string): Promise<{
    success: boolean;
    stats: AdminDashboardStats;
    supermarket: Supermarket;
  }> {
    return fetchJson(`/api/admin/dashboard?supermarket_id=${encodeURIComponent(supermarket_id)}`);
  },

  async getAdminProducts(supermarket_id: string): Promise<{ success: boolean; products: Product[] }> {
    return fetchJson(`/api/admin/products/list?supermarket_id=${encodeURIComponent(supermarket_id)}`);
  },

  async createProduct(
    supermarket_id: string,
    product: Partial<Product>
  ): Promise<{ success: boolean; product: Product }> {
    return fetchJson('/api/admin/products/create', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, ...product }),
    });
  },

  async updateProduct(
    supermarket_id: string,
    product_id: string,
    updates: Partial<Product>
  ): Promise<{ success: boolean; product: Product }> {
    return fetchJson('/api/admin/products/update', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, product_id, ...updates }),
    });
  },

  async deleteProduct(supermarket_id: string, product_id: string): Promise<{ success: boolean }> {
    return fetchJson('/api/admin/products/delete', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, product_id }),
    });
  },

  async importProductsCSV(
    supermarket_id: string,
    csv_content: string,
    action_type: 'create_only' | 'upsert' = 'upsert'
  ): Promise<{
    success: boolean;
    totalRows: number;
    imported: number;
    updated: number;
    errors: { row: number; barcode?: string; message: string }[];
  }> {
    return fetchJson('/api/admin/products/import', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, csv_content, action_type }),
    });
  },

  async getAdminSessions(supermarket_id: string): Promise<{ success: boolean; sessions: ShoppingSession[] }> {
    return fetchJson(`/api/admin/sessions?supermarket_id=${encodeURIComponent(supermarket_id)}`);
  },

  // Store Staff Accounts (Store Admin side - up to 3 logins)
  async getStoreStaff(supermarket_id: string): Promise<{
    success: boolean;
    staff: StoreStaffAccount[];
    slotsUsed: number;
    maxSlots: number;
    slotsAvailable: number;
  }> {
    return fetchJson(`/api/admin/staff?supermarket_id=${encodeURIComponent(supermarket_id)}`);
  },

  async createStoreStaff(
    supermarket_id: string,
    data: {
      name: string;
      username: string;
      email: string;
      password: string;
      staff_title: string;
      permissions?: string[];
    }
  ): Promise<{ success: boolean; staff: StoreStaffAccount }> {
    return fetchJson('/api/admin/staff/create', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, ...data }),
    });
  },

  async updateStoreStaff(
    supermarket_id: string,
    staff_id: string,
    updates: Partial<StoreStaffAccount>
  ): Promise<{ success: boolean; staff: StoreStaffAccount }> {
    return fetchJson('/api/admin/staff/update', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, staff_id, updates }),
    });
  },

  async deleteStoreStaff(
    supermarket_id: string,
    staff_id: string
  ): Promise<{ success: boolean; message: string }> {
    return fetchJson('/api/admin/staff/delete', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, staff_id }),
    });
  },

  async resetSupermarketPassword(
    supermarket_id: string,
    new_password?: string
  ): Promise<{ success: boolean; supermarket: Supermarket; newPassword: string }> {
    return fetchJson('/api/supermarkets/reset-password', {
      method: 'POST',
      body: JSON.stringify({ supermarket_id, new_password }),
    });
  },

  // System
  async resetDemo(): Promise<{ success: boolean; message: string }> {
    return fetchJson('/api/system/demo-reset', { method: 'POST' });
  },

  async getActivityLogs(supermarket_id?: string): Promise<{ success: boolean; logs: ActivityLog[] }> {
    const q = supermarket_id ? `?supermarket_id=${encodeURIComponent(supermarket_id)}` : '';
    return fetchJson(`/api/activity-logs${q}`);
  },
};
