import React, { useState } from 'react';
import { Users, X, Signal } from 'lucide-react';
import type { User } from '../types';

interface OnlineUserCountProps {
  count: number;
  users: User[];
  currentUserId?: string;
}

export const OnlineUserCount: React.FC<OnlineUserCountProps> = ({
  count,
  users,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Online Badge Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800 transition-all text-xs font-mono font-medium text-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="tracking-wide">
          {count} {count === 1 ? 'USER ONLINE' : 'USERS ONLINE'}
        </span>
      </button>

      {/* Online Users List Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Global Channel Users ({count})
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
              {users.map((u) => {
                const isMe = u.user_id === currentUserId;
                return (
                  <div
                    key={u.user_id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isMe
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-800/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200 border border-slate-600">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold flex items-center gap-1.5">
                          {u.name}
                          {isMe && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">
                              YOU
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {u.user_id}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <Signal className="w-3 h-3 text-emerald-400" />
                      LIVE
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Power House Global Frequency
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
