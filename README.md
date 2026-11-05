# SmartCart Scan & Shop — Enterprise Hardened System

SmartCart is a full-stack self-checkout, multi-tenant supermarket operations platform built with React, Vite, Express, and TypeScript. Customers can scan barcodes on their phones to track carts, apply budgets, and check out seamlessly, while supermarket store managers and system administrators have isolated, role-governed management dashboards.

---

## Security Architecture

The platform has been audited and hardened according to enterprise full-stack standards:

1. **Zero Hardcoded Credentials**:
   - No fallback emails or passwords exist in source code or data files.
   - Default test accounts have been completely removed from client and server.
   - Data files (`data/`) and environment files (`.env*`) are excluded via `.gitignore`.

2. **One-Way Password Storage & Sanitization**:
   - Every password (customers, store admins, and floor staff) is stored strictly as a salted `bcrypt` hash (10 salt rounds).
   - Legacy plaintext passwords are automatically migrated to bcrypt hashes on startup.
   - Passwords and temporary keys require a minimum of 8 characters.
   - All sensitive security fields (`password`, `password_hash`, `admin_password`, `totp_secret_encrypted`, `backup_code_hashes`) are recursively stripped from all JSON responses via a global response sanitization filter.
   - Admin dashboards never display stored passwords; they display `•••••••• (Hidden)` with a "Reset Password" button that generates a temporary key shown once.

3. **HTTP-Only Cookie Sessions & Scoped Authorization**:
   - Successful logins issue signed JWT tokens in `httpOnly`, `secure` (in production), and `sameSite: 'lax'` cookies.
   - Session durations:
     - **System Administrator**: 1 hour (`admin_token`)
     - **Store Admin & Staff**: 12 hours (`auth_token`)
     - **Shoppers / Customers**: 7 days (`auth_token`)
   - Role-based middleware:
     - `requireAuth`: Verifies active session token.
     - `requireSystemAdmin`: Strictly restricts root management, tenant creation, and system endpoints.
     - `requireStoreScope`: Verifies that store managers and staff can ONLY access and modify data for their assigned `supermarket_id`.
     - Customer data isolation: Customers can only query their own session history, loyalty balances, and profile details.
   - Express rate limiting (`express-rate-limit`) enforces 5 attempts per 15-minute window on all authentication and recovery endpoints.
   - Production safety: The server verifies `JWT_SECRET` on startup and refuses to start if missing in production.

4. **Zero-Password System Administrator Login (Google OIDC + RFC 6238 TOTP 2FA)**:
   - The system administrator is bound exclusively to the account whose email matches the `ADMIN_EMAIL` environment variable. Password login is permanently disabled for system admin roles.
   - **Step 1 (Google OIDC)**: Sign in with Google verifies token authenticity, audience (`GOOGLE_CLIENT_ID`), issuer, expiry, and email verification.
   - **Step 2 (Hardware/TOTP 2FA)**: RFC 6238 HMAC-SHA1 6-digit TOTP (30s window, $\pm 1$ step drift).
     - First-time enrollment renders a QR code (`qrcode`) and manual Base32 key, followed by generating 8 one-time emergency backup recovery codes (stored as bcrypt hashes).
     - Subsequent logins require the authenticator code or backup code. Replays are rejected by storing the `last_used_step`.
     - Secret is encrypted at rest using AES-256-GCM.
     - Emergency recovery flag: Setting `RESET_ADMIN_2FA=true` clears 2FA enrollment on startup if administrator hardware is ever lost.

5. **SMTP Password Reset & Protection Against Account Enumeration**:
   - Configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` using Nodemailer.
   - Forgot-password and recovery endpoints always return generic responses so external attackers cannot enumerate registered emails.
   - Temporary recovery codes use `crypto.randomInt` and expire in 15 minutes.

---

## Local Development

### 1. Prerequisites
- Node.js 20+ installed
- npm or yarn

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your development settings:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-local-dev-jwt-secret-at-least-32-chars-long
ADMIN_EMAIL=admin@yourdomain.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
DATA_DIR=data
RESET_ADMIN_2FA=false
```

*(Note: During local development when `GOOGLE_CLIENT_ID` is empty, the login page offers a local development bypass button to test the Google + 2FA workflow seamlessly).*

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 5. Type-Check and Build
```bash
npm run lint     # Runs tsc --noEmit
npm run build    # Compiles production assets via vite build
```

---

## Render Deployment Guide

Follow these steps to deploy SmartCart to Render:

### 1. Create a Web Service
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** and select **Web Service**.
2. Connect your Git repository containing the SmartCart codebase.
3. Configure service details:
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter or Standard

### 2. Configure Environment Variables on Render
Under the **Environment** tab of your Render service, add the following variables:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode and strict security checks |
| `JWT_SECRET` | *(64-char random string)* | Required. Refuses server boot if missing or weak |
| `ADMIN_EMAIL` | `superadmin@yourdomain.com` | Google account email authorized for system admin login |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | OAuth 2.0 Web Client ID from Google Cloud Console |
| `DATA_DIR` | `/var/data` | Path to persistent storage mount |
| `SMTP_HOST` | `smtp.mailgun.org` | SMTP host for sending recovery emails |
| `SMTP_PORT` | `587` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | `postmaster@...` | SMTP username |
| `SMTP_PASS` | `...` | SMTP password |
| `MAIL_FROM` | `SmartCart Security <no-reply@...>` | From address on security emails |
| `RESET_ADMIN_2FA` | `false` | Set to `true` temporarily only if 2FA needs reset |

### 3. Attach a Persistent Disk (For JSON Database)
Because Render's container filesystem is ephemeral by default:
1. In your Web Service settings on Render, navigate to **Disks**.
2. Click **Add Disk**:
   - **Name**: `smartcart-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (or larger depending on product catalog size)
3. Ensure the environment variable `DATA_DIR` is set to `/var/data`. SmartCart will automatically store and persist `smartcart.json` on the disk.

### 4. Reverse Proxy Setup
Render runs behind an AWS/Cloudflare reverse proxy. SmartCart already includes `app.set('trust proxy', 1)` in `server.ts` so that client IPs are correctly identified for rate limiting and secure cookies.

---

## Security Audit & Documentation
For a complete itemized list of all security enhancements, cryptographic algorithms, and verification steps, refer to `SECURITY_CHANGES.md`.
