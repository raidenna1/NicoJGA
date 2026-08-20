import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelStore } from '../../core/services/wheel-store';
import { Wheel } from '../wheel/wheel';

@Component({
  selector: 'app-wheel-settings',
  imports: [FormsModule, Wheel],
  templateUrl: './wheel-settings.html',
  styleUrl: './wheel-settings.scss',
})
export class WheelSettings {
  protected readonly store = inject(WheelStore);

  protected readonly newPunishment = signal('');
  protected readonly newReward = signal('');

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

  protected resetPunishmentUsage(): void {
    this.store.resetPunishmentUsage();
  }

  protected resetRewardUsage(): void {
    this.store.resetRewardUsage();
  }
}
