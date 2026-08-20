import { Component, inject, signal } from '@angular/core';
import { ChallengeStore } from '../../core/services/challenge-store';
import { Challenge, ChallengeDraft, GAME_LABELS, gameOf } from '../../core/models/challenge';
import { ChallengeEditor } from '../challenge-editor/challenge-editor';

const MODE_LABELS: Record<string, string> = {
  classic: 'Classic 5v5',
  aram: 'ARAM',
  scrim: 'Scrim',
  normal: 'Normal',
  custom: 'Eigener Modus',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Offen',
  active: 'Läuft',
  success: 'Erfolg',
  failed: 'Gescheitert',
};

@Component({
  selector: 'app-schedule',
  imports: [ChallengeEditor],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class Schedule {
  protected readonly store = inject(ChallengeStore);

  protected readonly editorOpen = signal(false);
  protected readonly editingChallenge = signal<Challenge | null>(null);

  protected readonly modeLabels = MODE_LABELS;
  protected readonly statusLabels = STATUS_LABELS;

  // League challenges show their mode; challenges from an optional game show
  // the game name, since 'custom' would be meaningless for all of them.
  protected badgeFor(challenge: Challenge): string {
    const game = gameOf(challenge);
    return game === 'league'
      ? (MODE_LABELS[challenge.mode] ?? challenge.mode)
      : GAME_LABELS[game];
  }

  protected openCreate(): void {
    this.editingChallenge.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(challenge: Challenge): void {
    this.editingChallenge.set(challenge);
    this.editorOpen.set(true);
  }

  protected closeEditor(): void {
    this.editorOpen.set(false);
    this.editingChallenge.set(null);
  }

  protected handleSave(draft: ChallengeDraft): void {
    const editing = this.editingChallenge();
    if (editing) {
      this.store.updateChallenge(editing.id, draft);
    } else {
      this.store.addChallenge(draft);
    }
    this.closeEditor();
  }

  protected remove(challenge: Challenge): void {
    if (confirm(`"${challenge.title}" wirklich löschen?`)) {
      this.store.removeChallenge(challenge.id);
    }
  }

  protected setCurrent(challenge: Challenge): void {
    this.store.setCurrent(challenge.id);
  }

  protected moveUp(challenge: Challenge): void {
    this.store.moveUp(challenge.id);
  }

  protected moveDown(challenge: Challenge): void {
    this.store.moveDown(challenge.id);
  }

  protected formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  protected exportChallenges(): void {
    const json = this.store.exportChallengesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jga-challenges-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async importChallenges(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      this.store.importChallenges(JSON.parse(text));
    } catch {
      alert('Die Datei konnte nicht gelesen werden. Ist es eine gültige Challenges-JSON-Datei?');
    } finally {
      input.value = '';
    }
  }

  protected resetProgress(): void {
    if (
      confirm(
        'Fortschritt und Verlauf wirklich zurücksetzen? Alle Challenges werden wieder auf "Offen" gesetzt, der Verlauf wird geleert. Die Challenges selbst (Titel, Beschreibung, ...) bleiben erhalten.',
      )
    ) {
      this.store.resetProgress();
    }
  }
}
