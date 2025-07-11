export interface Message {
  id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp: Date;
  encrypted: boolean;
  isOwn: boolean;
}

export interface Peer {
  id: string;
  name: string;
  online: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  encryptionEstablished: boolean;
}

export interface ChatContextValue {
  // Connection
  peers: Peer[];
  selectedPeer: Peer | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  
  // Messaging
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  
  // Audio
  isAudioEnabled: boolean;
  toggleAudio: () => Promise<void>;
  audioLevel: number;
  remoteAudioLevel: number;
  localAudioStream: MediaStream | null;
  remoteAudioStream: MediaStream | null;
  
  // Peer Management
  selectPeer: (peer: Peer) => void;
  disconnectPeer: (peerId: string) => void;
  
  // Typing
  isTyping: boolean;
  sendTypingIndicator: (typing: boolean) => void;
}

export interface SecureChatProviderProps {
  signalingServer: string;
  username: string;
  iceServers?: RTCIceServer[];
  onError?: (error: Error) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onMessageReceived?: (message: Message) => void;
  debug?: boolean;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'verbose';
  children: React.ReactNode;
}

export interface AudioMeterProps {
  level: number;
  type: 'input' | 'output';
  isActive: boolean;
  label?: string;
  className?: string;
}

export interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  isActive: boolean;
  type: 'waveform' | 'frequency';
  color?: string;
  height?: number;
  className?: string;
}

export interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected';
  iceConnectionState?: string;
  className?: string;
}

export interface PeerListProps {
  peers: Peer[];
  selectedPeer: Peer | null;
  onPeerSelect: (peer: Peer) => void;
  myNodeId: string;
  myUsername: string;
  className?: string;
  showConnectionStatus?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export interface ChatInterfaceProps {
  className?: string;
  showAudioControls?: boolean;
  showConnectionStatus?: boolean;
  placeholder?: string;
}

export interface TypingIndicatorProps {
  className?: string;
}

// WebRTC Types
export interface RTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

// Encryption Types
export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

export interface KeyExchangeMessage {
  type: 'key_exchange';
  publicKey: number[];
  sender: string;
  timestamp: number;
  isResponse?: boolean;
}

// Audio Types
export interface AudioConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate?: number;
  channelCount?: number;
}

// Signaling Types
export interface SignalingMessage {
  type: string;
  [key: string]: any;
}

export interface PeerDiscoveryMessage extends SignalingMessage {
  type: 'peer_discovered';
  peerId: string;
  username: string;
}

export interface OfferMessage extends SignalingMessage {
  type: 'offer';
  targetPeer: string;
  payload: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends SignalingMessage {
  type: 'answer';
  targetPeer: string;
  payload: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends SignalingMessage {
  type: 'ice_candidate';
  targetPeer: string;
  payload: RTCIceCandidateInit;
}