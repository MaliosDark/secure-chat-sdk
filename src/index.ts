// Core exports
export { SecureChatProvider } from './providers/SecureChatProvider';
export { useChatContext } from './hooks/useChatContext';

// Component exports
export { ChatInterface } from './components/ChatInterface';
export { PeerList } from './components/PeerList';
export { MessageBubble } from './components/MessageBubble';
export { AudioMeter } from './components/AudioMeter';
export { AudioVisualizer } from './components/AudioVisualizer';
export { ConnectionStatus } from './components/ConnectionStatus';
export { TypingIndicator } from './components/TypingIndicator';

// Service exports
export { EncryptionService } from './services/EncryptionService';
export { WebRTCManager } from './services/WebRTCManager';
export { AudioManager } from './services/AudioManager';

// Type exports
export type {
  Message,
  Peer,
  ChatContextValue,
  SecureChatProviderProps,
  AudioMeterProps,
  AudioVisualizerProps,
  ConnectionStatusProps,
  PeerListProps,
  MessageBubbleProps,
  ChatInterfaceProps
} from './types';

// Utility exports
export { createSecureId, validateMessage, formatTimestamp } from './utils';