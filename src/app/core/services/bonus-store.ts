import { Service, signal, computed, effect } from '@angular/core';
import { BonusChallenge } from '../models/challenge';

const STORAGE_KEY = 'jga-bonus-state';

// Earned at any point during any other challenge, so these stay tickable
// for the whole session instead of being played in sequence.
const DEFAULT_BONUS_CHALLENGES: string[] = [
  'Pentakill',
  'Objective stealen',
  'Meister Schaden',
  '4x First Blood',
  'Sieg unter 20 Minuten',
  'Höchste Kill-Beteiligung',
  '4/4 Drakes',
];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toBonusChallenges(labels: string[]): BonusChallenge[] {
  return labels.map((label) => ({ id: generateId(), label, completed: false }));
}

function loadState(): BonusChallenge[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return toBonusChallenges(DEFAULT_BONUS_CHALLENGES);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BonusChallenge[]) : [];
  } catch {
    return toBonusChallenges(DEFAULT_BONUS_CHALLENGES);
  }
}

@Service()
export class BonusStore {
  readonly bonusChallenges = signal<BonusChallenge[]>(loadState());

  readonly completedCount = computed(
    () => this.bonusChallenges().filter((entry) => entry.completed).length,
  );

  readonly openBonusChallenges = computed(() =>
    this.bonusChallenges().filter((entry) => !entry.completed),
  );

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bonusChallenges()));
    });
  }

  toggle(id: string): void {
    this.bonusChallenges.update((list) =>
      list.map((entry) => (entry.id === id ? { ...entry, completed: !entry.completed } : entry)),
    );
  }

  add(label: string): void {
    this.bonusChallenges.update((list) => [...list, { id: generateId(), label, completed: false }]);
  }

  remove(id: string): void {
    this.bonusChallenges.update((list) => list.filter((entry) => entry.id !== id));
  }

  resetProgress(): void {
    this.bonusChallenges.update((list) => list.map((entry) => ({ ...entry, completed: false })));
  }

  resetToDefaults(): void {
    this.bonusChallenges.set(toBonusChallenges(DEFAULT_BONUS_CHALLENGES));
  }
}
