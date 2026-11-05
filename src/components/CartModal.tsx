import React from 'react';
import {
  ShoppingCart,
  X,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRight,
  FileText,
  Camera,
  ShoppingBag,
} from 'lucide-react';
import { ShoppingSession, Supermarket } from '../types.ts';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ShoppingSession | null;
  supermarket: Supermarket | null;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenScanner: () => void;
  onOpenSummary: () => void;
  onOpenBudget: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  session,
  supermarket,
  onUpdateQuantity,
  onRemoveItem,
  onOpenScanner,
  onOpenSummary,
  onOpenBudget,
}) => {
  if (!isOpen || !session || !supermarket) return null;

  const totalQuantity = session.items.reduce((sum, it) => sum + it.quantity, 0);
  const budget = session.budget || 2000;
  const isOverBudget = session.estimated_total > budget;
  const remainingBudget = budget - session.estimated_total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Appealing Supermarket Grocery Image */}
        <div className="relative overflow-hidden text-white p-4 flex items-center justify-between border-b border-emerald-800 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Supermarket grocery cart"
              className="w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">My SmartCart</h2>
              <p className="text-[11px] text-emerald-200">
                Shopping at <strong className="text-amber-300">{supermarket.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-8 h-8 rounded-full bg-emerald-950/60 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Budget Status Bar */}
        <div className="bg-emerald-950/50 p-3 text-xs text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-300">Budget:</span>
            <button
              onClick={onOpenBudget}
              className="font-mono font-bold text-amber-300 hover:underline"
            >
              KSh {budget.toLocaleString()}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-300">Remaining:</span>
            <span
              className={`font-mono font-bold ${
                remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              KSh {remainingBudget.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Budget Over Warning Alert */}
        {isOverBudget && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Your estimated total has exceeded your shopping budget by KSh{' '}
              {Math.abs(remainingBudget).toLocaleString()}.
            </span>
          </div>
        )}

        {/* Cart Item List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {session.items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-800">Your SmartCart is empty</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan barcodes of items in {supermarket.name} as you put them in your trolley.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <Camera className="w-4 h-4" />
                Open Barcode Scanner
              </button>
            </div>
          ) : (
            session.items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-extrabold text-xs text-slate-900 leading-tight">
                      {item.product_name_snapshot}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Brand: <span className="font-semibold text-slate-700">{item.brand_snapshot}</span> • Unit: {item.unit_snapshot}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">Barcode: {item.barcode}</p>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {/* Stepper */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price & Subtotal */}
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.quantity} × KSh {item.effective_price}
                    </div>
                    <div className="font-mono font-black text-sm text-emerald-800">
                      KSh {item.subtotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Shopping Total Card (Section 7) */}
        {session.items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-bold text-slate-800 font-mono">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">KSh {session.subtotal.toLocaleString()}</span>
              </div>
              {session.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">- KSh {session.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-200 pt-2 font-['Plus_Jakarta_Sans']">
                <span>ESTIMATED TOTAL:</span>
                <span className="text-emerald-800 font-mono text-base">
                  KSh {session.estimated_total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Scan More
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenSummary();
                }}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                View Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
