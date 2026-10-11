// Audio utility for Power House Walkie-Talkie sounds, AudioContext management and microphone reuse

class AudioManager {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  private activeMicStream: MediaStream | null = null;
  private micPermissionState: 'prompt' | 'granted' | 'denied' | 'unknown' = 'unknown';

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.autoplay = true;
      (this.audioElement as any).playsInline = true;

      // Check current browser permission state if Permissions API is supported
      if ('permissions' in navigator && (navigator.permissions as any).query) {
        try {
          (navigator.permissions as any).query({ name: 'microphone' }).then((status: any) => {
            this.micPermissionState = status.state;
            status.onchange = () => {
              this.micPermissionState = status.state;
            };
          }).catch(() => {});
        } catch {
          // Ignore
        }
      }
    }
  }

  getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (this.audioElement) {
        this.audioElement.srcObject = null;
        await this.audioElement.play().catch(() => {});
      }
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  isAudioUnlocked(): boolean {
    return this.isUnlocked && (!this.ctx || this.ctx.state === 'running');
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  playIncomingStream(stream: MediaStream): void {
    if (this.audioElement) {
      this.audioElement.srcObject = stream;
      this.audioElement.play().catch(err => {
        console.warn('Playback prevented by autoplay policy. Waiting for user interaction:', err);
      });
    }
  }

  stopIncomingStream(): void {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }

  /**
   * Acquire or reuse persistent microphone stream without prompting every time.
   * Tracks are enabled when transmitting and disabled (muted) when idle to save power and privacy.
   */
  async acquireMicrophone(): Promise<MediaStream> {
    // 1. If we already hold an active stream with valid live tracks, re-enable them
    if (this.activeMicStream) {
      const audioTracks = this.activeMicStream.getAudioTracks();
      const hasLiveTrack = audioTracks.some(t => t.readyState === 'live');
      if (hasLiveTrack) {
        audioTracks.forEach(t => {
          t.enabled = true;
        });
        return this.activeMicStream;
      }
    }

    // 2. Request microphone stream from browser
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.activeMicStream = stream;
      this.micPermissionState = 'granted';
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.micPermissionState = 'denied';
      }
      throw err;
    }
  }

  /**
   * Called when PTT is released. Disables audio tracks so no background noise is captured,
   * but preserves stream reference to avoid repeated browser permission prompts.
   */
  muteMicrophone(): void {
    if (this.activeMicStream) {
      this.activeMicStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  /**
   * Full teardown on logout or unmount.
   */
  releaseMicrophone(): void {
    if (this.activeMicStream) {
      this.activeMicStream.getTracks().forEach(track => {
        track.stop();
      });
      this.activeMicStream = null;
    }
  }

  getMicPermissionState(): 'prompt' | 'granted' | 'denied' | 'unknown' {
    return this.micPermissionState;
  }

  // Tactical Power House PTT Transmit Beep
  playPttStartBeep(): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext not started yet
    }
  }

  // Tactical Roger Chirp on PTT Release
  playPttEndBeep(): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignore
    }
  }
}

export const audioManager = new AudioManager();
