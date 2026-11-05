import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import qrcode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.ts';
import {
  isProduction,
  JWT_SECRET,
  ADMIN_EMAIL,
  GOOGLE_CLIENT_ID,
  verifyGoogleIdToken,
  verifyTotpCode,
  generateTotpSecret,
  encryptAtRest,
  decryptAtRest,
  generateBackupCodes,
  verifyAndBurnBackupCode,
  deepSanitize,
} from './src/server/security.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Render deployment: trust reverse proxy for correct IP headers and rate limiting
app.set('trust proxy', 1);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global response sanitizer: strip all password, hash, and 2FA secret fields from all API JSON responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function (body: any) {
    return originalJson.call(this, deepSanitize(body));
  };
  next();
});

// Rate limiter for authentication endpoints: 5 attempts per 15 minutes window
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes for security.',
  },
});

interface AuthUserPayload {
  id: string;
  email?: string;
  username?: string;
  role: string;
  name?: string;
  supermarket_id?: string;
  staff_id?: string;
}

function extractToken(req: Request): string | null {
  if (req.cookies?.admin_token) return req.cookies.admin_token;
  if (req.cookies?.auth_token) return req.cookies.auth_token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Middleware: requireAuth verifies token and attaches user
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No session token found.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    (req as any).user = decoded;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};

// Middleware: requireSystemAdmin verifies token and admin role
const requireSystemAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.admin_token || extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'System Administrator authentication required.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'SYSTEM_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: System Administrator privileges required.',
      });
    }

    (req as any).user = decoded;
    (req as any).adminUser = decoded;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired administrator session.',
    });
  }
};

// Middleware: requireStoreScope ensures a store admin/staff only accesses their own supermarket_id
const requireStoreScope = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    (req as any).user = decoded;

    // System Admins have universal clearance across all stores
    if (decoded.role === 'admin' || decoded.role === 'SYSTEM_ADMIN') {
      return next();
    }

    // Determine target supermarket ID
    const targetStoreId =
      (req.query.supermarket_id as string) ||
      (req.body?.supermarket_id as string) ||
      (req.params?.supermarket_id as string);

    if (targetStoreId && decoded.supermarket_id && decoded.supermarket_id !== targetStoreId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view or manage data for another supermarket store.',
      });
    }

    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session.',
    });
  }
};

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Public client configuration
app.get('/api/config/public', (_req: Request, res: Response) => {
  res.json({
    success: true,
    googleClientId: GOOGLE_CLIENT_ID,
    adminEmailConfigured: !!ADMIN_EMAIL,
    adminEmail: ADMIN_EMAIL ? ADMIN_EMAIL.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '',
    isProduction,
  });
});

// ==========================================
// SYSTEM ADMIN AUTHENTICATION (GOOGLE + 2FA ONLY)
// ==========================================

// Step 1: Google Sign-in Verification
app.post('/api/admin/auth/google', authLimiter, async (req: Request, res: Response) => {
  try {
    const { credential, devBypassToken } = req.body;

    if (!ADMIN_EMAIL) {
      return res.status(500).json({
        success: false,
        message: 'ADMIN_EMAIL is not configured in server environment variables.',
      });
    }

    let verifiedEmail = '';
    let adminName = 'System Administrator';

    if (credential) {
      const verified = await verifyGoogleIdToken(credential);
      if (!verified.verified) {
        return res.status(401).json({ success: false, message: verified.error });
      }
      verifiedEmail = verified.email;
      adminName = verified.name || adminName;
    } else if (!isProduction && devBypassToken === 'DEV_LOCAL_BYPASS') {
      // Local dev simulation only when GOOGLE_CLIENT_ID is unset in development
      verifiedEmail = ADMIN_EMAIL;
      console.log(`[DEV LOCAL BYPASS] System admin bypass activated for: ${ADMIN_EMAIL}`);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Google ID token (credential) is required to authenticate system administrator.',
      });
    }

    if (verifiedEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized Google account (${verifiedEmail}). Access restricted exclusively to configured ADMIN_EMAIL.`,
      });
    }

    const adminUser = db.getUserByEmail(ADMIN_EMAIL);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account was not found. Please verify server initialization.',
      });
    }

    // Create short-lived 5-minute ticket between steps 1 and 2
    const twoFactorTicket = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        step: '2FA_PENDING',
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // If TOTP is NOT enrolled, generate secret and QR code for enrollment
    if (!adminUser.totp_enrolled || !adminUser.totp_secret_encrypted) {
      const plainSecret = generateTotpSecret();
      const encryptedSecret = encryptAtRest(plainSecret);
      adminUser.totp_secret_encrypted = encryptedSecret;

      const otpauthUrl = `otpauth://totp/SmartCart:${encodeURIComponent(adminUser.email)}?secret=${plainSecret}&issuer=SmartCart&algorithm=SHA1&digits=6&period=30`;
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl, { width: 256, margin: 2 });

      return res.json({
        success: true,
        requiresEnrollment: true,
        twoFactorTicket,
        qrCodeDataUrl,
        manualKey: plainSecret,
        email: adminUser.email,
        name: adminUser.name || adminName,
      });
    }

    // Already enrolled: proceed to Step 2 6-digit TOTP verification
    return res.json({
      success: true,
      requiresEnrollment: false,
      twoFactorTicket,
      email: adminUser.email,
      name: adminUser.name || adminName,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Google verification failed.',
    });
  }
});

// Step 2a: First-time 2FA Enrollment with Backup Codes
app.post('/api/admin/auth/2fa/enroll', authLimiter, async (req: Request, res: Response) => {
  try {
    const { twoFactorTicket, code } = req.body;
    if (!twoFactorTicket || !code) {
      return res.status(400).json({
        success: false,
        message: '2FA ticket and 6-digit verification code are required.',
      });
    }

    const decoded = jwt.verify(twoFactorTicket, JWT_SECRET) as any;
    if (decoded.step !== '2FA_PENDING' || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired 2FA activation ticket.',
      });
    }

    const adminUser = db.getUserById(decoded.id);
    if (!adminUser || !adminUser.totp_secret_encrypted) {
      return res.status(400).json({
        success: false,
        message: 'No pending 2FA secret found. Please restart Google authentication.',
      });
    }

    const plainSecret = decryptAtRest(adminUser.totp_secret_encrypted);
    const verifyResult = verifyTotpCode(plainSecret, code);

    if (!verifyResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 6-digit Google Authenticator code. Please check device clock and try again.',
      });
    }

    // Generate 8 one-time backup codes
    const { rawCodes, hashedCodes } = await generateBackupCodes(8);
    adminUser.totp_enrolled = true;
    adminUser.backup_code_hashes = hashedCodes;
    adminUser.last_used_step = verifyResult.matchedStep;

    // Issue 1-hour session cookie
    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
        name: adminUser.name,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    db.log(
      'ADMIN_2FA_ENROLLED',
      `System Administrator activated Google Authenticator 2FA: ${adminUser.email}`,
      undefined,
      adminUser.name
    );

    return res.json({
      success: true,
      message: 'Google Authenticator 2FA enrolled successfully.',
      backupCodes: rawCodes,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
      },
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || '2FA activation failed.',
    });
  }
});

// Step 2b: Routine 2FA Verification (or Backup Code)
app.post('/api/admin/auth/2fa/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { twoFactorTicket, code } = req.body;
    if (!twoFactorTicket || !code) {
      return res.status(400).json({
        success: false,
        message: 'Ticket and verification code required.',
      });
    }

    const decoded = jwt.verify(twoFactorTicket, JWT_SECRET) as any;
    if (decoded.step !== '2FA_PENDING' || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired 2FA ticket. Please sign in again.',
      });
    }

    const adminUser = db.getUserById(decoded.id);
    if (!adminUser || !adminUser.totp_secret_encrypted || !adminUser.totp_enrolled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enrolled for this administrator account.',
      });
    }

    const plainSecret = decryptAtRest(adminUser.totp_secret_encrypted);
    const cleanCode = code.trim().replace(/[-\s]/g, '');

    let verified = false;

    // Check 6-digit TOTP
    if (/^\d{6}$/.test(cleanCode)) {
      const totpCheck = verifyTotpCode(plainSecret, cleanCode, adminUser.last_used_step);
      if (totpCheck.valid) {
        verified = true;
        adminUser.last_used_step = totpCheck.matchedStep;
      }
    }

    // If TOTP failed, check backup codes
    if (!verified && adminUser.backup_code_hashes && adminUser.backup_code_hashes.length > 0) {
      const backupCheck = await verifyAndBurnBackupCode(cleanCode, adminUser.backup_code_hashes);
      if (backupCheck.valid) {
        verified = true;
        adminUser.backup_code_hashes = backupCheck.remainingHashes;
        db.log(
          'ADMIN_BACKUP_CODE_USED',
          `Admin used a one-time backup recovery code: ${adminUser.email}`,
          undefined,
          adminUser.name
        );
      }
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or replayed 2FA code / backup code. Replays are rejected.',
      });
    }

    // Issue 1-hour session cookie
    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
        name: adminUser.name,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    db.log('ADMIN_LOGGED_IN', `Admin authenticated with Google + 2FA: ${adminUser.email}`, undefined, adminUser.name);

    return res.json({
      success: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
      },
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || '2FA verification failed.',
    });
  }
});

// Password login is explicitly blocked for system administrator accounts
app.post('/api/admin/login', authLimiter, (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    message: 'Password login is disabled for System Administrator. Please use Google Sign-In with Google Authenticator 2FA at /admin/login.',
  });
});

app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Administrator logged out successfully.' });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/admin/me', requireSystemAdmin, (req: Request, res: Response) => {
  const tokenUser = (req as any).adminUser as AuthUserPayload;
  const user = db.getUserById(tokenUser.id);
  return res.json({
    success: true,
    admin: {
      id: user ? user.id : tokenUser.id,
      email: user ? user.email : tokenUser.email,
      name: user?.name || tokenUser.name || 'System Administrator',
      role: 'admin',
    },
  });
});

// System Health Widget: Server health, active sessions, and recent error logs
app.get('/api/admin/system-health', requireSystemAdmin, (_req: Request, res: Response) => {
  try {
    const health = db.getSystemHealthAndOverview();
    return res.json({ success: true, health });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// STORE & STAFF AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/auth/store-admin-login', authLimiter, (req: Request, res: Response) => {
  try {
    const { supermarket_code, password, username_or_email } = req.body;
    if (!supermarket_code || !password) {
      return res.status(400).json({
        success: false,
        message: 'Supermarket Code and Password are required.',
      });
    }

    const authResult = db.authenticateStoreAdmin(supermarket_code, password, username_or_email);

    // Issue 12-hour session cookie for store administrator
    const token = jwt.sign(
      {
        id: authResult.user.id,
        email: authResult.user.email,
        role: authResult.user.role,
        name: authResult.user.name,
        supermarket_id: authResult.supermarket.id,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      user: authResult.user,
      supermarket: authResult.supermarket,
      isStaff: authResult.isStaff,
      staffTitle: authResult.staffTitle,
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/staff-login', authLimiter, (req: Request, res: Response) => {
  try {
    const { username_or_email, password } = req.body;
    if (!username_or_email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and Password are required.',
      });
    }
    const result = db.authenticateStaffLogin(username_or_email, password);

    // Issue 12-hour session cookie for staff
    const token = jwt.sign(
      {
        id: result.user.id,
        username: result.user.email,
        role: result.user.role,
        name: result.user.name,
        supermarket_id: result.supermarket.id,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      user: result.user,
      supermarket: result.supermarket,
      staffTitle: result.staffTitle,
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message });
  }
});

// ==========================================
// CUSTOMER AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const user = db.authenticate(email, password || '');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    // Issue 7-day session cookie for customer
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/login', authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const user = db.customerLogin(email, password);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'customer',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/login-or-create', authLimiter, (req: Request, res: Response) => {
  try {
    const { email, name, phone, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const user = db.loginOrCreateCustomer(email, name, phone, password);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'customer',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/register', authLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, id_number, phone, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    const user = db.registerCustomer(name, email, id_number, phone, password);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'customer',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Customer Google Auth with real server-side verification
app.post('/api/customer/google-auth', authLimiter, async (req: Request, res: Response) => {
  try {
    const { credential, email, name } = req.body;

    let verifiedEmail = '';
    let verifiedName = name || '';

    if (credential) {
      const verified = await verifyGoogleIdToken(credential);
      if (!verified.verified) {
        return res.status(401).json({ success: false, message: verified.error });
      }
      verifiedEmail = verified.email;
      verifiedName = verified.name || verifiedName;
    } else if (!isProduction && email) {
      // Allow dev test email only in non-production
      verifiedEmail = email.trim().toLowerCase();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Real Google ID token is required for authentication.',
      });
    }

    const user = db.loginOrCreateCustomer(verifiedEmail, verifiedName);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'customer',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      user,
      message: `Signed in with verified Google account: ${user.email}`,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Password recovery endpoints
app.post('/api/auth/customer/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const result = await db.forgotPasswordCustomer(email);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/customer/send-recovery-code', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const result = await db.sendRecoveryCode(email);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/customer/verify-recovery-code', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit recovery code are required.' });
    }
    const result = await db.verifyRecoveryCodeAndResetPassword(email, code, newPassword);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/store-admin/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { supermarket_code, staff_username_or_email } = req.body;
    if (!supermarket_code) {
      return res.status(400).json({ success: false, message: 'Supermarket Code is required.' });
    }
    const result = await db.forgotPasswordStoreAdmin(supermarket_code, staff_username_or_email);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// SUPERMARKETS MANAGEMENT ENDPOINTS
// ==========================================
app.get('/api/supermarkets/list', (_req: Request, res: Response) => {
  try {
    const list = db.getSupermarkets();
    return res.json({ success: true, supermarkets: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/supermarkets/get', (req: Request, res: Response) => {
  try {
    const { id, code } = req.query;
    let supermarket = null;
    if (id) {
      supermarket = db.getSupermarketById(id as string);
    } else if (code) {
      supermarket = db.getSupermarketByCode(code as string);
    }
    if (!supermarket) {
      return res.status(404).json({ success: false, message: 'Supermarket not found.' });
    }
    return res.json({ success: true, supermarket });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/supermarkets/create', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const sm = db.createSupermarket(req.body);
    return res.json({ success: true, supermarket: sm });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/supermarkets/update', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Supermarket ID is required.' });
    const sm = db.updateSupermarket(id, updates);
    return res.json({ success: true, supermarket: sm });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/supermarkets/delete', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Supermarket ID is required.' });
    const result = db.deleteSupermarket(id);
    return res.json({
      success: true,
      message: `Supermarket "${result.deleted.name}" deleted successfully.`,
      ...result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/supermarkets/reset-password', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { supermarket_id, new_password } = req.body;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID is required.' });
    }
    const result = db.resetSupermarketPassword(supermarket_id, new_password);
    return res.json({
      success: true,
      supermarket: result.supermarket,
      newPassword: result.newPassword,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// STORE-SCOPED MANAGEMENT (STAFF, DASHBOARD, PRODUCTS)
// ==========================================
app.get('/api/admin/staff', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id } = req.query;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID is required.' });
    }
    const staff = db.getStoreStaff(supermarket_id as string);
    return res.json({
      success: true,
      staff,
      slotsUsed: staff.length,
      maxSlots: 3,
      slotsAvailable: Math.max(0, 3 - staff.length),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/staff/create', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, name, username, email, password, staff_title, permissions } = req.body;
    if (!supermarket_id || !name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Supermarket ID, name, username, and password are required.',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Staff password must be at least 8 characters long.',
      });
    }
    const newStaff = db.createStoreStaff(supermarket_id, {
      name,
      username,
      email,
      password,
      staff_title: staff_title || 'Floor Supervisor',
      permissions,
    });
    return res.json({ success: true, staff: newStaff });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/staff/update', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, staff_id, updates } = req.body;
    if (!supermarket_id || !staff_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID and staff ID required.' });
    }
    const updated = db.updateStoreStaff(supermarket_id, staff_id, updates || {});
    return res.json({ success: true, staff: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/staff/delete', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, staff_id } = req.body;
    if (!supermarket_id || !staff_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID and staff ID required.' });
    }
    db.deleteStoreStaff(supermarket_id, staff_id);
    return res.json({ success: true, message: 'Staff account deleted successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/dashboard', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id } = req.query;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID required.' });
    }
    const stats = db.getAdminDashboardStats(supermarket_id as string);
    const sm = db.getSupermarketById(supermarket_id as string);
    return res.json({ success: true, stats, supermarket: sm });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/products/list', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id } = req.query;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID required.' });
    }
    const products = db.getProductsForSupermarket(supermarket_id as string);
    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/products/create', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, ...productData } = req.body;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID required.' });
    }
    const product = db.createProduct(supermarket_id, productData);
    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/products/update', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, product_id, ...updates } = req.body;
    if (!supermarket_id || !product_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID and product ID required.' });
    }
    const product = db.updateProduct(supermarket_id, product_id, updates);
    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/products/delete', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, product_id } = req.body;
    if (!supermarket_id || !product_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID and product ID required.' });
    }
    db.deleteProduct(supermarket_id, product_id);
    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/products/import', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, csv_content, action_type } = req.body;
    if (!supermarket_id || !csv_content) {
      return res.status(400).json({ success: false, message: 'Supermarket ID and CSV content required.' });
    }
    const result = db.importProductsCSV(supermarket_id, csv_content, action_type || 'upsert');
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/sessions', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id } = req.query;
    if (!supermarket_id) {
      return res.status(400).json({ success: false, message: 'Supermarket ID required.' });
    }
    const sessions = db.getAdminSessions(supermarket_id as string);
    return res.json({ success: true, sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/categories/create', requireStoreScope, (req: Request, res: Response) => {
  try {
    const { supermarket_id, name } = req.body;
    if (!supermarket_id || !name) {
      return res.status(400).json({ success: false, message: 'Supermarket and name required' });
    }
    const cat = db.addCategory(supermarket_id, name);
    return res.json({ success: true, category: cat });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// BARCODE LOOKUP & SEARCH
// ==========================================
app.get('/api/products/barcode', (req: Request, res: Response) => {
  try {
    const { supermarket_id, barcode } = req.query;
    if (!supermarket_id || !barcode) {
      return res.status(400).json({
        success: false,
        message: 'Both supermarket_id and barcode are required.',
      });
    }

    const sm = db.getSupermarketById(supermarket_id as string);
    if (!sm) {
      return res.status(404).json({
        success: false,
        message: 'Invalid supermarket. Please reconnect.',
      });
    }

    const product = db.getProductByBarcode(supermarket_id as string, barcode as string);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in this supermarket.',
      });
    }

    return res.json({
      success: true,
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.product_name,
        product_name: product.product_name,
        brand: product.brand,
        unit: product.unit,
        price: product.selling_price,
        selling_price: product.selling_price,
        discount_price: product.discount_price,
        stock: product.stock_quantity,
        stock_quantity: product.stock_quantity,
        category: product.category,
        description: product.description,
        status: product.status,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/products/search', (req: Request, res: Response) => {
  try {
    const { supermarket_id, query, category } = req.query;
    if (!supermarket_id) {
      return res.status(400).json({
        success: false,
        message: 'supermarket_id is required.',
      });
    }

    const products = db.searchProducts(
      supermarket_id as string,
      (query as string) || '',
      (category as string) || ''
    );

    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/categories', (req: Request, res: Response) => {
  try {
    const { supermarket_id } = req.query;
    const categories = db.getCategories(supermarket_id as string);
    return res.json({ success: true, categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SHOPPING SESSIONS & CART ENDPOINTS
// ==========================================
app.post('/api/sessions/create', (req: Request, res: Response) => {
  try {
    const { customer_id, supermarket_id, customer_name, budget } = req.body;
    if (!customer_id || !supermarket_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and Supermarket ID are required.',
      });
    }

    const session = db.getOrCreateActiveSession(
      customer_id,
      supermarket_id,
      customer_name || 'Valued Shopper',
      budget ? Number(budget) : undefined
    );

    return res.json({ success: true, session });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/sessions/current', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required.' });
    }
    const session = db.getSessionById(sessionId as string);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    return res.json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/cart/add', (req: Request, res: Response) => {
  try {
    const { sessionId, barcode, quantity } = req.body;
    if (!sessionId || !barcode) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and barcode are required.',
      });
    }

    const result = db.addItemToCart(sessionId, barcode, quantity ? Number(quantity) : 1);
    return res.json({ success: true, session: result.session, item: result.item });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/cart/update', (req: Request, res: Response) => {
  try {
    const { sessionId, itemId, quantity } = req.body;
    if (!sessionId || !itemId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, item ID and quantity required.',
      });
    }

    const updatedSession = db.updateCartItem(sessionId, itemId, Number(quantity));
    return res.json({ success: true, session: updatedSession });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/cart/remove', (req: Request, res: Response) => {
  try {
    const { sessionId, itemId } = req.body;
    if (!sessionId || !itemId) {
      return res.status(400).json({ success: false, message: 'Session ID and item ID required.' });
    }
    const updatedSession = db.removeCartItem(sessionId, itemId);
    return res.json({ success: true, session: updatedSession });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/sessions/complete', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required.' });
    }
    const completed = db.completeShoppingSession(sessionId);
    return res.json({ success: true, session: completed });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Customer history and loyalty: guest customers get default empty state; registered customers require auth
app.get('/api/customer/history', (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID required.' });
    }

    // Guest customers have no saved account history
    if (customer_id === 'usr_guest') {
      return res.json({ success: true, sessions: [] });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No session token found.',
      });
    }

    let user: AuthUserPayload;
    try {
      user = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token.',
      });
    }

    if (user.role !== 'admin' && user.role !== 'SYSTEM_ADMIN' && user.id !== customer_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own shopping history.',
      });
    }

    const sessions = db.getCustomerSessions(customer_id as string);
    return res.json({ success: true, sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/customer/loyalty', (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID required.' });
    }

    // Guest customers get baseline 0-point Bronze guest loyalty without auth requirement
    if (customer_id === 'usr_guest') {
      const guestLoyalty = {
        customer_id: 'usr_guest',
        total_points: 0,
        points_value_ksh: 0,
        tier: 'Bronze',
        tier_progress_percent: 0,
        next_tier_name: 'Silver',
        points_to_next_tier: 500,
        history: [],
      };
      return res.json({ success: true, loyalty: guestLoyalty });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No session token found.',
      });
    }

    let user: AuthUserPayload;
    try {
      user = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token.',
      });
    }

    if (user.role !== 'admin' && user.role !== 'SYSTEM_ADMIN' && user.id !== customer_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own loyalty profile.',
      });
    }

    const loyalty = db.getCustomerLoyalty(customer_id as string);
    return res.json({ success: true, loyalty });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Profile update protected: owner or system admin
app.post('/api/customer/update', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthUserPayload;
    const { customer_id, name, id_number, phone, password, email } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    if (user.role !== 'admin' && user.role !== 'SYSTEM_ADMIN' && user.id !== customer_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own customer account.',
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const updatedUser = db.updateCustomer(customer_id, { name, id_number, phone, password, email });
    return res.json({ success: true, user: updatedUser, message: 'Customer profile updated successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Admin-only customer management
app.get('/api/customer/list', requireSystemAdmin, (_req: Request, res: Response) => {
  try {
    const customers = db.getCustomers();
    return res.json({ success: true, customers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/add', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { name, email, id_number, phone, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }
    const newCustomer = db.addCustomer({ name, email, id_number, phone, password });
    return res.json({ success: true, user: newCustomer, message: 'Customer added successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/delete', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }
    db.deleteCustomer(customer_id);
    return res.json({ success: true, message: 'Customer account deleted successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/customer/reset-password', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }
    const result = db.resetCustomerPassword(customer_id);
    return res.json({
      success: true,
      newPassword: result.newPassword,
      user: result.user,
      message: 'Temporary password generated.',
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/customer/by-email', (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const customer = db.getCustomerByEmail(email as string);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }
    return res.json({ success: true, customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Digital Receipt via Email
app.post('/api/customer/email-receipt', (req: Request, res: Response) => {
  try {
    const { email, receiptCode, supermarketName, totalAmount } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid recipient email address is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    db.log(
      'RECEIPT_EMAILED',
      `Sent digital shopping receipt [${receiptCode || 'REC'}] (${supermarketName || 'Supermarket'}, Total: KSh ${totalAmount || 0}) to email: ${cleanEmail}`
    );
    return res.json({
      success: true,
      message: `Digital receipt successfully emailed to ${cleanEmail}!`,
      deliveryDetails: {
        email: cleanEmail,
        timestamp: new Date().toISOString(),
        receiptCode: receiptCode || 'PENDING',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SUPPORT TICKETS (HELP CENTER)
// ==========================================
app.get('/api/support/tickets', (req: Request, res: Response) => {
  try {
    const token = extractToken(req);
    if (!token) {
      // Unauthenticated guests have no previous ticket history
      return res.json({ success: true, tickets: [] });
    }

    let user: AuthUserPayload;
    try {
      user = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    } catch {
      return res.json({ success: true, tickets: [] });
    }

    let customer_id = req.query.customer_id as string | undefined;
    let customer_email = req.query.customer_email as string | undefined;

    // Regular customers can only query their own tickets
    if (user.role !== 'admin' && user.role !== 'SYSTEM_ADMIN') {
      customer_id = user.id;
      customer_email = user.email;
    }

    const tickets = db.getSupportTickets({ customer_id, customer_email });
    return res.json({ success: true, tickets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/support/tickets/create', (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      supermarket_id,
      supermarket_name,
      subject,
      category,
      priority,
      initial_message,
    } = req.body;

    if (!customer_email || !subject || !initial_message) {
      return res.status(400).json({
        success: false,
        message: 'Customer email, subject, and message description are required.',
      });
    }

    const ticket = db.createSupportTicket({
      customer_id: customer_id || 'usr_guest',
      customer_name: customer_name || 'Customer',
      customer_email,
      customer_phone,
      supermarket_id,
      supermarket_name,
      subject,
      category: category || 'TECHNICAL_ISSUE',
      priority: priority || 'NORMAL',
      initial_message,
    });

    return res.json({ success: true, ticket });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/support/tickets/message', requireAuth, (req: Request, res: Response) => {
  try {
    const { ticket_id, message, sender, sender_name, sender_email } = req.body;
    if (!ticket_id || !message) {
      return res.status(400).json({ success: false, message: 'Ticket ID and message are required.' });
    }

    const updatedTicket = db.addTicketMessage(
      ticket_id,
      message,
      sender || 'CUSTOMER',
      sender_name || 'User',
      sender_email || ''
    );

    return res.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/support/tickets/status', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { ticket_id, status } = req.body;
    if (!ticket_id || !status) {
      return res.status(400).json({ success: false, message: 'Ticket ID and status are required.' });
    }

    const updated = db.updateTicketStatus(ticket_id, status);
    return res.json({ success: true, ticket: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// ACTIVITY LOGS & SYSTEM SCRIPTS
// ==========================================
app.get('/api/activity-logs', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthUserPayload;
    const { supermarket_id } = req.query;

    if (user.role !== 'admin' && user.role !== 'SYSTEM_ADMIN') {
      if (!supermarket_id || (user.supermarket_id && user.supermarket_id !== supermarket_id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view activity logs for your assigned supermarket store.',
        });
      }
    }

    const logs = db.getActivityLogs(supermarket_id as string);
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/system/sql-script', requireSystemAdmin, (_req: Request, res: Response) => {
  try {
    const sqlPath = path.resolve(process.cwd(), 'database', 'smartcart.sql');
    if (fs.existsSync(sqlPath)) {
      const content = fs.readFileSync(sqlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="smartcart.sql"');
      return res.send(content);
    }
    return res.status(404).send('-- smartcart.sql not found');
  } catch (error: any) {
    return res.status(500).send(error.message);
  }
});

app.post('/api/system/demo-reset', (req: Request, res: Response) => {
  if (isProduction) {
    return res.status(403).json({
      success: false,
      message: 'Demo reset is strictly disabled in production environments for safety.',
    });
  }

  try {
    db.resetToDemo();
    return res.json({ success: true, message: 'Demo data restored successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// VITE MIDDLEWARE / STATIC ASSETS
// ==========================================
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });

    // Safely handle @vite/client in Cloud Run iframe proxy
    app.get('/@vite/client', async (req: Request, res: Response, next) => {
      try {
        const transformed = await vite.transformRequest(req.url);
        if (transformed && transformed.code) {
          const patched = transformed.code
            .replace('reject(new Error("WebSocket closed without opened."))', 'resolve()')
            .replace('reject(/* @__PURE__ */ new Error("WebSocket closed without opened."))', 'resolve()');
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          return res.send(patched);
        }
      } catch {
        // fallback
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartCart Server] Secure listening on http://0.0.0.0:${PORT} (Node env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
