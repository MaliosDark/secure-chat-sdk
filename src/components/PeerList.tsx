import React from 'react';
import { Wifi, WifiOff, Shield, Globe } from 'lucide-react';
import type { PeerListProps } from '../types';

export const PeerList: React.FC<PeerListProps> = ({
  peers,
  selectedPeer,
  onPeerSelect,
  myNodeId,
  myUsername,
  className = '',
  showConnectionStatus = true
}) => {
  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Globe className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Network Peers</h2>
      </div>

      {/* My Node */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-semibold text-white">{myUsername || 'You'}</h3>
              <p className="text-sm text-white/70">Node ID: {myNodeId.substring(0, 12)}...</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {peers.length === 0 ? (
          <div className="text-center py-8">
            <div className="relative mx-auto w-8 h-8 mb-2">
              <WifiOff className="h-8 w-8 text-white/50" />
              <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-30"></div>
            </div>
            <p className="text-white/50 text-sm">No peers discovered yet</p>
            <p className="text-white/30 text-xs mt-1">🔍 Auto-scanning every 15 seconds...</p>
            <div className="mt-2 flex items-center justify-center space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          peers.map((peer) => (
            <button
              key={peer.id}
              onClick={() => onPeerSelect(peer)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                selectedPeer?.id === peer.id
                  ? 'bg-blue-500/30 border-blue-500/50 transform scale-105'
                  : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {peer.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    peer.online ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{peer.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {showConnectionStatus && (
                      <>
                        <div className="flex items-center space-x-1">
                          <Wifi className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-green-400">WebRTC</span>
                        </div>
                        {peer.encryptionEstablished && (
                          <div className="flex items-center space-x-1">
                            <Shield className="h-3 w-3 text-blue-400" />
                            <span className="text-xs text-blue-400">E2E</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-xs text-white/50 text-center">
          <p>Connected via WebRTC</p>
          <p className="mt-1">End-to-end encrypted</p>
        </div>
      </div>
    </div>
  );
};