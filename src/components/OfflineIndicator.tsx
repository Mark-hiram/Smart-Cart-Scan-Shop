import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 text-amber-300 px-4 py-2.5 text-xs font-bold shadow-2xl border border-amber-400/40 backdrop-blur-md animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span>Offline Mode Active &bull; Cached catalog is available</span>
      </div>
      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
        PWA
      </span>
    </div>
  );
};
