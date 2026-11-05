import React, { useState } from 'react';
import { Store, QrCode, Search, CheckCircle2, MapPin, Phone, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Supermarket } from '../types.ts';

interface SupermarketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  supermarkets: Supermarket[];
  currentSupermarket: Supermarket | null;
  onSelectSupermarket: (sm: Supermarket) => void;
}

export const SupermarketSelectorModal: React.FC<SupermarketSelectorModalProps> = ({
  isOpen,
  onClose,
  supermarkets,
  currentSupermarket,
  onSelectSupermarket,
}) => {
  const [tab, setTab] = useState<'list' | 'code' | 'qr'>('list');
  const [codeQuery, setCodeQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulatedQrInput, setSimulatedQrInput] = useState('');

  if (!isOpen) return null;

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const normalized = codeQuery.trim().toUpperCase();
    if (!normalized) {
      setErrorMsg('Please enter a supermarket code.');
      return;
    }
    const matched = supermarkets.find(
      (s) => s.supermarket_code.trim().toUpperCase() === normalized
    );
    if (!matched) {
      setErrorMsg(`Supermarket with code "${normalized}" not found.`);
      return;
    }
    onSelectSupermarket(matched);
    onClose();
  };

  const handleSimulatedQrScan = (codeToUse: string) => {
    setErrorMsg('');
    const matched = supermarkets.find(
      (s) =>
        s.supermarket_code.trim().toUpperCase() === codeToUse.trim().toUpperCase() ||
        s.id === codeToUse.trim()
    );
    if (!matched) {
      setErrorMsg('Scanned QR does not match an active supermarket.');
      return;
    }
    onSelectSupermarket(matched);
    onClose();
  };

  const filteredSupermarkets = supermarkets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.supermarket_code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.location.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header with Appealing Supermarket Store Image */}
        <div className="relative overflow-hidden text-white p-5 flex items-center justify-between shrink-0 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/store_admin_hero.jpg"
              alt="Supermarket grocery store"
              className="w-full h-full object-cover object-center filter brightness-[0.65] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Connect to Supermarket</h2>
              <p className="text-xs text-emerald-200">
                Choose your store to unlock local pricing &amp; inventory
              </p>
            </div>
          </div>
          {currentSupermarket && (
            <button
              onClick={onClose}
              className="relative z-10 w-8 h-8 rounded-full bg-emerald-950/60 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Option Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-1 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('list');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'list'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            1. Select from List
          </button>
          <button
            onClick={() => {
              setTab('code');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'code'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            2. Enter Store Code
          </button>
          <button
            onClick={() => {
              setTab('qr');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'qr'
                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            3. Scan QR Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: LIST */}
          {tab === 'list' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search supermarket by name, town, or code..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {supermarkets.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 space-y-1.5">
                    <p className="font-bold text-slate-700">No supermarkets registered yet.</p>
                    <p className="text-slate-400">Add your first supermarket from the System Admin portal.</p>
                  </div>
                ) : filteredSupermarkets.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">
                    No supermarkets match your search.
                  </p>
                ) : (
                  filteredSupermarkets.map((sm) => {
                    const isSelected = currentSupermarket?.id === sm.id;
                    return (
                      <div
                        key={sm.id}
                        onClick={() => {
                          onSelectSupermarket(sm);
                          onClose();
                        }}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer text-left relative group ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {sm.name}
                              </span>
                              <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                {sm.supermarket_code}
                              </span>
                              {isSelected && (
                                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Currently Connected
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{sm.location}</span>
                            </p>

                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{sm.phone}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-amber-400 group-hover:text-emerald-950'
                            }`}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STORE CODE */}
          {tab === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                <p className="font-bold text-sm mb-1">Enter Supermarket Code</p>
                Each branch has a unique identifier assigned upon store registration in System Admin.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ENTER STORE CODE"
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value.toUpperCase())}
                  className="w-full text-center text-xl font-mono font-black tracking-widest px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-600 focus:outline-none uppercase"
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Available Stores:</span>
                {supermarkets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No stores registered yet. Add stores in System Admin.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {supermarkets.map((sm) => (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => setCodeQuery(sm.supermarket_code)}
                        className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 text-xs transition"
                      >
                        <div className="font-bold font-mono text-emerald-800">
                          {sm.supermarket_code}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">{sm.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/20 transition active:scale-[0.98]"
              >
                Connect to Store Database
              </button>
            </form>
          )}

          {/* TAB 3: SCAN QR */}
          {tab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center p-4 relative bg-slate-800/60">
                  <QrCode className="w-20 h-20 text-amber-300 animate-pulse" />
                  <span className="text-[11px] text-slate-300 mt-2 font-medium">
                    Point camera at Store QR Code
                  </span>
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-amber-400/90 shadow-[0_0_8px_#f59e0b] animate-bounce top-1/2" />
                </div>
                <p className="text-xs text-slate-300 mt-4 max-w-xs">
                  Scan the SmartCart QR poster located at the entrance gate of the supermarket.
                </p>
              </div>

              {/* Instant QR Simulation for testing */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Test / Simulate Store QR Scan:
                </span>
                {supermarkets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No stores registered yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {supermarkets.map((sm) => (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => handleSimulatedQrScan(sm.supermarket_code)}
                        className="text-xs bg-white hover:bg-amber-100 border border-slate-300 hover:border-amber-400 px-3 py-1.5 rounded-lg font-semibold text-slate-800 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-600" />
                        Scan {sm.name} ({sm.supermarket_code})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Connected: <strong className="text-slate-800">{currentSupermarket?.name || 'None'}</strong></span>
          {currentSupermarket && (
            <button
              onClick={onClose}
              className="text-emerald-700 font-bold hover:underline"
            >
              Continue Shopping
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
