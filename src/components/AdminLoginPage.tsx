import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  QrCode,
  Key,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileText,
  Sparkles,
  Home,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../api.ts';
import { Footer } from './Footer.tsx';

declare global {
  interface Window {
    google?: any;
  }
}

export const AdminLoginPage: React.FC = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [config, setConfig] = useState<{
    googleClientId: string;
    adminEmailConfigured: boolean;
    adminEmail?: string;
    isProduction: boolean;
  } | null>(null);

  // Step flow: 1 (Google Auth) -> 2 (2FA Enrollment or Verification) -> 3 (Show Backup Codes on first enrollment)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [requiresEnrollment, setRequiresEnrollment] = useState(false);
  const [twoFactorTicket, setTwoFactorTicket] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Check if session already active
  useEffect(() => {
    let isMounted = true;
    api
      .getAdminMe()
      .then((res) => {
        if (isMounted && res.success && res.admin) {
          window.location.replace('/admin/dashboard');
        }
      })
      .catch(() => {
        // Not authenticated, stay on login page
      })
      .finally(() => {
        if (isMounted) setCheckingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch public config
  useEffect(() => {
    api
      .getPublicConfig()
      .then((res) => {
        if (res.success) {
          setConfig({
            googleClientId: res.googleClientId,
            adminEmailConfigured: res.adminEmailConfigured,
            adminEmail: res.adminEmail,
            isProduction: res.isProduction,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load server public config:', err);
      });
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    if (!config?.googleClientId) return;

    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Keep script in head/body
    };
  }, [config?.googleClientId]);

  // Initialize GIS button when script & client id ready
  useEffect(() => {
    if (!gisLoaded || !config?.googleClientId || !googleBtnRef.current || step !== 1) return;

    try {
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredentialResponse,
      });

      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 320,
      });
    } catch (err) {
      console.error('Error rendering Google Sign-In button:', err);
    }
  }, [gisLoaded, config?.googleClientId, step]);

  const handleGoogleCredentialResponse = async (response: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminGoogleAuth({
        credential: response.credential,
      });
      if (res.success) {
        setTwoFactorTicket(res.twoFactorTicket);
        setAdminEmail(res.email);
        setRequiresEnrollment(res.requiresEnrollment);
        if (res.requiresEnrollment) {
          setQrCodeDataUrl(res.qrCodeDataUrl || '');
          setManualKey(res.manualKey || '');
        }
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminGoogleAuth({
        devBypassToken: 'DEV_LOCAL_BYPASS',
      });
      if (res.success) {
        setTwoFactorTicket(res.twoFactorTicket);
        setAdminEmail(res.email);
        setRequiresEnrollment(res.requiresEnrollment);
        if (res.requiresEnrollment) {
          setQrCodeDataUrl(res.qrCodeDataUrl || '');
          setManualKey(res.manualKey || '');
        }
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Local development verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOrEnrollTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = totpCode.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit Google Authenticator code.');
      return;
    }

    setLoading(true);
    try {
      if (requiresEnrollment) {
        // Step 2a: First-time enrollment
        const res = await api.adminEnroll2FA(twoFactorTicket, cleanCode);
        if (res.success && res.backupCodes) {
          setBackupCodes(res.backupCodes);
          setStep(3); // Show backup codes screen
        }
      } else {
        // Step 2b: Routine verification
        const res = await api.adminVerify2FA(twoFactorTicket, cleanCode);
        if (res.success) {
          window.location.replace('/admin/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification code failed. Please check the time on your authenticator device.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyManualKey = () => {
    if (!manualKey) return;
    navigator.clipboard.writeText(manualKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (!backupCodes.length) return;
    const text = `SMARTCART SYSTEM ADMIN BACKUP CODES\nGenerated: ${new Date().toISOString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKeep these codes secret. Each code can be used only once.';
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleFinishEnrollment = () => {
    window.location.replace('/admin/dashboard');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-slate-400 text-sm font-medium">Verifying administrator security clearance...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(6, 78, 59, 0.94) 0%, rgba(2, 44, 34, 0.97) 50%, rgba(2, 6, 23, 0.99) 100%), url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1920&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Top Banner */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-emerald-800/40 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black text-xl">
            <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>SMARTCART</span>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                System Admin
              </span>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium">Zero-Password Google + TOTP 2FA Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-300/80 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-emerald-500/20 hidden sm:inline-block">
            RFC 6238 TOTP • SHA-256 GCM
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/70 relative">
          {/* Badge Accent */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-400/30 shadow-md flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>
              {step === 1 ? 'Step 1 of 2: Google ID' : step === 2 ? 'Step 2 of 2: Google Authenticator' : 'Step 3: Save Backup Codes'}
            </span>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 mt-2 mb-6">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-12 bg-amber-400' : 'w-6 bg-slate-700'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-12 bg-amber-400' : 'w-6 bg-slate-700'}`} />
            {requiresEnrollment && (
              <div className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-12 bg-amber-400' : 'w-6 bg-slate-700'}`} />
            )}
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* STEP 1: GOOGLE SIGN-IN */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">System Admin Verification</h1>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                  Password login is disabled. System administration access requires verified Google identity followed by hardware/TOTP two-factor authentication.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Designated Admin Account:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {config?.adminEmail ? config.adminEmail : 'ADMIN_EMAIL env variable'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
                  <span>Authentication Protocol:</span>
                  <span className="text-emerald-400 font-semibold">Google Identity Services (OIDC)</span>
                </div>
              </div>

              {/* Google Button Container */}
              <div className="flex flex-col items-center justify-center min-h-[50px] py-2">
                {config?.googleClientId ? (
                  <div ref={googleBtnRef} className="flex justify-center" />
                ) : (
                  <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 p-3 rounded-xl max-w-sm">
                    GOOGLE_CLIENT_ID is not configured in environment variables.
                  </div>
                )}
              </div>

              {/* Dev Simulation Option when GOOGLE_CLIENT_ID is empty */}
              {!config?.isProduction && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleDevBypass}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>[Local Development] Authenticate as configured ADMIN_EMAIL</span>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Simulates verified Google OAuth token using local server configuration.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TOTP 2FA ENROLLMENT OR VERIFICATION */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h1 className="text-xl font-black text-white tracking-tight">
                  {requiresEnrollment ? 'Enroll Google Authenticator' : 'Two-Factor Authentication'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Signed in as <span className="font-mono text-emerald-300 font-bold">{adminEmail}</span>
                </p>
              </div>

              {requiresEnrollment ? (
                // Enrollment mode: Show QR Code & Manual Key
                <div className="space-y-4">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs text-slate-300">
                      Scan this QR code with <strong>Google Authenticator</strong> or your preferred TOTP app:
                    </p>
                    {qrCodeDataUrl ? (
                      <div className="flex justify-center p-2 bg-white rounded-xl max-w-[200px] mx-auto shadow-inner">
                        <img src={qrCodeDataUrl} alt="Google Authenticator QR Code" className="w-44 h-44 object-contain" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 bg-slate-800 rounded-xl mx-auto flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Manual Entry Secret Key:
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-xs font-mono font-bold text-amber-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 select-all tracking-wider">
                          {manualKey}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyManualKey}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Copy Key"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyOrEnrollTotp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Enter 6-Digit Code from Authenticator:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoFocus
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center text-xl font-mono tracking-widest py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-white outline-none transition"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || totpCode.length < 6}
                      className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Activate 2FA &amp; Continue</span>
                    </button>
                  </form>
                </div>
              ) : (
                // Routine verification mode
                <form onSubmit={handleVerifyOrEnrollTotp} className="space-y-4">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed">
                    Open your <strong>Google Authenticator</strong> app and enter the current 6-digit verification code. (You can also enter an 8-character backup recovery code).
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      6-Digit Code or Backup Code:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="e.g. 849201 or a1b2c3d4"
                      className="w-full text-center text-xl font-mono tracking-widest py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-white outline-none transition"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !totpCode.trim()}
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Authorize System Administrator Session</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setTotpCode('');
                      setError(null);
                    }}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition"
                  >
                    Switch Account / Restart Google Sign-In
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 3: BACKUP CODES (SHOWN ONCE ON INITIAL ENROLLMENT) */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg font-black">
                <FileText className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Save Your Backup Codes</h1>
                <p className="text-xs text-amber-300/90 mt-1 max-w-sm mx-auto leading-relaxed">
                  These 8 one-time backup codes can be used to log in if you ever lose access to Google Authenticator. They are stored as one-way hashes and will <strong>never be shown again</strong>.
                </p>
              </div>

              <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 text-left">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm font-bold text-white">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center tracking-wider text-amber-300 select-all">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">8 one-time codes generated</span>
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodes ? 'Copied All!' : 'Copy All Codes'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishEnrollment}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                <span>I Have Stored My Codes Safely — Enter System Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Unified Footer */}
      <Footer />
    </div>
  );
};
