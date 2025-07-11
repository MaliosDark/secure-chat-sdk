import React from 'react';
import { Check, CheckCheck, Lock } from 'lucide-react';
import type { MessageBubbleProps } from '../types';

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className = '' }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        message.isOwn 
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
          : 'bg-white/20 backdrop-blur-sm text-white border border-white/20'
      }`}>
        {!message.isOwn && message.senderName && (
          <div className="text-xs font-semibold text-blue-300 mb-1">
            {message.senderName}
          </div>
        )}
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">{message.content}</p>
            <div className="flex items-center justify-between mt-1 space-x-2">
              <div className="flex items-center space-x-1">
                {message.encrypted && <Lock className="h-3 w-3 text-green-400" />}
                <span className="text-xs opacity-75">{formatTime(message.timestamp)}</span>
              </div>
              {message.isOwn && (
                <div className="flex items-center">
                  <CheckCheck className="h-3 w-3 text-green-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};