import React, { useState, useEffect } from 'react';
import { 
  SecureChatProvider, 
  useChatContext,
  ChatInterface,
  PeerList 
} from '@secure-chat/sdk';

// Twitter-like social media integration example
interface TwitterUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
}

interface Tweet {
  id: string;
  user: TwitterUser;
  content: string;
  timestamp: Date;
  likes: number;
  retweets: number;
}

// Custom hook for Twitter-like functionality
function useTwitterIntegration() {
  const [users, setUsers] = useState<TwitterUser[]>([]);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [selectedUser, setSelectedUser] = useState<TwitterUser | null>(null);
  
  const { peers, selectPeer, selectedPeer } = useChatContext();

  // Convert peers to Twitter users
  useEffect(() => {
    const twitterUsers: TwitterUser[] = peers.map(peer => ({
      id: peer.id,
      username: peer.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: peer.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name}`,
      isOnline: peer.online
    }));
    setUsers(twitterUsers);
  }, [peers]);

  const startDirectMessage = (user: TwitterUser) => {
    setSelectedUser(user);
    const peer = peers.find(p => p.id === user.id);
    if (peer) {
      selectPeer(peer);
    }
  };

  return {
    users,
    tweets,
    selectedUser,
    startDirectMessage,
    selectedPeer
  };
}

// Twitter-style user card
function UserCard({ user, onMessageClick }: { user: TwitterUser; onMessageClick: (user: TwitterUser) => void }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center space-x-3">
        <img 
          src={user.avatar} 
          alt={user.displayName}
          className="w-12 h-12 rounded-full"
        />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{user.displayName}</h3>
          <p className="text-gray-600">@{user.username}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <button
            onClick={() => onMessageClick(user)}
            className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Twitter-style interface
function TwitterInterface() {
  const { users, selectedUser, startDirectMessage, selectedPeer } = useTwitterIntegration();
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-500">SecureTwitter</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{users.length} users online</span>
              {selectedUser && (
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  {showChat ? 'Hide Chat' : 'Show Chat'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Online Users</h2>
            <div className="space-y-4">
              {users.map(user => (
                <UserCard 
                  key={user.id}
                  user={user}
                  onMessageClick={startDirectMessage}
                />
              ))}
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            {selectedUser && showChat ? (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <img 
                    src={selectedUser.avatar} 
                    alt={selectedUser.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{selectedUser.displayName}</h3>
                    <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                  </div>
                </div>
                
                <div className="h-96">
                  <ChatInterface 
                    className="h-full"
                    placeholder={`Message @${selectedUser.username}...`}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a Conversation</h3>
                <p className="text-gray-600">Click "Message" on any user to start an encrypted chat</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Twitter integration app
function TwitterIntegrationApp() {
  return (
    <SecureChatProvider
      signalingServer="wss://your-signaling-server.com/ws"
      username="twitter_user"
      onError={(error) => console.error('Twitter chat error:', error)}
    >
      <TwitterInterface />
    </SecureChatProvider>
  );
}

export default TwitterIntegrationApp;