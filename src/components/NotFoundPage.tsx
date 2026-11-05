import React from 'react';
import { Home, ArrowLeft, ShoppingCart, HelpCircle } from 'lucide-react';
import { APP_CONFIG } from '../config.ts';
import { Footer } from './Footer.tsx';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-xs pointer-events-none"
        style={{ backgroundImage: "url('/supermarket_hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-emerald-950/90 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-emerald-800/40 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
            <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white font-['Plus_Jakarta_Sans']">
              SMART<span className="text-amber-400">CART</span>
            </span>
            <span className="text-[9px] font-extrabold bg-amber-400 text-emerald-950 px-1.5 py-0.2 rounded ml-1.5 uppercase">
              KE
            </span>
          </div>
        </a>
      </header>

      {/* 404 Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/90 border border-emerald-800/60 rounded-3xl p-8 backdrop-blur-md shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-900/70 text-amber-400 border border-emerald-600/50 flex items-center justify-center mx-auto shadow-inner">
            <span className="text-3xl font-black font-mono">404</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Aisle Not Found
            </h1>
            <p className="text-sm text-emerald-200/80 leading-relaxed">
              The page or retail shelf you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-sm shadow-xl shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4 stroke-[2.5]" />
              <span>Back to Home</span>
            </a>
          </div>
        </div>
      </main>

      {/* Unified Footer */}
      <Footer className="relative z-10" />
    </div>
  );
};
