import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChallengeStore } from '../../core/services/challenge-store';
import { Timer } from '../../core/services/timer';
import { WakeLock } from '../../core/services/wake-lock';
import { WheelStore } from '../../core/services/wheel-store';
import { WheelEntry } from '../../core/models/wheel-entry';
import { Wheel } from '../wheel/wheel';

type Outcome = 'success' | 'failed';

const MODE_LABELS: Record<string, string> = {
  classic: 'Classic 5v5',
  aram: 'ARAM',
  scrim: 'Scrim',
  normal: 'Normal',
  custom: 'Eigener Modus',
};

@Component({
  selector: 'app-dashboard',
  imports: [Wheel],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly store = inject(ChallengeStore);
  protected readonly timer = inject(Timer);
  protected readonly wheelStore = inject(WheelStore);
  private readonly wakeLock = inject(WakeLock);

  protected readonly current = this.store.currentChallenge;
  protected readonly outcome = signal<Outcome | null>(null);
  protected readonly revealedEntry = signal<WheelEntry | null>(null);

  protected readonly hasUpcoming = computed(() => this.store.pendingChallenges().length > 0);

  protected readonly modeLabel = computed(() => {
    const challenge = this.current();
    return challenge ? (MODE_LABELS[challenge.mode] ?? challenge.mode) : '';
  });

  protected readonly minutes = computed(() => Math.floor(this.timer.remainingSeconds() / 60));
  protected readonly seconds = computed(() => this.timer.remainingSeconds() % 60);

  protected readonly timerNotStarted = computed(() => this.timer.durationSeconds() === 0);
  protected readonly timerActive = computed(() => this.timer.durationSeconds() > 0);
  protected readonly timerResumable = computed(
    () =>
      !this.timer.isRunning() && this.timer.durationSeconds() > 0 && this.timer.remainingSeconds() > 0,
  );

  private previousChallengeId: string | null = null;

  constructor() {
    effect(() => {
      const id = this.current()?.id ?? null;
      if (id !== this.previousChallengeId) {
        this.previousChallengeId = id;
        this.timer.clear();
        this.outcome.set(null);
        this.revealedEntry.set(null);
      }
    });
  }

  protected startTimer(): void {
    const challenge = this.current();
    if (!challenge?.timeLimitMinutes) {
      return;
    }
    this.timer.start(challenge.timeLimitMinutes * 60);
    void this.wakeLock.enable();
  }

  protected pauseTimer(): void {
    this.timer.pause();
    void this.wakeLock.disable();
  }

  protected resumeTimer(): void {
    this.timer.resume();
    void this.wakeLock.enable();
  }

  protected resetTimer(): void {
    this.timer.reset();
  }

  protected markResult(result: Outcome): void {
    this.timer.pause();
    void this.wakeLock.disable();
    this.store.resolveCurrent(result);
    this.revealedEntry.set(null);
    this.outcome.set(result);
  }

  protected onSpinResult(result: Outcome, entry: WheelEntry): void {
    this.revealedEntry.set(entry);
    if (result === 'failed') {
      this.wheelStore.markPunishmentUsed(entry.id);
    } else {
      this.wheelStore.markRewardUsed(entry.id);
    }
  }

  protected continueToNext(): void {
    this.store.advanceToNext();
  }

  protected startNext(): void {
    const next = this.store.pendingChallenges()[0];
    if (next) {
      this.store.setCurrent(next.id);
    }
  }

  protected formatTime(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
