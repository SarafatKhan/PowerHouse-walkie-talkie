import React, { useState } from 'react';
import { User as UserIcon, Zap, Volume2, Shield, Download, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWalkieTalkie } from '../context/WalkieTalkieContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CurrentSpeaker } from './CurrentSpeaker';
import { PushToTalkButton } from './PushToTalkButton';
import { OnlineUserCount } from './OnlineUserCount';
import { ConnectionBadge } from './ConnectionBadge';
import { AudioPermissionBanner } from './AudioPermissionBanner';
import { ProfileModal } from './ProfileModal';
import { DownloadAppModal } from './DownloadAppModal';

export const WalkieTalkieMain: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const {
    connectionStatus,
    pttState,
    currentSpeaker,
    busyReason,
    onlineCount,
    onlineUsers,
    isAudioUnlocked,
    unlockAudio,
    requestTalk,
    releaseTalk,
  } = useWalkieTalkie();

  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-radio-dark flex flex-col justify-between items-center relative overflow-x-hidden select-none p-3 sm:p-6">
      {/* Background Subtle Atmospheric Radar / Radial Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-slate-800/40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-slate-800/20 pointer-events-none" />

      {/* Top Banner for Browser Autoplay Audio Unlock */}
      <div className="w-full max-w-xl z-20">
        <AudioPermissionBanner isUnlocked={isAudioUnlocked} onUnlock={unlockAudio} />
      </div>

      {/* Main Power House Chassis Container */}
      <main className="w-full max-w-md my-auto flex flex-col items-center z-10 px-2 sm:px-0">
        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between mb-3 px-1">
          {/* Top-Left: User Profile Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/90 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            title="Open User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-emerald-500/40 flex items-center justify-center overflow-hidden">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-200 leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 leading-none">
                {user.user_id}
              </span>
            </div>
          </button>

          {/* Top-Right: Download App & Audio Enable Action */}
          <div className="flex items-center gap-2">
            {/* Download App PWA Button */}
            <button
              type="button"
              onClick={() => {
                if (isInstallable) {
                  triggerInstall();
                } else {
                  setIsDownloadModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-mono font-semibold transition shadow-sm"
              title="Download Power House App"
            >
              {isInstalled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">INSTALLED</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] sm:text-xs">DOWNLOAD APP</span>
                </>
              )}
            </button>

            {/* Audio Autoplay Status Indicator */}
            <button
              type="button"
              className={`p-2 rounded-full border transition ${
                isAudioUnlocked
                  ? 'bg-slate-900/80 border-slate-800 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-800/50 text-amber-400 animate-pulse'
              }`}
              title={isAudioUnlocked ? 'Audio output active' : 'Click to enable audio'}
              onClick={unlockAudio}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global Channel Heading with Power House Logo */}
        <div className="flex flex-col items-center text-center mb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-white">
              POWER HOUSE
            </h1>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80 tracking-widest uppercase">
            GLOBAL LIVE AUDIO CHANNEL // 144.800 MHz
          </span>
        </div>

        {/* Online Users Pill Indicator */}
        <div className="mb-4">
          <OnlineUserCount
            count={onlineCount}
            users={onlineUsers}
            currentUserId={user.user_id}
          />
        </div>

        {/* Current Speaker Display Banner */}
        <div className="w-full mb-1">
          <CurrentSpeaker
            currentSpeaker={currentSpeaker}
            currentUserId={user.user_id}
            busyReason={busyReason}
          />
        </div>

        {/* Central Large Tactile Push-To-Talk Button */}
        <PushToTalkButton
          state={pttState}
          onRequestTalk={requestTalk}
          onReleaseTalk={releaseTalk}
          disabled={connectionStatus !== 'connected'}
        />

        {/* Connection Status Badge at Bottom */}
        <div className="mt-3">
          <ConnectionBadge status={connectionStatus} />
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="w-full max-w-md py-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-900 z-10 px-2 mt-auto">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>SERVER-ENFORCED DUPLEX</span>
        </div>
        <span>POWER HOUSE v2.0</span>
      </footer>

      {/* User Profile Modal */}
      <ProfileModal
        user={user}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={logout}
        onUpdateName={async (newName) => {
          await updateUser({ name: newName });
        }}
      />

      {/* Download App Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        isInstallable={isInstallable}
        onNativeInstall={triggerInstall}
      />
    </div>
  );
};
