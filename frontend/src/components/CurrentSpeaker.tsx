import React from 'react';
import { Volume2, Zap, AlertCircle } from 'lucide-react';
import type { SpeakerInfo } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface CurrentSpeakerProps {
  currentSpeaker: SpeakerInfo | null;
  currentUserId?: string;
  busyReason: string | null;
}

export const CurrentSpeaker: React.FC<CurrentSpeakerProps> = ({
  currentSpeaker,
  currentUserId,
  busyReason,
}) => {
  const isMeSpeaking = !!currentSpeaker && currentSpeaker.user_id === currentUserId;
  const isOtherSpeaking = !!currentSpeaker && !isMeSpeaking;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Speaker Display Card */}
      <div
        className={`w-full rounded-2xl border transition-all duration-300 px-4 sm:px-6 py-3.5 sm:py-5 flex flex-col items-center ${
          isMeSpeaking
            ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]'
            : isOtherSpeaking
            ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
            : 'bg-slate-900/50 border-slate-800/80 shadow-inner'
        }`}
      >
        {/* Status Header */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {isMeSpeaking ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-red-400 font-semibold">
                Live Broadcast
              </span>
            </>
          ) : isOtherSpeaking ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
                Incoming Audio
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-slate-400 font-semibold">
                Live Global Channel
              </span>
            </>
          )}
        </div>

        {/* Main Status Text */}
        <div className="text-center my-0.5">
          {isMeSpeaking ? (
            <h2 className="text-xl sm:text-2xl font-black text-red-100 tracking-wide flex items-center justify-center gap-2">
              <span>YOU ARE SPEAKING</span>
            </h2>
          ) : isOtherSpeaking ? (
            <div className="flex flex-col items-center">
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide flex items-center justify-center gap-2">
                <span>{currentSpeaker.name.toUpperCase()} IS SPEAKING</span>
              </h2>
              <span className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                ID: {currentSpeaker.user_id}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <h2 className="text-lg sm:text-xl font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>CHANNEL CLEAR</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Press and hold to transmit</p>
            </div>
          )}
        </div>

        {/* Live Audio Visualizer */}
        <div className="mt-2 w-full">
          <AudioVisualizer
            isActive={!!currentSpeaker}
            color={isMeSpeaking ? 'red' : isOtherSpeaking ? 'amber' : 'green'}
            bars={20}
          />
        </div>
      </div>

      {/* Busy or Denial Warning Banner */}
      {busyReason && !isMeSpeaking && (
        <div className="w-full mt-2.5 p-2.5 sm:p-3 bg-amber-950/60 border border-amber-600/40 rounded-xl flex items-center gap-2.5 text-amber-200 text-xs sm:text-sm animate-pulse">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-amber-400">
              Channel Busy
            </span>
            <span className="text-[11px] sm:text-xs text-amber-100">{busyReason}</span>
          </div>
        </div>
      )}
    </div>
  );
};
