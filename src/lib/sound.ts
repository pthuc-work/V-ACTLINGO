// ==============================================================================
// V-ACT HUB: Web Audio API Sound Synthesizer (Zero External Audio Files)
// ==============================================================================

export type SoundEffectType =
  | 'correct'
  | 'incorrect'
  | 'lessonComplete'
  | 'starMilestone'
  | 'streakFreezeUsed';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    this.initSettings();
  }

  private initSettings() {
    if (typeof window === 'undefined') return;

    // Check localStorage setting first
    let stored: string | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem('vact_sound_enabled');
      }
    } catch {
      // Ignore security errors in sandboxed iframes/environments
    }

    if (stored !== null) {
      this.soundEnabled = stored === 'true';
    } else {
      // Respect prefers-reduced-motion as an initial hint if desired, default to true
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      this.soundEnabled = !prefersReduced;
    }
  }

  public isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    // Check prefers-reduced-motion if user hasn't explicitly enabled sound
    let stored: string | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem('vact_sound_enabled');
      }
    } catch {
      // Ignore
    }

    if (stored === null) {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      if (prefersReduced) return false;
    }
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vact_sound_enabled', enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // AudioContext resume might fail if no user gesture yet
      });
    }

    return this.ctx;
  }

  /**
   * Sound 1: Correct answer (Bright ascending chime C5 -> G5)
   */
  public playCorrect(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.28); // C6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  }

  /**
   * Sound 2: Incorrect answer (Gentle low descending buzzer)
   */
  public playIncorrect(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Sound 3: Lesson Complete (Victorious melodic arpeggio C5 -> E5 -> G5 -> C6)
   */
  public playLessonComplete(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const duration = idx === notes.length - 1 ? 0.6 : 0.25;
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + duration);
    });
  }

  /**
   * Sound 4: Star Milestone (Magical high sparkle twinkle)
   */
  public playStarMilestone(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });
  }

  /**
   * Sound 5: Streak Freeze Used (Icy crystalline shimmer & freeze whoosh)
   */
  public playStreakFreezeUsed(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Resonant crystal bell
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.4);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.35);
  }

  /**
   * General dispatch method
   */
  public play(type: SoundEffectType): void {
    switch (type) {
      case 'correct':
        this.playCorrect();
        break;
      case 'incorrect':
        this.playIncorrect();
        break;
      case 'lessonComplete':
        this.playLessonComplete();
        break;
      case 'starMilestone':
        this.playStarMilestone();
        break;
      case 'streakFreezeUsed':
        this.playStreakFreezeUsed();
        break;
    }
  }
}

// Singleton export
export const soundManager = new SoundSynthesizer();

export function playSound(type: SoundEffectType): void {
  soundManager.play(type);
}

export function playCorrectSound(): void {
  soundManager.playCorrect();
}

export function playIncorrectSound(): void {
  soundManager.playIncorrect();
}

export function playLessonCompleteSound(): void {
  soundManager.playLessonComplete();
}

export function playStarMilestoneSound(): void {
  soundManager.playStarMilestone();
}

export function playStreakFreezeUsedSound(): void {
  soundManager.playStreakFreezeUsed();
}

export function isSoundEnabled(): boolean {
  return soundManager.isEnabled();
}

export function setSoundEnabled(enabled: boolean): void {
  soundManager.setEnabled(enabled);
}
