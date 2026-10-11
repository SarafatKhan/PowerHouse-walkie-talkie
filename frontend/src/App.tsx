import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalkieTalkieProvider } from './context/WalkieTalkieContext';
import { AuthScreen } from './components/AuthScreen';
import { WalkieTalkieMain } from './components/WalkieTalkieMain';
import { Loader2, Radio } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-radio-dark flex flex-col items-center justify-center text-slate-400 font-mono">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
          <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Calibrating Global Frequency...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <WalkieTalkieProvider>
      <WalkieTalkieMain />
    </WalkieTalkieProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
