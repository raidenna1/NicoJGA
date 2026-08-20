import { Service } from '@angular/core';

@Service()
export class WakeLock {
  private sentinel: WakeLockSentinel | null = null;

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.sentinel === null) {
      void this.enable();
    }
  };

  get isSupported(): boolean {
    return 'wakeLock' in navigator;
  }

  async enable(): Promise<void> {
    if (!this.isSupported || this.sentinel) {
      return;
    }
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    } catch {
      this.sentinel = null;
    }
  }

  async disable(): Promise<void> {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }
}
