// ID Generation
export const createSecureId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
};

// Message Validation
export const validateMessage = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Check length (max 10KB)
  if (content.length > 10240) {
    return false;
  }
  
  // Basic XSS prevention
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
};

// Time Formatting
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // More than 24 hours
  return date.toLocaleDateString();
};

// Peer ID Utilities
export const truncatePeerId = (peerId: string, length: number = 8): string => {
  return peerId.length > length ? `${peerId.substring(0, length)}...` : peerId;
};

// Audio Utilities
export const getAudioConstraints = (deviceId?: string) => {
  const constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  };
  
  if (deviceId) {
    constraints.deviceId = { exact: deviceId };
  }
  
  return constraints;
};

// Security Utilities
export const sanitizeUsername = (username: string): string => {
  return username
    .replace(/[<>\"'&]/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 50); // Limit length
};

export const isValidPeerId = (peerId: string): boolean => {
  return /^[a-zA-Z0-9\-_]+$/.test(peerId) && peerId.length >= 8 && peerId.length <= 64;
};

// Network Utilities
export const getConnectionQuality = (rtt?: number, packetLoss?: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (!rtt) return 'poor';
  
  const loss = packetLoss || 0;
  
  if (rtt < 50 && loss < 0.01) return 'excellent';
  if (rtt < 100 && loss < 0.02) return 'good';
  if (rtt < 200 && loss < 0.05) return 'fair';
  return 'poor';
};

// Error Handling
export class SecureChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SecureChatError';
  }
}

export const createError = (code: string, message: string, details?: any): SecureChatError => {
  return new SecureChatError(message, code, details);
};

// Debounce Utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Local Storage Utilities
export const getStorageItem = (key: string, defaultValue?: any): any => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};