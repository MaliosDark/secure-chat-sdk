import React from 'react';
import type { TypingIndicatorProps } from '../types';

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`flex justify-start ${className}`}>
      <div className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 max-w-xs">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-white/60 ml-2">typing...</span>
        </div>
      </div>
    </div>
  );
};