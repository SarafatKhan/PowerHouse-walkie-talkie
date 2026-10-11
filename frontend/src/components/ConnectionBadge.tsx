import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ status }) => {
  const configs = {
    connected: {
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      label: 'CONNECTED',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
    },
    connecting: {
      dotColor: 'bg-amber-400 animate-pulse',
      textColor: 'text-amber-400',
      label: 'CONNECTING...',
      icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    },
    reconnecting: {
      dotColor: 'bg-amber-500 animate-pulse',
      textColor: 'text-amber-400',
      label: 'RECONNECTING...',
      icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    },
    disconnected: {
      dotColor: 'bg-red-500',
      textColor: 'text-red-400',
      label: 'OFFLINE',
      icon: <WifiOff className="w-3.5 h-3.5 text-red-400" />,
    },
  }[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-mono">
      <span className={`w-2 h-2 rounded-full ${configs.dotColor}`} />
      <span className={`font-semibold tracking-wider ${configs.textColor}`}>
        {configs.label}
      </span>
      {configs.icon}
    </div>
  );
};
