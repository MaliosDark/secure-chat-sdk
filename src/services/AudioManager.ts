export class AudioManager {
  private localAudioStream: MediaStream | null = null;
  private remoteAudioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;

  // Event handlers
  public onAudioLevelChanged: ((level: number, type: 'local' | 'remote') => void) | null = null;
  public onLocalAudioStateChanged: ((enabled: boolean, stream: MediaStream | null) => void) | null = null;
  public onRemoteAudioStreamChanged: ((stream: MediaStream | null) => void) | null = null;

  async startLocalAudio(): Promise<boolean> {
    try {
      if (this.localAudioStream) {
        console.log('🎤 Local audio already started');
        return true;
      }

      console.log('🎤 Starting local audio...');
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      await this.setupLocalAudioAnalysis();
      this.onLocalAudioStateChanged?.(true, this.localAudioStream);
      
      console.log('✅ Local audio started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start local audio:', error);
      this.onLocalAudioStateChanged?.(false, null);
      return false;
    }
  }

  async stopLocalAudio(): Promise<void> {
    if (this.localAudioStream) {
      console.log('🎤 Stopping local audio...');
      
      this.localAudioStream.getTracks().forEach(track => {
        track.stop();
      });

      this.localAudioStream = null;
      this.localAnalyser = null;
      
      this.onLocalAudioStateChanged?.(false, null);
      console.log('✅ Local audio stopped');
    }
  }

  setRemoteAudioStream(stream: MediaStream | null): void {
    this.remoteAudioStream = stream;
    
    if (stream) {
      this.setupRemoteAudioAnalysis();
    } else {
      this.remoteAnalyser = null;
    }
    
    this.onRemoteAudioStreamChanged?.(stream);
  }

  private async setupLocalAudioAnalysis(): Promise<void> {
    if (!this.localAudioStream) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.localAudioStream);
      this.localAnalyser = this.audioContext.createAnalyser();
      
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.localAnalyser);
      
      this.startAudioLevelMonitoring();
    } catch (error) {
      console.error('❌ Failed to setup local audio analysis:', error);
    }
  }

  private async setupRemoteAudioAnalysis(): Promise<void> {
    if (!this.remoteAudioStream) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.remoteAudioStream);
      this.remoteAnalyser = this.audioContext.createAnalyser();
      
      this.remoteAnalyser.fftSize = 256;
      this.remoteAnalyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.remoteAnalyser);
    } catch (error) {
      console.error('❌ Failed to setup remote audio analysis:', error);
    }
  }

  private startAudioLevelMonitoring(): void {
    const analyzeAudio = () => {
      // Analyze local audio
      if (this.localAnalyser) {
        const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
        this.localAnalyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = (average / 255) * 100;
        
        this.onAudioLevelChanged?.(level, 'local');
      }

      // Analyze remote audio
      if (this.remoteAnalyser) {
        const dataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
        this.remoteAnalyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = (average / 255) * 100;
        
        this.onAudioLevelChanged?.(level, 'remote');
      }

      this.animationFrame = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();
  }

  getLocalAudioStream(): MediaStream | null {
    return this.localAudioStream;
  }

  getRemoteAudioStream(): MediaStream | null {
    return this.remoteAudioStream;
  }

  isLocalAudioEnabled(): boolean {
    return this.localAudioStream !== null;
  }

  // Audio utilities
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('❌ Failed to get audio devices:', error);
      return [];
    }
  }

  async switchAudioDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.localAudioStream) {
        await this.stopLocalAudio();
      }

      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      await this.setupLocalAudioAnalysis();
      this.onLocalAudioStateChanged?.(true, this.localAudioStream);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to switch audio device:', error);
      return false;
    }
  }

  // Volume control
  setLocalAudioVolume(volume: number): void {
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        const constraints = track.getConstraints();
        track.applyConstraints({
          ...constraints,
          volume: Math.max(0, Math.min(1, volume))
        });
      });
    }
  }

  // Cleanup
  cleanup(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(track => track.stop());
      this.localAudioStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.localAnalyser = null;
    this.remoteAnalyser = null;
    this.remoteAudioStream = null;
  }
}