import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400/40 animate-in fade-in slide-in-from-bottom-2 no-print">
      <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
      <span>Mode Offline — Data tersimpan lokal di HP tetap dapat diakses.</span>
    </div>
  );
};
