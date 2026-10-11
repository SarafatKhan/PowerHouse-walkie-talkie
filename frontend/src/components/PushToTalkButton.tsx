import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Lock, Loader2, Radio } from 'lucide-react';
import type { PTTButtonState } from '../types';

interface PushToTalkButtonProps {
  state: PTTButtonState;
  onRequestTalk: () => void;
  onReleaseTalk: () => void;
  disabled?: boolean;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  state,
  onRequestTalk,
  onReleaseTalk,
  disabled = false,
}) => {
  const isPressedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: hold Spacebar to talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or modal
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space' && !e.repeat && !isPressedRef.current && !disabled) {
        e.preventDefault();
        isPressedRef.current = true;
        onRequestTalk();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space' && isPressedRef.current) {
        e.preventDefault();
        isPressedRef.current = false;
        onReleaseTalk();
      }
    };

    // If window loses focus while transmitting, release PTT safely
    const handleBlur = () => {
      if (isPressedRef.current) {
        isPressedRef.current = false;
        onReleaseTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onRequestTalk, onReleaseTalk, disabled]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || state === 'busy' || state === 'mic_required') return;
    // Capture pointer so moving cursor/finger off button still tracks release cleanly
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    isPressedRef.current = true;
    onRequestTalk();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPressedRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      isPressedRef.current = false;
      onReleaseTalk();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (isPressedRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      isPressedRef.current = false;
      onReleaseTalk();
    }
  };

  // State-specific presentation
  let buttonLabel = 'HOLD TO TALK';
  let buttonIcon = <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200" />;
  let stateSubtext = 'Press & hold or Spacebar';
  let surfaceClass = 'ptt-button-surface active:scale-95';
  let ringColor = 'border-slate-700/60';

  if (state === 'connecting') {
    buttonLabel = 'CONNECTING...';
    buttonIcon = <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 animate-spin" />;
    stateSubtext = 'Requesting channel lock';
    surfaceClass = 'bg-amber-950/70 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
    ringColor = 'border-amber-500/40';
  } else if (state === 'speaking') {
    buttonLabel = 'RELEASE TO STOP';
    buttonIcon = <Mic className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />;
    stateSubtext = 'TRANSMITTING LIVE AUDIO';
    surfaceClass = 'ptt-button-active animate-pulse';
    ringColor = 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]';
  } else if (state === 'busy') {
    buttonLabel = 'CHANNEL BUSY';
    buttonIcon = <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500/70" />;
    stateSubtext = 'Another user is speaking';
    surfaceClass = 'ptt-button-busy cursor-not-allowed opacity-80';
    ringColor = 'border-amber-900/40';
  } else if (state === 'mic_required') {
    buttonLabel = 'MIC REQUIRED';
    buttonIcon = <MicOff className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" />;
    stateSubtext = 'Allow microphone in browser';
    surfaceClass = 'bg-red-950/40 border-red-800/80 cursor-not-allowed';
    ringColor = 'border-red-900/60';
  }

  return (
    <div className="relative flex flex-col items-center justify-center my-3 sm:my-5 select-none w-full">
      {/* Outer Tactical Bezel with touch-none to prevent gestures while holding */}
      <div
        className={`w-56 h-56 xs:w-60 xs:h-60 sm:w-72 sm:h-72 rounded-full border-4 ${ringColor} p-2.5 sm:p-3 flex items-center justify-center transition-all duration-300 relative shadow-2xl touch-none`}
      >
        {/* Active Transmit Wave Ping Animation */}
        {state === 'speaking' && (
          <div className="absolute inset-0 rounded-full border-4 border-red-500/40 animate-ping pointer-events-none" />
        )}

        {/* Central Physical Button */}
        <button
          ref={buttonRef}
          type="button"
          aria-label="Hold to talk"
          aria-pressed={state === 'speaking'}
          disabled={disabled || state === 'busy'}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          className={`w-full h-full rounded-full flex flex-col items-center justify-center p-3 sm:p-4 transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500/40 touch-none ${surfaceClass}`}
          style={{ touchAction: 'none' }}
        >
          {/* Microphone / Status Icon */}
          <div className="mb-1 sm:mb-2 transition-transform duration-150">{buttonIcon}</div>

          {/* Button Text */}
          <span className="text-lg xs:text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-100 drop-shadow">
            {buttonLabel}
          </span>

          {/* Subtext description */}
          <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-slate-400 mt-0.5 sm:mt-1 max-w-[85%] text-center">
            {stateSubtext}
          </span>
        </button>
      </div>

      {/* Quick Helper hint */}
      <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-mono">
        <Radio className="w-3.5 h-3.5 text-emerald-500" />
        <span>PRESS & HOLD OR HOLD SPACEBAR</span>
      </div>
    </div>
  );
};
