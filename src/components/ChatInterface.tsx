import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useChatContext } from '../hooks/useChatContext';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { AudioMeter } from './AudioMeter';
import { AudioVisualizer } from './AudioVisualizer';
import { ConnectionStatus } from './ConnectionStatus';
import type { ChatInterfaceProps } from '../types';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className = '',
  showAudioControls = true,
  showConnectionStatus = true,
  placeholder = 'Type your encrypted message...'
}) => {
  const {
    selectedPeer,
    messages,
    sendMessage,
    isTyping,
    sendTypingIndicator,
    isAudioEnabled,
    toggleAudio,
    audioLevel,
    remoteAudioLevel,
    localAudioStream,
    remoteAudioStream,
    connectionStatus
  } = useChatContext();

  const [newMessage, setNewMessage] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Attach remote audio stream to audio element
    if (remoteAudioRef.current && remoteAudioStream) {
      remoteAudioRef.current.srcObject = remoteAudioStream;
      remoteAudioRef.current.play().catch(console.error);
    }
  }, [remoteAudioStream]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPeer) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      // Send typing indicator
      if (selectedPeer) {
        sendTypingIndicator(true);
        
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        
        const timeout = setTimeout(() => {
          sendTypingIndicator(false);
        }, 1000);
        
        setTypingTimeout(timeout);
      }
    }
  };

  const isEncryptionReady = selectedPeer?.encryptionEstablished || false;

  if (!selectedPeer) {
    return (
      <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 h-[600px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="h-16 w-16 text-white/50 mx-auto mb-4">💬</div>
          <h3 className="text-xl font-semibold text-white mb-2">Select a Peer to Start Chatting</h3>
          <p className="text-white/70">Choose a peer from the list to begin an encrypted conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden ${className}`}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-sm px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {selectedPeer.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                selectedPeer.online ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedPeer.name}</h3>
              <div className="flex items-center space-x-2">
                {showConnectionStatus && (
                  <ConnectionStatus 
                    status={connectionStatus}
                    iceConnectionState={selectedPeer.connectionState}
                  />
                )}
                {isEncryptionReady && (
                  <>
                    <span className="text-white/50">•</span>
                    <Lock className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">E2E</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {showAudioControls && (
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleAudio}
                disabled={!isEncryptionReady}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isAudioEnabled 
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              
              <div className={`p-2 rounded-lg ${
                remoteAudioStream ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
              }`} title={remoteAudioStream ? 'Receiving audio' : 'No audio'}>
                {remoteAudioStream ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </div>
            </div>
          )}
        </div>
        
        {/* Audio Meters */}
        {showAudioControls && (isAudioEnabled || remoteAudioStream) && (
          <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-white/10">
            {isAudioEnabled && (
              <AudioMeter
                level={audioLevel}
                type="input"
                isActive={isAudioEnabled}
                label="Your Microphone"
              />
            )}
            
            {remoteAudioStream && (
              <AudioMeter
                level={remoteAudioLevel}
                type="output"
                isActive={!!remoteAudioStream}
                label={`${selectedPeer.name}'s Audio`}
              />
            )}
          </div>
        )}
        
        {/* Audio Visualizers */}
        {showAudioControls && (isAudioEnabled || remoteAudioStream) && (
          <div className="mt-4 space-y-3">
            {isAudioEnabled && localAudioStream && (
              <div>
                <div className="text-xs text-white/70 mb-2 text-center">Your Voice</div>
                <AudioVisualizer
                  audioStream={localAudioStream}
                  isActive={isAudioEnabled}
                  type="waveform"
                  color="#10B981"
                  height={40}
                />
              </div>
            )}
            
            {remoteAudioStream && (
              <div>
                <div className="text-xs text-white/70 mb-2 text-center">{selectedPeer.name}'s Voice</div>
                <AudioVisualizer
                  audioStream={remoteAudioStream}
                  isActive={!!remoteAudioStream}
                  type="frequency"
                  color="#3B82F6"
                  height={40}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-white/50 mb-2">No messages yet</div>
            <div className="text-white/30 text-sm">Start a conversation with {selectedPeer.name}</div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={!isEncryptionReady}
            />
            <div className="absolute right-3 top-3 flex items-center space-x-1">
              <Lock className={`h-4 w-4 ${isEncryptionReady ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className={`text-xs ${isEncryptionReady ? 'text-green-400' : 'text-yellow-400'}`}>
                {isEncryptionReady ? 'AES-256' : 'Encrypting...'}
              </span>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isEncryptionReady}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-center">
          {isEncryptionReady ? (
            <span className="text-green-400">All messages are encrypted end-to-end with AES-256-GCM</span>
          ) : (
            <span className="text-yellow-400">Establishing secure connection...</span>
          )}
        </div>
      </div>
      
      {/* Hidden audio element for remote audio */}
      <audio 
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </div>
  );
};