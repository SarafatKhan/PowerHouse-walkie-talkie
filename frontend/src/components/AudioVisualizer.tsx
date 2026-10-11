import React from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: 'red' | 'amber' | 'green';
  bars?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  color = 'red',
  bars = 16,
}) => {
  const colorClasses = {
    red: 'bg-red-500 shadow-red-500/50',
    amber: 'bg-amber-400 shadow-amber-400/50',
    green: 'bg-emerald-400 shadow-emerald-400/50',
  }[color];

  return (
    <div className="flex items-center justify-center gap-1.5 h-10 px-4">
      {Array.from({ length: bars }).map((_, i) => {
        // Vary height pattern
        const minHeight = 4;
        const maxHeight = 36;
        const randomHeight = isActive 
          ? Math.max(minHeight, Math.floor(Math.sin((i / bars) * Math.PI) * maxHeight * (0.4 + Math.random() * 0.6)))
          : minHeight;

        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${colorClasses} ${
              isActive ? 'shadow-[0_0_8px]' : 'opacity-30'
            }`}
            style={{
              height: `${randomHeight}px`,
              transitionDelay: `${(i % 4) * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
};
