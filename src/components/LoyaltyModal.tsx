import React from 'react';
import {
  Award,
  Sparkles,
  X,
  TrendingUp,
  Gift,
  CheckCircle2,
  Calendar,
  Store,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Percent,
} from 'lucide-react';
import { CustomerLoyalty } from '../types.ts';

interface LoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loyalty: CustomerLoyalty | null;
  customerName: string;
}

export const LoyaltyModal: React.FC<LoyaltyModalProps> = ({
  isOpen,
  onClose,
  loyalty,
  customerName,
}) => {
  if (!isOpen) return null;

  const totalPoints = loyalty?.total_points || 0;
  const tier = loyalty?.tier || 'Bronze';
  const pointsValue = loyalty?.points_value_ksh || totalPoints;
  const progressPercent = loyalty?.tier_progress_percent || 0;
  const nextTierName = loyalty?.next_tier_name;
  const pointsToNext = loyalty?.points_to_next_tier || 0;

  const tierColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    Bronze: {
      bg: 'bg-amber-900/10 text-amber-800',
      text: 'text-amber-800',
      border: 'border-amber-700/30',
      glow: 'from-amber-700/20 to-amber-900/10',
    },
    Silver: {
      bg: 'bg-slate-200 text-slate-800',
      text: 'text-slate-700',
      border: 'border-slate-300',
      glow: 'from-slate-400/20 to-slate-600/10',
    },
    Gold: {
      bg: 'bg-amber-100 text-amber-900',
      text: 'text-amber-700',
      border: 'border-amber-400',
      glow: 'from-amber-400/30 to-amber-600/10',
    },
    Platinum: {
      bg: 'bg-purple-100 text-purple-900',
      text: 'text-purple-700',
      border: 'border-purple-400',
      glow: 'from-purple-500/20 to-purple-800/10',
    },
  };

  const currentTierStyle = tierColors[tier] || tierColors.Bronze;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Banner with Appealing Supermarket Grocery Backdrop */}
        <div className="relative overflow-hidden text-white p-5 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Supermarket grocery store"
              className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg">
                <Award className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  SmartPoints Rewards
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                </h2>
                <p className="text-[11px] text-emerald-300">
                  {customerName}&apos;s Supermarket Loyalty Account
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Points Highlights Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
                  Available Points Balance
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black font-mono tracking-tight text-white">
                    {totalPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    SmartPoints
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
                  Cash Value
                </span>
                <span className="text-lg font-black font-mono text-amber-400">
                  KSh {pointsValue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Member Tier Progress */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {tier} Member
                </span>
                {nextTierName ? (
                  <span className="text-[11px] text-emerald-200">
                    <strong className="text-amber-300">{pointsToNext} pts</strong> to {nextTierName}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-300 font-bold">Top Tier Achieved!</span>
                )}
              </div>

              <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* How It Works Formula */}
          <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
              <Gift className="w-4 h-4 text-amber-600" />
              <span>How Points Are Calculated</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Earning Rate</span>
                <span className="font-extrabold text-emerald-900 block mt-0.5">
                  1 Point per KSh 100 spent
                </span>
                <span className="text-[10px] text-slate-400">On every completed trip</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Redemption Value</span>
                <span className="font-extrabold text-amber-900 block mt-0.5">
                  1 Point = KSh 1.00
                </span>
                <span className="text-[10px] text-slate-400">Discount at checkout</span>
              </div>
            </div>
          </div>

          {/* Points History by Session */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>Points Earned per Shopping Session</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                {loyalty?.completed_sessions_count || 0} Trips
              </span>
            </div>

            {!loyalty || loyalty.history.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-1.5">
                <Award className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No completed shopping trips yet</p>
                <p className="text-[11px] text-slate-400">
                  Scan items and tap &ldquo;Complete Shopping&rdquo; to earn your first SmartPoints!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {loyalty.history.map((tx) => (
                  <div
                    key={tx.session_id}
                    className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-300 transition"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {tx.supermarket_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(tx.date).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{tx.receipt_code || 'SC-RECEIPT'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Paid: <strong className="font-mono text-slate-800">KSh {tx.session_total.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black font-mono text-xs rounded-xl border border-emerald-200">
                        +{tx.points_earned} pts
                      </span>
                      <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                        = KSh {tx.points_earned} saved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Membership Tiers Overview */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              SmartCart VIP Loyalty Tiers
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <div className={`p-2 rounded-xl border ${tier === 'Bronze' ? 'bg-amber-100 border-amber-400 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                <div className="font-extrabold text-slate-900">Bronze</div>
                <div className="text-[9px] text-slate-400">&lt; 200 pts</div>
              </div>
              <div className={`p-2 rounded-xl border ${tier === 'Silver' ? 'bg-slate-200 border-slate-400 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                <div className="font-extrabold text-slate-900">Silver</div>
                <div className="text-[9px] text-slate-400">200+ pts</div>
              </div>
              <div className={`p-2 rounded-xl border ${tier === 'Gold' ? 'bg-amber-100 border-amber-500 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                <div className="font-extrabold text-amber-950">Gold</div>
                <div className="text-[9px] text-slate-400">500+ pts</div>
              </div>
              <div className={`p-2 rounded-xl border ${tier === 'Platinum' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                <div className="font-extrabold text-purple-950">Platinum</div>
                <div className="text-[9px] text-slate-400">1000+ pts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 italic">
            SmartPoints auto-credit at cashier checkout
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
