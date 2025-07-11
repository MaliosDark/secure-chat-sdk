import React, { useState } from 'react';
import { 
  SecureChatProvider, 
  useChatContext,
  ChatInterface,
  PeerList,
  AudioMeter,
  ConnectionStatus
} from '@secure-chat/sdk';

// Custom chat component with full control
function CustomChatInterface() {
  const { 
    peers, 
    selectedPeer, 
    selectPeer, 
    messages,
    sendMessage,
    connectionStatus,
    isAudioEnabled,
    toggleAudio,
    audioLevel,
    remoteAudioLevel
  } = useChatContext();

  const [customMessage, setCustomMessage] = useState('');

  const handleSendCustomMessage = async () => {
    if (customMessage.trim()) {
      await sendMessage(customMessage);
      setCustomMessage('');
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-screen p-4">
      {/* Peer List */}
      <div className="col-span-1">
        <PeerList 
          peers={peers}
          selectedPeer={selectedPeer}
          onPeerSelect={selectPeer}
          myNodeId="my-node-id"
          myUsername="My Username"
        />
        
        {/* Audio Controls */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white mb-2">Audio Controls</h3>
          <button
            onClick={toggleAudio}
            className={`px-4 py-2 rounded ${
              isAudioEnabled ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isAudioEnabled ? 'Mute' : 'Unmute'}
          </button>
          
          <div className="mt-4 space-y-2">
            <AudioMeter 
              level={audioLevel}
              type="input"
              isActive={isAudioEnabled}
              label="Your Mic"
            />
            <AudioMeter 
              level={remoteAudioLevel}
              type="output"
              isActive={!!selectedPeer}
              label="Remote Audio"
            />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="col-span-3">
        <div className="mb-4">
          <ConnectionStatus status={connectionStatus} />
        </div>
        
        <ChatInterface 
          showAudioControls={false} // We have custom controls
          placeholder="Type your secure message..."
        />
        
        {/* Custom Message Input */}
        <div className="mt-4 flex space-x-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Custom message input..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleSendCustomMessage()}
          />
          <button
            onClick={handleSendCustomMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Send Custom
          </button>
        </div>
      </div>
    </div>
  );
}

// Advanced usage with custom configuration
function AdvancedChatApp() {
  const customIceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:your-turn-server.com:3478",
      username: "your-username",
      credential: "your-password"
    }
  ];

  return (
    <SecureChatProvider
      signalingServer="wss://your-signaling-server.com/ws"
      username="advanced_user"
      iceServers={customIceServers}
      debug={true}
      logLevel="verbose"
      onError={(error) => {
        console.error('Advanced chat error:', error);
        // Custom error handling
      }}
      onPeerConnected={(peerId) => {
        console.log('Peer connected:', peerId);
        // Custom peer connection handling
      }}
      onMessageReceived={(message) => {
        console.log('Message received:', message);
        // Custom message handling
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900">
        <CustomChatInterface />
      </div>
    </SecureChatProvider>
  );
}

export default AdvancedChatApp;