import React, { useState } from 'react';
import { User as UserIcon, X, LogOut, Check, Edit2, Shield, Calendar, Mail, Hash } from 'lucide-react';
import type { User } from '../types';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateName: (newName: string) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
  onUpdateName,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onUpdateName(name.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-200">
              User Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="mt-5 flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden shadow-lg">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
            </span>
          </div>

          {/* User Name & Editable state */}
          {isEditing ? (
            <form onSubmit={handleSave} className="w-full flex items-center gap-2 mb-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSaving}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(user.name);
                  setIsEditing(false);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-emerald-400 p-1 transition"
                title="Edit name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

          {/* Unique User ID Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full font-mono text-xs text-emerald-400 mb-6">
            <Hash className="w-3 h-3 text-emerald-500" />
            <span>ID: {user.user_id}</span>
          </div>

          {/* Detailed Info List */}
          <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Email Address</span>
              </div>
              <span className="font-mono text-slate-200">{user.email}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Channel Access</span>
              </div>
              <span className="font-mono text-emerald-400 font-semibold">POWER HOUSE LIVE</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Account Status</span>
              </div>
              <span className="font-mono text-slate-300">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl transition text-xs font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
