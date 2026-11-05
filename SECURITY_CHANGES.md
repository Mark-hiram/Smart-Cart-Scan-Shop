# SmartCart Security Audit & Hardening Changelog (SECURITY_CHANGES.md)

This document provides a detailed log of all security hardening changes implemented across the SmartCart full-stack application (React 19, Vite, Express, TypeScript).

---

## 1. Credentials & Data Cleanup
- **Deleted `data/smartcart.json`**: Removed all hardcoded test accounts, supermarket passwords, and plaintext customer data from the codebase.
- **Updated `.gitignore`**: Added `data/` to `.gitignore`. Maintained `.env*` exclusion with explicit exception for `!.env.example`.
- **Zero Hardcoded Credentials**: Purged all occurrences of `admin123`, `cust123`, `super123`, `#Mark3407`, and default credentials from both frontend components and server files. Verified with whole-codebase grep.
- **Removed Quick-Fill Test Credentials**: Removed all "Shopper (cust123)" and "SuperAdmin (#Mark3407)" quick-login buttons and default password hints from `CustomerAccountModal.tsx`.

---

## 2. Cryptographic Storage & Sanitization
- **Bcrypt Hash Storage**: All passwords (customers, store administrators, store staff, and supermarket admin passwords) are strictly stored as bcrypt hashes using 10 salt rounds.
- **Automated Startup Migration**: Added `migrateLegacyPlaintextToHashes()` in `src/server/db.ts` to automatically detect legacy plaintext passwords on startup and upgrade them to bcrypt hashes.
- **Response Sanitization Filter**: Built `deepSanitize()` in `src/server/security.ts` and mounted a global Express response wrapper in `server.ts` that recursively intercepts every JSON response and strips:
  - `password`
  - `password_hash`
  - `admin_password`
  - `admin_password_hash`
  - `totp_secret_encrypted`
  - `backup_code_hashes`
- **Password Strength & Randomness**: Enforced a minimum password length of 8 characters. Replaced `Math.random` with Node.js `crypto.randomBytes(6).toString('hex')` for secure temporary password generation.
- **Admin Password Masking**: Updated `SystemAdminPortal.tsx` so stored passwords are never rendered. They appear as `•••••••• (Hidden)` with a "Reset Password" button that generates a temporary key shown once in a dedicated modal.

---

## 3. Authentication & Authorization
- **HTTP-Only, Secure, SameSite Cookie Sessions**:
  - Replaced browser-side storage reliance with signed JWTs in `httpOnly, secure (production), sameSite=lax` cookies.
  - Configured role-specific token lifetimes:
    - **System Admin**: 1 hour (`admin_token`)
    - **Store Admin & Staff**: 12 hours (`auth_token`)
    - **Customers**: 7 days (`auth_token`)
- **Middlewares Implemented**:
  - `requireAuth`: Verifies token signature and extracts authenticated user payload.
  - `requireSystemAdmin`: Rejects non-admin users with 403 Forbidden.
  - `requireStoreScope`: Ensures store managers and floor staff can ONLY access and modify data belonging to their assigned `supermarket_id`. System administrators retain multi-store oversight.
- **Endpoint Protection**:
  - Admin-only: `/api/customer/list`, `/api/customer/add`, `/api/customer/delete`, `/api/customer/reset-password`, `/api/supermarkets/create`, `/api/supermarkets/delete`, `/api/supermarkets/reset-password`, `/api/support/tickets/status`, `/api/system/sql-script`.
  - Store-scoped: `/api/admin/products/*`, `/api/admin/staff/*`, `/api/admin/dashboard`, `/api/admin/sessions`.
  - Customer data isolation: `/api/customer/history`, `/api/customer/loyalty`, and `/api/customer/update` are restricted to the account owner or a system admin.
  - Support tickets: Customers can only query tickets matching their own user ID or email.
  - Audit logs: Scoped by supermarket ID for store admins; unrestricted for system admin.
- **Vulnerability Remediation**:
  - Removed `/api/auth/register` (prevented arbitrary role escalation).
  - Blocked `/api/system/demo-reset` in production with a 403 status.
  - Replaced arbitrary email trust in `/api/customer/google-auth` with server-side Google ID token verification via `google-auth-library`.
  - Added `express-rate-limit` (5 attempts per 15 minutes) across all login, register, and password recovery endpoints.
  - Prevented customers from registering using emails already reserved by admins or staff.
  - Refuses startup in production if `JWT_SECRET` is missing or shorter than 16 characters.

---

## 4. System Admin Authentication (Google OIDC + TOTP 2FA)
- **Zero-Password System Admin**: Bound exclusively to the email in `ADMIN_EMAIL`. System admin password logins are permanently disabled across all endpoints.
- **Step 1 (Google ID Token Verification)**:
  - Client uses Google Identity Services (GIS).
  - Server verifies ID token using `google-auth-library` (`OAuth2Client.verifyIdToken`), validating audience (`GOOGLE_CLIENT_ID`), issuer, expiry, and email verification status.
  - Rejects tokens not matching `ADMIN_EMAIL`.
- **Step 2 (RFC 6238 TOTP 2FA)**:
  - Implemented RFC 6238 with native Node.js `crypto` (HMAC-SHA1, 6 digits, 30s period, $\pm 1$ step drift).
  - **Enrollment**: First login generates a 20-byte Base32 secret, displays a QR code via `qrcode`, and produces 8 one-time backup codes shown once and stored as bcrypt hashes.
  - **Replay Protection**: Stores `last_used_step` in user record and blocks reused time steps.
  - **At-Rest Encryption**: TOTP secrets are encrypted at rest in the database using AES-256-GCM.
  - **Signed 5-Minute Ticket**: Generates a short-lived token between Google sign-in and TOTP completion.
  - **Emergency Reset**: `RESET_ADMIN_2FA=true` env flag clears 2FA enrollment on server boot if hardware is lost.
  - **Portal Redirection**: Dedicated page at `/admin/login`. Old system admin forms automatically redirect to it.
  - **Public Config Endpoint**: `/api/config/public` returns Google Client ID and environment flags.

---

## 5. SMTP Password Reset & Recovery
- **Configured Nodemailer**: Configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`.
- **Anti-Account Enumeration**: Password reset and recovery endpoints return generic success messages so attackers cannot probe for registered emails.
- **Crypto-Secure Codes**: Recovery codes are generated with `crypto.randomInt(100000, 1000000)` and expire after 15 minutes.
- **Audit Log Sanitization**: Password recovery codes and passwords are never written to activity logs.

---

## 6. Render Deployment & Runtime Support
- **Persistent Disk (`DATA_DIR`)**: Database path dynamically resolves to `process.env.DATA_DIR/smartcart.json` if configured, enabling Render persistent disks.
- **Proxy Trust**: Added `app.set('trust proxy', 1)` in `server.ts` for rate limiter and cookie header compatibility.
- **NPM Scripts**:
  - `"build": "vite build"`
  - `"start": "NODE_ENV=production tsx server.ts"`
- **Environment Template**: Updated `.env.example` with empty keys for all deployment parameters.

---

## 7. Real-Time Admin Operations Widget
- Built a live monitoring widget into `SystemAdminPortal.tsx`:
  - Real-time server health (uptime in hours/minutes, Node memory usage in MB, load status).
  - Active shopping sessions counter and live cart list across all supermarket stores.
  - Recent system security audits and error logs.
