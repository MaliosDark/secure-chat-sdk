export class EncryptionService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKeys: Map<string, CryptoKey> = new Map();

  async initialize(): Promise<void> {
    try {
      // Use P-256 curve which has better browser support than X25519
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );
      
      console.log('🔐 Encryption service initialized with P-256 key pair');
    } catch (error) {
      console.error('❌ Failed to initialize encryption service:', error);
      throw error;
    }
  }

  async getPublicKey(): Promise<Uint8Array> {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }

    const exportedKey = await window.crypto.subtle.exportKey('raw', this.keyPair.publicKey);
    return new Uint8Array(exportedKey);
  }

  async establishSharedKey(peerId: string, peerPublicKey: Uint8Array): Promise<void> {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }

    // Check if we already have a shared key for this peer
    if (this.sharedKeys.has(peerId)) {
      console.log(`🔐 Shared key already exists for peer ${peerId}, skipping establishment`);
      return;
    }

    try {
      // Import peer's public key
      const importedPeerKey = await window.crypto.subtle.importKey(
        'raw',
        peerPublicKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );

      // Derive shared key using ECDH
      const sharedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: importedPeerKey
        },
        this.keyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      );

      this.sharedKeys.set(peerId, sharedKey);
      console.log(`✅ Shared key established with peer ${peerId}`);
    } catch (error) {
      console.error('❌ Failed to establish shared key:', error);
      throw error;
    }
  }

  async encrypt(plaintext: Uint8Array, peerId: string): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    const sharedKey = this.sharedKeys.get(peerId);
    if (!sharedKey) {
      throw new Error(`No shared key found for peer ${peerId}`);
    }

    try {
      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt using AES-GCM
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sharedKey,
        plaintext
      );

      return {
        ciphertext: new Uint8Array(ciphertext),
        iv: iv
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw error;
    }
  }

  async decrypt(ciphertext: Uint8Array, iv: Uint8Array, peerId: string): Promise<Uint8Array> {
    const sharedKey = this.sharedKeys.get(peerId);
    if (!sharedKey) {
      throw new Error(`No shared key found for peer ${peerId}`);
    }

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sharedKey,
        ciphertext
      );

      return new Uint8Array(decrypted);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  hasSharedKey(peerId: string): boolean {
    return this.sharedKeys.has(peerId);
  }

  removeSharedKey(peerId: string): void {
    this.sharedKeys.delete(peerId);
  }

  // Security utilities
  async generateSecureRandom(length: number): Promise<Uint8Array> {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }

  async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Key rotation for perfect forward secrecy
  async rotateKey(peerId: string): Promise<void> {
    this.removeSharedKey(peerId);
    // New key will be established on next key exchange
  }

  // Cleanup
  cleanup(): void {
    this.sharedKeys.clear();
    this.keyPair = null;
  }
}