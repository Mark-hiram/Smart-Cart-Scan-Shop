import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer, { Transporter } from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

// ==========================================
// CONFIGURATION & SECRETS
// ==========================================
export const isProduction = process.env.NODE_ENV === 'production';

// Strict check: refuse to start in production without JWT_SECRET
if (isProduction && !process.env.JWT_SECRET) {
  console.error('[FATAL SECURITY ERROR] JWT_SECRET must be defined in production. Server refusing to start.');
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-smartcart-scan-shop-local-only-key-32chars';
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Transporter for nodemailer
let mailTransporter: Transporter | null = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ==========================================
// EMAIL SENDER FOR PASSWORD RECOVERY
// ==========================================
export async function sendSecurityEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ sent: boolean; devEcho?: string }> {
  if (!mailTransporter) {
    if (!isProduction) {
      console.log(`\n======================================================`);
      console.log(`[LOCAL DEV EMAIL] To: ${to}`);
      console.log(`[LOCAL DEV EMAIL] Subject: ${subject}`);
      console.log(`[LOCAL DEV EMAIL] Message:\n${text}`);
      console.log(`======================================================\n`);
      return { sent: true, devEcho: text };
    }
    console.warn(`[SECURITY MAIL] SMTP is not configured. Email to ${to} could not be dispatched.`);
    return { sent: false };
  }

  try {
    await mailTransporter.sendMail({
      from: process.env.MAIL_FROM || 'SmartCart Security <no-reply@smartcart.co.ke>',
      to,
      subject,
      text,
      html: html || text,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[SECURITY MAIL ERROR] Failed to send email to ${to}:`, err);
    return { sent: false };
  }
}

// ==========================================
// BASE32 ENCODING / DECODING (RFC 4648)
// ==========================================
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ==========================================
// AES-256-GCM ENCRYPTION AT REST
// ==========================================
export function encryptAtRest(plainText: string): string {
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptAtRest(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format.');
  }
  const [ivHex, authTagHex, cipherHex] = parts;
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ==========================================
// RFC 6238 TOTP (HMAC-SHA1, 6 Digits, 30s)
// ==========================================
export function generateTotpSecret(): string {
  // 20 random bytes encoded in Base32 = 32 uppercase characters
  return base32Encode(crypto.randomBytes(20));
}

function computeHotp(secretBuf: Buffer, step: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 1000000;
  return code.toString().padStart(6, '0');
}

export function verifyTotpCode(
  secretBase32: string,
  userCode: string,
  lastUsedStep?: number
): { valid: boolean; matchedStep?: number } {
  const cleanCode = userCode.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false };
  }

  const secretBuf = base32Decode(secretBase32);
  const currentStep = Math.floor(Date.now() / 1000 / 30);

  // Check +/- 1 step of drift (30 seconds window)
  for (let offset = -1; offset <= 1; offset++) {
    const step = currentStep + offset;
    // Block replay: step cannot be less than or equal to last used step
    if (typeof lastUsedStep === 'number' && step <= lastUsedStep) {
      continue;
    }
    const expected = computeHotp(secretBuf, step);
    if (expected === cleanCode) {
      return { valid: true, matchedStep: step };
    }
  }

  return { valid: false };
}

// ==========================================
// BACKUP CODES GENERATION & HASHING
// ==========================================
export function generateBackupCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // 8-character hex code, e.g. "A1B2-C3D4"
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;
    rawCodes.push(code);
    hashedCodes.push(bcrypt.hashSync(code, 10));
  }

  return { rawCodes, hashedCodes };
}

export function verifyAndBurnBackupCode(
  rawInput: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashes: string[] } {
  const clean = rawInput.trim().toUpperCase().replace(/\s+/g, '');
  for (let i = 0; i < hashedCodes.length; i++) {
    if (bcrypt.compareSync(clean, hashedCodes[i])) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { valid: true, remainingHashes: remaining };
    }
  }
  return { valid: false, remainingHashes: hashedCodes };
}

// ==========================================
// GOOGLE ID TOKEN VERIFICATION
// ==========================================
const oauthClient = new OAuth2Client();

export async function verifyGoogleIdToken(idToken: string): Promise<
  | { verified: true; email: string; name?: string }
  | { verified: false; error: string }
> {
  if (!idToken) {
    return { verified: false, error: 'Google ID token is required.' };
  }

  // If local development without GOOGLE_CLIENT_ID configured
  if (!GOOGLE_CLIENT_ID) {
    if (isProduction) {
      return {
        verified: false,
        error: 'GOOGLE_CLIENT_ID is not configured on production server.',
      };
    }
    // In local dev, allow simulation if specifically prefixed or test token
    if (idToken.startsWith('dev_token:')) {
      const email = idToken.split(':')[1]?.trim().toLowerCase();
      if (email) {
        return { verified: true, email, name: 'Local Dev Admin' };
      }
    }
    // Attempt standard verification anyway if token format allows
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID || undefined,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return { verified: false, error: 'Empty token payload from Google.' };
    }

    if (!payload.email_verified) {
      return { verified: false, error: 'Google account email is not verified.' };
    }

    const iss = payload.iss || '';
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      return { verified: false, error: 'Invalid Google token issuer.' };
    }

    if (!payload.email) {
      return { verified: false, error: 'Google account missing email address.' };
    }

    return {
      verified: true,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
    };
  } catch (err: any) {
    return { verified: false, error: err.message || 'Google token validation failed.' };
  }
}

// ==========================================
// DEEP RESPONSE SANITIZER (STRIP SECRETS)
// ==========================================
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'admin_password',
  'admin_password_hash',
  'totp_secret',
  'totp_secret_encrypted',
  'backup_codes',
  'backup_code_hashes',
  'totp_backup_codes',
  'totp_backup_code_hashes',
]);

export function deepSanitize(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(deepSanitize);
  }
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    sanitized[key] = deepSanitize(data[key]);
  }
  return sanitized;
}
