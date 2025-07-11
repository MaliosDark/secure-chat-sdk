import React from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import type { ConnectionStatusProps } from '../types';

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  iceConnectionState,
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-5 w-5" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          text: iceConnectionState === 'connected' ? 'Connected (P2P)' : `Connected (${iceConnectionState || 'WebRTC'})`
        };
      case 'connecting':
        return {
          icon: <Loader className="h-5 w-5 animate-spin" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          text: 'Connecting'
        };
      default:
        return {
          icon: <WifiOff className="h-5 w-5" />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          text: 'Disconnected'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={config.color}>
        {config.icon}
      </div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};