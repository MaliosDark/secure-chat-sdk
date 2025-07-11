import { EncryptionService } from './EncryptionService';
import type { RTCConfiguration } from '../types';

export class WebRTCManager {
  private nodeId: string;
  private username: string;
  private encryptionService: EncryptionService;
  private signalingSocket: WebSocket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private connectionStates: Map<string, string> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private iceServers: RTCIceServer[];

  // Event handlers
  public onPeerDiscovered: ((peerId: string, username: string) => void) | null = null;
  public onPeerDisconnected: ((peerId: string) => void) | null = null;
  public onMessageReceived: ((message: any) => void) | null = null;
  public onConnectionEstablished: ((peerId: string) => void) | null = null;
  public onEncryptionEstablished: ((peerId: string) => void) | null = null;
  public onConnectionStatusChanged: ((status: 'disconnected' | 'connecting' | 'connected') => void) | null = null;
  public onTypingIndicator: ((peerId: string, typing: boolean) => void) | null = null;
  public onRemoteAudioStream: ((peerId: string, stream: MediaStream) => void) | null = null;
  public onPeerConnectionStateChanged: ((peerId: string, state: string) => void) | null = null;

  constructor(
    nodeId: string, 
    username: string, 
    encryptionService: EncryptionService,
    customIceServers?: RTCIceServer[]
  ) {
    this.nodeId = nodeId;
    this.username = username;
    this.encryptionService = encryptionService;
    this.iceServers = customIceServers || this.getDefaultIceServers();
  }

  private getDefaultIceServers(): RTCIceServer[] {
    return [
      // STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      
      // Free TURN servers
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject", 
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ];
  }

  async connect(signalingServer: string): Promise<void> {
    try {
      console.log(`🔗 Connecting to signaling server: ${signalingServer}`);
      this.signalingSocket = new WebSocket(signalingServer);

      this.signalingSocket.onopen = () => {
        console.log('✅ Connected to signaling server');
        this.onConnectionStatusChanged?.('connected');
        
        this.sendToSignalingServer({
          type: 'join',
          nodeId: this.nodeId,
          username: this.username
        });
        
        this.startAutoDiscovery();
      };

      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.signalingSocket.onclose = () => {
        console.log('❌ Disconnected from signaling server');
        this.onConnectionStatusChanged?.('disconnected');
      };

      this.signalingSocket.onerror = (error) => {
        console.error('❌ Signaling socket error:', error);
      };

      this.onConnectionStatusChanged?.('connecting');

    } catch (error) {
      console.error('❌ Failed to connect to signaling server:', error);
      this.onConnectionStatusChanged?.('disconnected');
    }
  }

  private handleSignalingMessage(message: any): void {
    switch (message.type) {
      case 'peer_discovered':
        this.onPeerDiscovered?.(message.peerId, message.username || message.peerId.substring(0, 12));
        break;

      case 'peer_disconnected':
        this.handlePeerDisconnected(message.peerId);
        break;

      case 'discovery_ping':
        if (message.nodeId !== this.nodeId) {
          this.sendToSignalingServer({
            type: 'discovery_pong',
            nodeId: this.nodeId,
            username: this.username,
            targetNode: message.nodeId,
            timestamp: Date.now()
          });
          this.onPeerDiscovered?.(message.nodeId, message.username || message.nodeId.substring(0, 12));
        }
        break;

      case 'discovery_pong':
        if (message.targetNode === this.nodeId && message.nodeId !== this.nodeId) {
          this.onPeerDiscovered?.(message.nodeId, message.username || message.nodeId.substring(0, 12));
        }
        break;

      case 'offer':
        this.handleOffer(message.senderId, message.payload);
        break;

      case 'answer':
        this.handleAnswer(message.senderId, message.payload);
        break;

      case 'ice_candidate':
        this.handleIceCandidate(message.senderId, message.payload);
        break;

      default:
        // Ignore unknown messages
        break;
    }
  }

  async connectToPeer(peerId: string): Promise<void> {
    const existingConnection = this.peerConnections.get(peerId);
    if (existingConnection && existingConnection.connectionState === 'connected') {
      console.log(`Already connected to peer ${peerId}`);
      return;
    }

    console.log(`🔗 Initiating connection to peer ${peerId}`);

    try {
      const peerConnection = await this.createPeerConnection(peerId);
      this.peerConnections.set(peerId, peerConnection);

      // Create data channel
      const dataChannel = peerConnection.createDataChannel('messages', { ordered: true });
      this.setupDataChannel(dataChannel, peerId);

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.sendToSignalingServer({
        type: 'offer',
        targetPeer: peerId,
        payload: offer
      });

    } catch (error) {
      console.error(`❌ Failed to connect to peer ${peerId}:`, error);
      this.handlePeerDisconnected(peerId);
    }
  }

  private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const configuration: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`🔗 Connection state with ${peerId}: ${state}`);
      this.connectionStates.set(peerId, state);
      this.onPeerConnectionStateChanged?.(peerId, state);
      
      if (state === 'failed') {
        this.handlePeerDisconnected(peerId);
      }
    };

    // ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log(`🧊 ICE connection state with ${peerId}: ${state}`);
      
      if (state === 'failed') {
        console.log(`🔄 ICE connection failed with ${peerId}, attempting restart`);
        peerConnection.restartIce();
      } else if (state === 'disconnected') {
        setTimeout(() => {
          if (peerConnection.iceConnectionState === 'disconnected') {
            this.handlePeerDisconnected(peerId);
          }
        }, 10000);
      }
    };

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendToSignalingServer({
          type: 'ice_candidate',
          targetPeer: peerId,
          payload: event.candidate
        });
      }
    };

    // Data channel handling
    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    // Audio track handling
    peerConnection.ontrack = (event) => {
      if (event.track.kind === 'audio') {
        const remoteStream = event.streams[0];
        this.onRemoteAudioStream?.(peerId, remoteStream);
      }
    };

    return peerConnection;
  }

  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string): void {
    this.dataChannels.set(peerId, dataChannel);
    
    dataChannel.onopen = () => {
      console.log(`📡 Data channel opened with ${peerId}`);
      setTimeout(() => {
        this.performKeyExchange(peerId);
      }, 1500);
    };

    dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data, peerId);
    };

    dataChannel.onclose = () => {
      console.log(`📡 Data channel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`❌ Data channel error with ${peerId}:`, error);
    };
  }

  private async performKeyExchange(peerId: string): Promise<void> {
    try {
      const dataChannel = this.dataChannels.get(peerId);
      if (!dataChannel || dataChannel.readyState !== 'open') {
        console.error(`❌ Data channel not ready for key exchange with ${peerId}`);
        return;
      }

      if (this.encryptionService.hasSharedKey(peerId)) {
        console.log(`🔐 Shared key already exists for ${peerId}`);
        this.onEncryptionEstablished?.(peerId);
        return;
      }

      const publicKey = await this.encryptionService.getPublicKey();
      const keyExchangeMessage = {
        type: 'key_exchange',
        publicKey: Array.from(publicKey),
        sender: this.nodeId,
        timestamp: Date.now()
      };

      dataChannel.send(JSON.stringify(keyExchangeMessage));
      console.log(`🔐 Key exchange initiated with ${peerId}`);
    } catch (error) {
      console.error(`❌ Key exchange failed with ${peerId}:`, error);
    }
  }

  private async handleDataChannelMessage(data: string, peerId: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'key_exchange':
          await this.handleKeyExchange(message, peerId);
          break;

        case 'encrypted_message':
          await this.handleEncryptedMessage(message, peerId);
          break;

        case 'typing_indicator':
          this.onTypingIndicator?.(peerId, message.typing);
          break;

        default:
          console.log('Unknown data channel message:', message);
      }
    } catch (error) {
      console.error('❌ Failed to handle data channel message:', error);
    }
  }

  private async handleKeyExchange(message: any, peerId: string): Promise<void> {
    try {
      if (this.encryptionService.hasSharedKey(peerId)) {
        this.onEncryptionEstablished?.(peerId);
        return;
      }

      const peerPublicKey = new Uint8Array(message.publicKey);
      await this.encryptionService.establishSharedKey(peerId, peerPublicKey);

      // Send our public key back if this isn't a response
      const dataChannel = this.dataChannels.get(peerId);
      if (dataChannel && dataChannel.readyState === 'open' && !message.isResponse) {
        const publicKey = await this.encryptionService.getPublicKey();
        const keyExchangeMessage = {
          type: 'key_exchange',
          publicKey: Array.from(publicKey),
          sender: this.nodeId,
          isResponse: true,
          timestamp: Date.now()
        };
        dataChannel.send(JSON.stringify(keyExchangeMessage));
      }

      this.onEncryptionEstablished?.(peerId);
    } catch (error) {
      console.error(`❌ Key exchange handling failed with ${peerId}:`, error);
    }
  }

  private async handleEncryptedMessage(message: any, peerId: string): Promise<void> {
    try {
      const decryptedContent = await this.encryptionService.decrypt(
        new Uint8Array(message.ciphertext),
        new Uint8Array(message.iv),
        peerId
      );

      const messageData = JSON.parse(new TextDecoder().decode(decryptedContent));
      
      this.onMessageReceived?.({
        content: messageData.content,
        sender: peerId,
        encrypted: true
      });
    } catch (error) {
      console.error(`❌ Failed to decrypt message from ${peerId}:`, error);
    }
  }

  async sendMessage(peerId: string, content: string): Promise<void> {
    try {
      const dataChannel = this.dataChannels.get(peerId);
      if (!dataChannel || dataChannel.readyState !== 'open') {
        throw new Error(`Data channel not available for ${peerId}`);
      }

      const messageData = {
        content,
        timestamp: Date.now(),
        sender: this.nodeId
      };

      const plaintext = new TextEncoder().encode(JSON.stringify(messageData));
      const { ciphertext, iv } = await this.encryptionService.encrypt(plaintext, peerId);

      const encryptedMessage = {
        type: 'encrypted_message',
        ciphertext: Array.from(ciphertext),
        iv: Array.from(iv),
        sender: this.nodeId
      };

      dataChannel.send(JSON.stringify(encryptedMessage));
    } catch (error) {
      console.error(`❌ Failed to send message to ${peerId}:`, error);
      throw error;
    }
  }

  sendTypingIndicator(peerId: string, typing: boolean): void {
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel && dataChannel.readyState === 'open') {
      const message = {
        type: 'typing_indicator',
        typing,
        sender: this.nodeId
      };
      dataChannel.send(JSON.stringify(message));
    }
  }

  private async handleOffer(senderId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = await this.createPeerConnection(senderId);
      this.peerConnections.set(senderId, peerConnection);

      await peerConnection.setRemoteDescription(offer);
      await this.processPendingIceCandidates(senderId, peerConnection);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.sendToSignalingServer({
        type: 'answer',
        targetPeer: senderId,
        payload: answer
      });
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      this.handlePeerDisconnected(senderId);
    }
  }

  private async handleAnswer(senderId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(senderId);
      if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(answer);
        await this.processPendingIceCandidates(senderId, peerConnection);
      }
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      this.handlePeerDisconnected(senderId);
    }
  }

  private async handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(senderId);
      
      if (peerConnection) {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(candidate);
        } else {
          if (!this.pendingIceCandidates.has(senderId)) {
            this.pendingIceCandidates.set(senderId, []);
          }
          this.pendingIceCandidates.get(senderId)!.push(candidate);
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  private async processPendingIceCandidates(peerId: string, peerConnection: RTCPeerConnection): Promise<void> {
    const pendingCandidates = this.pendingIceCandidates.get(peerId);
    if (pendingCandidates && pendingCandidates.length > 0) {
      for (const candidate of pendingCandidates) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error(`❌ Failed to add queued ICE candidate for ${peerId}:`, error);
        }
      }
      this.pendingIceCandidates.delete(peerId);
    }
  }

  private startAutoDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    this.sendDiscoveryPing();
    this.discoveryInterval = setInterval(() => {
      this.sendDiscoveryPing();
    }, 15000);
  }

  private sendDiscoveryPing(): void {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.sendToSignalingServer({
        type: 'discovery_ping',
        nodeId: this.nodeId,
        username: this.username,
        timestamp: Date.now()
      });
    }
  }

  private handlePeerDisconnected(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }

    this.dataChannels.delete(peerId);
    this.pendingIceCandidates.delete(peerId);
    this.connectionStates.delete(peerId);
    this.encryptionService.removeSharedKey(peerId);
    
    this.onPeerDisconnected?.(peerId);
  }

  disconnectFromPeer(peerId: string): void {
    this.handlePeerDisconnected(peerId);
  }

  private sendToSignalingServer(message: any): void {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.pendingIceCandidates.clear();
    this.connectionStates.clear();

    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
  }
}