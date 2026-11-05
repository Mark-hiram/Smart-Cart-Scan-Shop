import React, { useState } from 'react';
import { Wallet, Check, X, AlertTriangle, TrendingUp } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currentTotal: number;
  onSaveBudget: (budget: number) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  currentTotal,
  onSaveBudget,
}) => {
  const [budgetInput, setBudgetInput] = useState(currentBudget.toString());

  if (!isOpen) return null;

  const presets = [1000, 2000, 3000, 5000, 10000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      onSaveBudget(val);
      onClose();
    }
  };

  const parsed = parseFloat(budgetInput) || 0;
  const remaining = parsed - currentTotal;
  const isOver = currentTotal > parsed;
  const percentUsed = parsed > 0 ? Math.min(100, Math.round((currentTotal / parsed) * 100)) : 0;
  const isNearLimit = parsed > 0 && currentTotal >= parsed * 0.9 && !isOver;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Appealing Supermarket Background */}
        <div className="relative overflow-hidden text-white p-4 flex items-center justify-between bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Supermarket grocery store"
              className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Shopping Budget</h3>
              <p className="text-[11px] text-emerald-200">Track spending in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-7 h-7 rounded-full bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Spending Limit (KSh)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                KSh
              </span>
              <input
                type="number"
                min="100"
                step="50"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                autoFocus
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
              Quick Budget Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetInput(amt.toString())}
                  className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition ${
                    parsed === amt
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  KSh {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Utilization Visual Progress Preview */}
          <div className={`p-4 rounded-2xl border space-y-3 transition ${
            isOver
              ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-400/40'
              : isNearLimit
              ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/40 animate-pulse'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Budget Utilization
              </span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border transition ${
                  isOver
                    ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                    : isNearLimit
                    ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse font-extrabold shadow-xs'
                    : percentUsed >= 80
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {parsed > 0
                  ? isOver
                    ? `${Math.round((currentTotal / parsed) * 100)}% OVER`
                    : isNearLimit
                    ? `⚠️ ${percentUsed}% (Near Limit)`
                    : `${percentUsed}% Utilized`
                  : '0%'}
              </span>
            </div>

            {/* Enhanced Visual Progress Bar with Thresholds & Pulse */}
            <div className="space-y-1.5">
              <div className="relative w-full bg-slate-200/90 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300/80 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                    isOver
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 animate-pulse'
                      : isNearLimit
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 animate-pulse'
                      : percentUsed >= 80
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-gradient-to-r from-teal-500 to-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, parsed > 0 ? (currentTotal / parsed) * 100 : 0)}%` }}
                />
              </div>

              {/* Threshold tick labels */}
              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span className={isNearLimit || isOver ? 'text-amber-600 font-bold' : ''}>90%</span>
                <span className={isOver ? 'text-rose-600 font-bold' : ''}>100%</span>
              </div>
            </div>

            {/* Spent vs Total Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cart Total (Spent)
                </span>
                <span className="text-sm font-mono font-black text-slate-900 mt-0.5 block">
                  KSh {currentTotal.toLocaleString()}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {remaining >= 0 ? 'Remaining Balance' : 'Over Limit By'}
                </span>
                <span
                  className={`text-sm font-mono font-black mt-0.5 block ${
                    remaining >= 0 ? (isNearLimit ? 'text-amber-600' : 'text-emerald-700') : 'text-rose-600'
                  }`}
                >
                  KSh {Math.abs(remaining).toLocaleString()}
                </span>
              </div>
            </div>

            {/* 90% Threshold Warning Banner */}
            {isNearLimit && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] font-medium flex items-center gap-2 animate-pulse shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>90%+ Warning:</strong> Cart total is at <strong>{percentUsed}%</strong> of this budget (exceeds 90% threshold). Only <strong>KSh {remaining.toLocaleString()}</strong> remaining!
                </span>
              </div>
            )}

            {isOver && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-medium flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Current total exceeds this budget by <strong>KSh {(currentTotal - parsed).toLocaleString()}</strong>.
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            Save Shopping Budget
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};
