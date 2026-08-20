import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Challenge, ChallengeDraft, ChallengeMode } from '../../core/models/challenge';

@Component({
  selector: 'app-challenge-editor',
  imports: [FormsModule],
  templateUrl: './challenge-editor.html',
  styleUrl: './challenge-editor.scss',
})
export class ChallengeEditor {
  readonly challenge = input<Challenge | null>(null);
  readonly save = output<ChallengeDraft>();
  readonly cancel = output<void>();

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly mode = signal<ChallengeMode>('classic');
  protected readonly timeLimitMinutes = signal<number | null>(null);

  protected readonly isEdit = computed(() => this.challenge() !== null);
  protected readonly hasTimeLimit = computed(() => this.timeLimitMinutes() !== null);

  constructor() {
    effect(() => {
      const c = this.challenge();
      this.title.set(c?.title ?? '');
      this.description.set(c?.description ?? '');
      this.mode.set(c?.mode ?? 'classic');
      this.timeLimitMinutes.set(c?.timeLimitMinutes ?? null);
    });
  }

  protected toggleTimeLimit(checked: boolean): void {
    this.timeLimitMinutes.set(checked ? 5 : null);
  }

  protected submit(): void {
    if (!this.title().trim()) {
      return;
    }
    this.save.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      mode: this.mode(),
      timeLimitMinutes: this.timeLimitMinutes(),
    });
  }
}
