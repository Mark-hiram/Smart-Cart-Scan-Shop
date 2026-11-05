import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  QrCode,
  ArrowRight,
  Award,
  Mail,
  Send,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShoppingSession, Supermarket } from '../types.ts';
import { api } from '../api.ts';
import { APP_CONFIG } from '../config.ts';

interface ReceiptSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ShoppingSession | null;
  supermarket: Supermarket | null;
  onFinishShopping: () => void;
  customerEmail?: string;
}

export const ReceiptSummaryModal: React.FC<ReceiptSummaryModalProps> = ({
  isOpen,
  onClose,
  session,
  supermarket,
  onFinishShopping,
  customerEmail,
}) => {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [emailInput, setEmailInput] = useState(customerEmail || '');
  const [showEmailBox, setShowEmailBox] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  if (!isOpen || !session || !supermarket) return null;

  const handleSendReceiptEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setEmailStatus('Please enter a valid email.');
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await api.emailReceipt({
        email: emailInput.trim(),
        receiptCode: session.receipt_code || 'SC' + session.id.slice(-6),
        supermarketName: supermarket.name,
        totalAmount: session.estimated_total,
      });
      if (res.success) {
        setEmailStatus(`Receipt sent to ${emailInput.trim()}!`);
        setTimeout(() => {
          setShowEmailBox(false);
          setEmailStatus(null);
        }, 2500);
      }
    } catch {
      setEmailStatus('Failed to send receipt email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const pointsEarned =
    typeof session.loyalty_points_earned === 'number'
      ? session.loyalty_points_earned
      : Math.floor(session.estimated_total / 100);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const textContent = `
========================================
SMARTCART — DIGITAL SHOPPING SUMMARY
========================================
Supermarket: ${supermarket.name} (${supermarket.supermarket_code})
Location: ${supermarket.location}
Date: ${new Date(session.updated_at).toLocaleString()}
Receipt Code: ${session.receipt_code || 'PENDING-CHECKOUT'}
Customer: ${session.customer_name || 'Customer'}
----------------------------------------
ITEMIZED SCANNED PRODUCTS:
${session.items
  .map(
    (item) =>
      `${item.product_name_snapshot} (${item.unit_snapshot})\n` +
      `  Barcode: ${item.barcode}\n` +
      `  ${item.quantity} × KSh ${item.effective_price} = KSh ${item.subtotal}`
  )
  .join('\n\n')}
----------------------------------------
Items Count:     ${session.items.reduce((acc, it) => acc + it.quantity, 0)}
Subtotal:        ${supermarket.currency} ${session.subtotal.toLocaleString()}
Discount Saved:  ${supermarket.currency} ${session.discount.toLocaleString()}
ESTIMATED TOTAL: ${supermarket.currency} ${session.estimated_total.toLocaleString()}
LOYALTY POINTS:  +${pointsEarned} SmartPoints (KSh ${pointsEarned} value)
========================================
DISCLAIMER:
SmartCart provides an estimated shopping total based on the supermarket's
current product database. Final prices may differ because of promotions,
weighing, price changes, unavailable stock, or checkout adjustments.
========================================
Thank you for shopping at ${supermarket.name}!
(c) ${APP_CONFIG.currentYear} ${APP_CONFIG.appName}. All rights reserved.
${APP_CONFIG.developerCredit}, ${APP_CONFIG.developerPhone}
System Admin Support: ${APP_CONFIG.supportEmail}
========================================
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartCart_${supermarket.supermarket_code}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCompleteWithConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    onFinishShopping();
  };

  const totalQuantity = session.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar with Appealing Supermarket Background */}
        <div className="relative overflow-hidden text-white p-4 flex items-center justify-between bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Supermarket grocery receipt backdrop"
              className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Shopping Summary</h2>
              <p className="text-[10px] text-emerald-200">Official SmartCart Digital Estimation</p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 hover:text-white transition cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadText}
              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 hover:text-white transition cursor-pointer"
              title="Download Receipt Text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Content Printable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100" ref={receiptRef}>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 font-mono text-xs text-slate-800 space-y-4">
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <p className="text-base font-black tracking-widest text-emerald-950 font-['Plus_Jakarta_Sans']">
                SMART<span className="text-amber-500">CART</span>
              </p>
              <p className="font-bold text-sm text-slate-900 uppercase mt-0.5 font-['Plus_Jakarta_Sans']">
                {supermarket.name}
              </p>
              <p className="text-[11px] text-slate-500">{supermarket.branch || 'Main Branch'}</p>
              <p className="text-[10px] text-slate-400">{supermarket.location}</p>
              <p className="text-[10px] text-slate-400 mt-1">Tel: {supermarket.phone}</p>
              <div className="inline-block mt-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                STORE CODE: {supermarket.supermarket_code}
              </div>
            </div>

            {/* Session Info */}
            <div className="text-[11px] text-slate-600 space-y-0.5 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(session.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date(session.updated_at).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{session.customer_name || 'Valued Shopper'}</span>
              </div>
              <div className="flex justify-between">
                <span>Session ID:</span>
                <span className="font-mono text-[10px]">{session.id.slice(-8)}</span>
              </div>
            </div>

            {/* Itemized Scanned Products List */}
            <div>
              <div className="flex justify-between font-bold text-[11px] border-b border-slate-300 pb-1 mb-2 text-slate-700">
                <span>Item &amp; Barcode</span>
                <span>Qty × Price = Subtotal</span>
              </div>

              {session.items.length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-xs italic">
                  No items scanned yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {session.items.map((item) => (
                    <div key={item.id} className="text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span className="truncate pr-2">{item.product_name_snapshot}</span>
                        <span className="shrink-0 font-bold">
                          KSh {item.subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>
                          {item.brand_snapshot} ({item.unit_snapshot}) • {item.barcode}
                        </span>
                        <span>
                          {item.quantity} × KSh {item.effective_price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal, Discount & Estimated Total */}
            <div className="border-t-2 border-dashed border-slate-300 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <span className="font-bold">{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>KSh {session.subtotal.toLocaleString()}</span>
              </div>
              {session.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Special Discounts:</span>
                  <span>- KSh {session.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-300 pt-2 font-['Plus_Jakarta_Sans']">
                <span>ESTIMATED TOTAL:</span>
                <span className="text-emerald-800 font-mono">
                  KSh {session.estimated_total.toLocaleString()}
                </span>
              </div>

              {/* LOYALTY POINTS EARNED ON THIS SESSION */}
              <div className="flex justify-between items-center text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-300/80 p-2.5 rounded-xl mt-2">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>SmartPoints Earned:</span>
                </span>
                <span className="font-mono text-emerald-800 font-extrabold text-xs">
                  +{pointsEarned} pts (KSh {pointsEarned} value)
                </span>
              </div>
            </div>

            {/* Budget status comparison */}
            {session.budget && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Your Budget:</span>
                  <span>KSh {session.budget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Remaining:</span>
                  <span
                    className={
                      session.budget - session.estimated_total >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }
                  >
                    KSh {(session.budget - session.estimated_total).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* MANDATORY DISCLAIMER AS SPECIFIED IN SECTION 26 */}
            <div className="border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-500 leading-relaxed bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
              <div className="flex items-start gap-1.5 font-bold text-amber-900 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>IMPORTANT CASHIER NOTICE:</span>
              </div>
              <p className="italic">
                "SmartCart provides an estimated shopping total based on the supermarket's current
                product database. Final prices may differ because of promotions, weighing, price
                changes, unavailable stock, or checkout adjustments."
              </p>
            </div>

            {/* Barcode representation at bottom of receipt */}
            <div className="text-center pt-2 space-y-1">
              <div className="inline-block tracking-[0.3em] font-mono text-xs text-slate-800 bg-slate-100 px-4 py-1.5 rounded-md border border-slate-300 font-black">
                *{session.receipt_code || 'SC' + session.id.slice(-6)}*
              </div>
              <p className="text-[9px] text-slate-400">Show this summary to cashier at checkout</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
          {session.status === 'ACTIVE' && session.items.length > 0 && (
            <button
              onClick={handleCompleteWithConfetti}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Shopping &amp; Go to Cashier
            </button>
          )}

          {/* Email receipt box */}
          {showEmailBox && (
            <form onSubmit={handleSendReceiptEmail} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Send Receipt to Email</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmailBox(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <span className="animate-pulse">Sending...</span>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
              {emailStatus && (
                <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                  {emailStatus}
                </p>
              )}
            </form>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowEmailBox(!showEmailBox)}
              className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Email digital receipt"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>Email</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadText}
              className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
