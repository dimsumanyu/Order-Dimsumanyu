import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xl animate-in slide-in-from-bottom duration-200">
      <WifiOff className="w-3.5 h-3.5 animate-pulse text-white shrink-0" />
      <span>Mode Offline — Anda tetap dapat melihat menu &amp; struk yang tersimpan.</span>
    </div>
  );
};
