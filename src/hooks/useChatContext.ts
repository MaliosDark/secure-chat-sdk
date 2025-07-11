import { useContext } from 'react';
import { ChatContext } from '../providers/SecureChatProvider';
import type { ChatContextValue } from '../types';

export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a SecureChatProvider');
  }
  return context;
};

// Additional hooks for specific functionality
export const useMessages = () => {
  const { messages, sendMessage } = useChatContext();
  return { messages, sendMessage };
};

export const usePeers = () => {
  const { peers, selectedPeer, selectPeer, disconnectPeer } = useChatContext();
  return { peers, selectedPeer, selectPeer, disconnectPeer };
};

export const useAudio = () => {
  const { 
    isAudioEnabled, 
    toggleAudio, 
    audioLevel, 
    remoteAudioLevel,
    localAudioStream,
    remoteAudioStream 
  } = useChatContext();
  
  return { 
    isAudioEnabled, 
    toggleAudio, 
    audioLevel, 
    remoteAudioLevel,
    localAudioStream,
    remoteAudioStream 
  };
};

export const useConnection = () => {
  const { connectionStatus } = useChatContext();
  return { connectionStatus };
};

export const useTyping = () => {
  const { isTyping, sendTypingIndicator } = useChatContext();
  return { isTyping, sendTypingIndicator };
};