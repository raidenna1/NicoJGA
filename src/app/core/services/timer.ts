import { Service, signal, computed } from '@angular/core';

@Service()
export class Timer {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onExpire: (() => void) | null = null;

  readonly remainingSeconds = signal(0);
  readonly durationSeconds = signal(0);
  readonly isRunning = signal(false);
  readonly expired = signal(false);

  readonly progress = computed(() => {
    const duration = this.durationSeconds();
    return duration <= 0 ? 0 : 1 - this.remainingSeconds() / duration;
  });

  start(seconds: number, onExpire?: () => void): void {
    this.pause();
    this.durationSeconds.set(seconds);
    this.remainingSeconds.set(seconds);
    this.expired.set(false);
    this.onExpire = onExpire ?? null;
    this.resume();
  }

  resume(): void {
    if (this.isRunning() || this.remainingSeconds() <= 0) {
      return;
    }
    this.isRunning.set(true);
    this.intervalId = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      if (next <= 0) {
        this.remainingSeconds.set(0);
        this.expired.set(true);
        this.pause();
        this.onExpire?.();
      } else {
        this.remainingSeconds.set(next);
      }
    }, 1000);
  }

  pause(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning.set(false);
  }

  reset(): void {
    this.pause();
    this.expired.set(false);
    this.remainingSeconds.set(this.durationSeconds());
  }

  clear(): void {
    this.pause();
    this.expired.set(false);
    this.durationSeconds.set(0);
    this.remainingSeconds.set(0);
    this.onExpire = null;
  }
}
