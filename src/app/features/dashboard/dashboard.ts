import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChallengeStore } from '../../core/services/challenge-store';
import { Timer } from '../../core/services/timer';
import { WakeLock } from '../../core/services/wake-lock';
import { WheelStore } from '../../core/services/wheel-store';
import { BonusStore } from '../../core/services/bonus-store';
import { ActiveStore } from '../../core/services/active-store';
import { WheelEntry } from '../../core/models/wheel-entry';
import { GAME_LABELS, gameKeyFromLabel, gameOf } from '../../core/models/challenge';
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
  protected readonly bonusStore = inject(BonusStore);
  protected readonly activeStore = inject(ActiveStore);
  private readonly wakeLock = inject(WakeLock);

  protected readonly current = this.store.currentChallenge;
  protected readonly outcome = signal<Outcome | null>(null);
  protected readonly revealedEntry = signal<WheelEntry | null>(null);

  protected readonly gateOpen = signal(false);
  protected readonly gameWheelOpen = signal(false);
  protected readonly revealedGame = signal<WheelEntry | null>(null);
  protected readonly bonusRewardOpen = signal(false);
  protected readonly bonusReward = signal<WheelEntry | null>(null);

  // Bonus challenges are League-specific, so the panel is hidden while an
  // optional game is running.
  protected readonly showBonusPanel = computed(() => {
    const challenge = this.current();
    return challenge !== null && gameOf(challenge) === 'league';
  });

  protected readonly hasUpcoming = computed(() => this.store.pendingChallenges().length > 0);

  protected readonly modeLabel = computed(() => {
    const challenge = this.current();
    if (!challenge) {
      return '';
    }
    // League challenges are distinguished by mode; other games by their name.
    const game = gameOf(challenge);
    return game === 'league' ? (MODE_LABELS[challenge.mode] ?? challenge.mode) : GAME_LABELS[game];
  });

  // Hand-added wheel entries have no challenge set behind them.
  protected readonly drawnGameHasChallenges = computed(() => {
    const game = this.revealedGame();
    return game !== null && gameKeyFromLabel(game.label) !== null;
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

  // Only failures spin - succeeding a challenge just means no punishment.
  // Rewards come exclusively from bonus challenges.
  protected onSpinResult(entry: WheelEntry): void {
    this.revealedEntry.set(entry);
    this.wheelStore.markPunishmentUsed(entry.id);
    this.activeStore.add(entry.label, 'punishment');
  }

  protected continueToNext(): void {
    // The gate interrupts the run instead of rolling straight into challenge 9.
    if (this.store.gateDue()) {
      this.outcome.set(null);
      this.revealedEntry.set(null);
      this.store.currentChallengeId.set(null);
      this.gateOpen.set(true);
      return;
    }
    this.store.advanceToNext();
  }

  protected gateContinueLeague(): void {
    this.store.answerGate();
    this.gateOpen.set(false);
    this.store.advanceToNext();
  }

  protected gateSpinForGame(): void {
    this.store.answerGate();
    this.gateOpen.set(false);
    this.openGameWheel();
  }

  protected startNext(): void {
    const next = this.store.pendingChallenges()[0];
    if (next) {
      this.store.setCurrent(next.id);
    }
  }

  protected openGameWheel(): void {
    this.revealedGame.set(null);
    this.gameWheelOpen.set(true);
  }

  protected closeGameWheel(): void {
    this.gameWheelOpen.set(false);
    this.revealedGame.set(null);
  }

  protected onGameSpinResult(entry: WheelEntry): void {
    this.revealedGame.set(entry);
    this.wheelStore.markGameUsed(entry.id);
  }

  // Adds the drawn game's challenges to the Zeitplan and starts the first one.
  protected startDrawnGame(): void {
    const game = this.revealedGame();
    this.gameWheelOpen.set(false);
    this.revealedGame.set(null);
    if (!game) {
      return;
    }
    const key = gameKeyFromLabel(game.label);
    if (key) {
      this.store.unlockGame(key);
    }
  }

  protected continueLeague(): void {
    this.store.advanceToNext();
  }

  protected toggleBonus(id: string): void {
    const wasCompleted =
      this.bonusStore.bonusChallenges().find((entry) => entry.id === id)?.completed ?? false;
    this.bonusStore.toggle(id);
    // Only a fresh completion earns a reward spin - unticking a mistake must not.
    if (!wasCompleted) {
      this.bonusReward.set(null);
      this.bonusRewardOpen.set(true);
    }
  }

  protected onBonusRewardSpin(entry: WheelEntry): void {
    this.bonusReward.set(entry);
    this.wheelStore.markRewardUsed(entry.id);
    this.activeStore.add(entry.label, 'reward');
  }

  protected resolveEffect(id: string): void {
    this.activeStore.resolve(id);
  }

  protected closeBonusReward(): void {
    this.bonusRewardOpen.set(false);
    this.bonusReward.set(null);
  }

  protected formatTime(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
