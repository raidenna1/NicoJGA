import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelStore } from '../../core/services/wheel-store';
import { BonusStore } from '../../core/services/bonus-store';
import { ActiveStore } from '../../core/services/active-store';
import { ChallengeStore } from '../../core/services/challenge-store';
import { Wheel } from '../wheel/wheel';

@Component({
  selector: 'app-wheel-settings',
  imports: [FormsModule, Wheel],
  templateUrl: './wheel-settings.html',
  styleUrl: './wheel-settings.scss',
})
export class WheelSettings {
  protected readonly store = inject(WheelStore);
  private readonly bonusStore = inject(BonusStore);
  private readonly activeStore = inject(ActiveStore);
  private readonly challengeStore = inject(ChallengeStore);

  protected readonly newPunishment = signal('');
  protected readonly newReward = signal('');
  protected readonly newGame = signal('');

  protected addPunishment(): void {
    const label = this.newPunishment().trim();
    if (!label) {
      return;
    }
    this.store.addPunishment(label);
    this.newPunishment.set('');
  }

  protected addReward(): void {
    const label = this.newReward().trim();
    if (!label) {
      return;
    }
    this.store.addReward(label);
    this.newReward.set('');
  }

  protected removePunishment(id: string): void {
    this.store.removePunishment(id);
  }

  protected removeReward(id: string): void {
    this.store.removeReward(id);
  }

  protected addGame(): void {
    const label = this.newGame().trim();
    if (!label) {
      return;
    }
    this.store.addGame(label);
    this.newGame.set('');
  }

  protected removeGame(id: string): void {
    this.store.removeGame(id);
  }

  protected resetPunishmentUsage(): void {
    this.store.resetPunishmentUsage();
  }

  protected resetRewardUsage(): void {
    this.store.resetRewardUsage();
  }

  protected resetGameUsage(): void {
    this.store.resetGameUsage();
  }

  protected resetEverythingToDefaults(): void {
    if (
      !confirm(
        'Alle Listen auf die Standard-Daten zurücksetzen?\n\n' +
          'Bestrafungen, Belohnungen, Games, Challenges und Bonus-Challenges werden neu geladen. ' +
          'Eigene Einträge, der Fortschritt und der Verlauf gehen dabei verloren.',
      )
    ) {
      return;
    }
    this.store.resetToDefaults();
    this.bonusStore.resetToDefaults();
    this.challengeStore.resetToDefaults();
    this.activeStore.clear();
  }
}
