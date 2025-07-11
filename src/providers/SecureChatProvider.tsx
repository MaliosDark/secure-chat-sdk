import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EncryptionService } from '../services/EncryptionService';
import { WebRTCManager } from '../services/WebRTCManager';
import { AudioManager } from '../services/AudioManager';
import { createSecureId } from '../utils';
import type { 
  ChatContextValue, 
  SecureChatProviderProps, 
  Message, 
  Peer 
} from '../types';

const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a SecureChatProvider');
  }
  return context;
};

export const SecureChatProvider: React.FC<SecureChatProviderProps> = ({
  signalingServer,
  username,
  iceServers,
  onError,
  onPeerConnected,
  onPeerDisconnected,
  onMessageReceived,
  debug = false,
  logLevel = 'info',
  children
}) => {
  // State
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Services
  const encryptionServiceRef = useRef<EncryptionService | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const nodeIdRef = useRef<string>(createSecureId());

  // Logging utility
  const log = useCallback((level: string, message: string, ...args: any[]) => {
    if (!debug) return;
    
    const levels = ['silent', 'error', 'warn', 'info', 'verbose'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex <= currentLevelIndex) {
      console[level as keyof Console](`[SecureChat SDK] ${message}`, ...args);
    }
  }, [debug, logLevel]);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        log('info', 'Initializing SecureChat SDK...');
        
        // Initialize encryption service
        const encryptionService = new EncryptionService();
        await encryptionService.initialize();
        encryptionServiceRef.current = encryptionService;
        log('info', 'Encryption service initialized');

        // Initialize audio manager
        const audioManager = new AudioManager();
        audioManagerRef.current = audioManager;
        
        // Set up audio manager callbacks
        audioManager.onAudioLevelChanged = (level: number, type: 'local' | 'remote') => {
          if (type === 'local') {
            setAudioLevel(level);
          } else {
            setRemoteAudioLevel(level);
          }
        };

        audioManager.onLocalAudioStateChanged = (enabled: boolean, stream: MediaStream | null) => {
          setIsAudioEnabled(enabled);
          setLocalAudioStream(stream);
        };

        audioManager.onRemoteAudioStreamChanged = (stream: MediaStream | null) => {
          setRemoteAudioStream(stream);
        };

        log('info', 'Audio manager initialized');

        // Initialize WebRTC manager
        const webrtcManager = new WebRTCManager(
          nodeIdRef.current,
          username,
          encryptionService,
          iceServers
        );
        webrtcManagerRef.current = webrtcManager;

        // Set up WebRTC callbacks
        webrtcManager.onPeerDiscovered = (peerId: string, peerUsername: string) => {
          log('info', `Peer discovered: ${peerId} (${peerUsername})`);
          setPeers(prev => {
            const exists = prev.find(p => p.id === peerId);
            if (exists) {
              return prev.map(p => p.id === peerId ? { ...p, online: true, name: peerUsername } : p);
            }
            return [...prev, {
              id: peerId,
              name: peerUsername,
              online: true,
              connectionState: 'disconnected',
              encryptionEstablished: false
            }];
          });
          onPeerConnected?.(peerId);
        };

        webrtcManager.onPeerDisconnected = (peerId: string) => {
          log('info', `Peer disconnected: ${peerId}`);
          setPeers(prev => prev.map(p => 
            p.id === peerId ? { ...p, online: false, connectionState: 'disconnected', encryptionEstablished: false } : p
          ));
          onPeerDisconnected?.(peerId);
        };

        webrtcManager.onMessageReceived = (message: any) => {
          log('info', `Message received from ${message.sender}`);
          const senderPeer = peers.find(p => p.id === message.sender);
          const newMessage: Message = {
            id: createSecureId(),
            content: message.content,
            sender: message.sender,
            senderName: senderPeer?.name || message.sender.substring(0, 12),
            timestamp: new Date(),
            encrypted: message.encrypted || false,
            isOwn: false
          };
          setMessages(prev => [...prev, newMessage]);
          onMessageReceived?.(newMessage);
        };

        webrtcManager.onConnectionStatusChanged = (status) => {
          log('info', `Connection status changed: ${status}`);
          setConnectionStatus(status);
        };

        webrtcManager.onEncryptionEstablished = (peerId: string) => {
          log('info', `Encryption established with ${peerId}`);
          setPeers(prev => prev.map(p => 
            p.id === peerId ? { ...p, encryptionEstablished: true } : p
          ));
        };

        webrtcManager.onPeerConnectionStateChanged = (peerId: string, state: string) => {
          log('verbose', `Peer connection state changed for ${peerId}: ${state}`);
          setPeers(prev => prev.map(p => 
            p.id === peerId ? { ...p, connectionState: state as any } : p
          ));
        };

        webrtcManager.onTypingIndicator = (peerId: string, typing: boolean) => {
          if (selectedPeer && selectedPeer.id === peerId) {
            setIsTyping(typing);
          }
        };

        webrtcManager.onRemoteAudioStream = (peerId: string, stream: MediaStream) => {
          if (selectedPeer && selectedPeer.id === peerId) {
            audioManager.setRemoteAudioStream(stream);
          }
        };

        // Connect to signaling server
        await webrtcManager.connect(signalingServer);
        log('info', 'WebRTC manager initialized and connected');

      } catch (error) {
        log('error', 'Failed to initialize services:', error);
        onError?.(error as Error);
      }
    };

    initializeServices();

    // Cleanup
    return () => {
      webrtcManagerRef.current?.disconnect();
      audioManagerRef.current?.cleanup();
    };
  }, [signalingServer, username, iceServers, onError, onPeerConnected, onPeerDisconnected, onMessageReceived, log]);

  // Context methods
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedPeer || !webrtcManagerRef.current) {
      throw new Error('No peer selected or WebRTC manager not initialized');
    }

    log('info', `Sending message to ${selectedPeer.id}`);
    
    const message: Message = {
      id: createSecureId(),
      content,
      sender: nodeIdRef.current,
      senderName: username,
      timestamp: new Date(),
      encrypted: true,
      isOwn: true
    };

    setMessages(prev => [...prev, message]);
    await webrtcManagerRef.current.sendMessage(selectedPeer.id, content);
  }, [selectedPeer, username, log]);

  const selectPeer = useCallback((peer: Peer) => {
    log('info', `Selecting peer: ${peer.id}`);
    setSelectedPeer(peer);
    setMessages([]); // Clear messages when switching peers
    setIsTyping(false);
    
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.connectToPeer(peer.id);
    }
  }, [log]);

  const disconnectPeer = useCallback((peerId: string) => {
    log('info', `Disconnecting from peer: ${peerId}`);
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.disconnectFromPeer(peerId);
    }
    setPeers(prev => prev.filter(p => p.id !== peerId));
    if (selectedPeer?.id === peerId) {
      setSelectedPeer(null);
      setMessages([]);
    }
  }, [selectedPeer, log]);

  const toggleAudio = useCallback(async () => {
    if (!audioManagerRef.current) {
      throw new Error('Audio manager not initialized');
    }

    log('info', `Toggling audio: ${isAudioEnabled ? 'off' : 'on'}`);
    
    if (isAudioEnabled) {
      await audioManagerRef.current.stopLocalAudio();
    } else {
      await audioManagerRef.current.startLocalAudio();
    }
  }, [isAudioEnabled, log]);

  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (selectedPeer && webrtcManagerRef.current) {
      webrtcManagerRef.current.sendTypingIndicator(selectedPeer.id, typing);
    }
  }, [selectedPeer]);

  const contextValue: ChatContextValue = {
    // Connection
    peers,
    selectedPeer,
    connectionStatus,
    
    // Messaging
    messages,
    sendMessage,
    
    // Audio
    isAudioEnabled,
    toggleAudio,
    audioLevel,
    remoteAudioLevel,
    localAudioStream,
    remoteAudioStream,
    
    // Peer Management
    selectPeer,
    disconnectPeer,
    
    // Typing
    isTyping,
    sendTypingIndicator
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext }