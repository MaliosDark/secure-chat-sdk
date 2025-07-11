import React from 'react';
import type { AudioMeterProps } from '../types';

export const AudioMeter: React.FC<AudioMeterProps> = ({ 
  level, 
  type, 
  isActive, 
  label,
  className = '' 
}) => {
  const bars = 20;
  const activeBars = Math.floor((level / 100) * bars);
  
  const getBarColor = (index: number) => {
    if (!isActive) return 'bg-gray-600';
    
    const percentage = (index + 1) / bars;
    if (percentage <= 0.6) return 'bg-green-500';
    if (percentage <= 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGlowEffect = () => {
    if (!isActive || level < 10) return '';
    
    if (level > 80) return 'shadow-lg shadow-red-500/50';
    if (level > 60) return 'shadow-lg shadow-yellow-500/50';
    return 'shadow-lg shadow-green-500/50';
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {label && (
        <div className="text-xs text-white/70 font-medium">
          {label}
        </div>
      )}
      
      <div className={`flex items-end space-x-1 p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 ${getGlowEffect()}`}>
        {Array.from({ length: bars }, (_, index) => (
          <div
            key={index}
            className={`w-1.5 transition-all duration-75 ${
              index < activeBars ? getBarColor(index) : 'bg-gray-700'
            }`}
            style={{
              height: `${8 + (index * 1.2)}px`,
              opacity: index < activeBars ? 1 : 0.3
            }}
          />
        ))}
      </div>
      
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className="text-xs text-white/60">
          {type === 'input' ? 'MIC' : 'OUT'} {Math.round(level)}%
        </span>
      </div>
    </div>
  );
};