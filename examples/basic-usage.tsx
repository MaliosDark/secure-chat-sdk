import React from 'react';
import { SecureChatProvider, ChatInterface } from '@secure-chat/sdk';

// Basic usage example
function BasicChatApp() {
  return (
    <SecureChatProvider
      signalingServer="wss://your-signaling-server.com/ws"
      username="john_doe"
      onError={(error) => console.error('Chat error:', error)}
    >
      <div className="min-h-screen bg-gray-900 p-4">
        <ChatInterface />
      </div>
    </SecureChatProvider>
  );
}

export default BasicChatApp;