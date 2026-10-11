import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioPermissionBannerProps {
  isUnlocked: boolean;
  onUnlock: () => void;
}

export const AudioPermissionBanner: React.FC<AudioPermissionBannerProps> = ({
  isUnlocked,
  onUnlock,
}) => {
  if (isUnlocked) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
      <div className="flex items-center gap-2 text-center sm:text-left">
        <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Browser audio requires one-time activation to play incoming live voice.</span>
      </div>
      <button
        onClick={onUnlock}
        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm text-xs font-mono uppercase shrink-0"
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span>Start Listening</span>
      </button>
    </div>
  );
};
