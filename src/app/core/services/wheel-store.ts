import { Service, signal, computed, effect } from '@angular/core';
import { WheelEntry } from '../models/wheel-entry';

const STORAGE_KEY = 'jga-wheel-state';

interface WheelState {
  punishments: WheelEntry[];
  rewards: WheelEntry[];
  usedPunishmentIds: string[];
  usedRewardIds: string[];
}

const DEFAULT_PUNISHMENTS: string[] = [
  '20 Liegestütze',
  'Anime-Girl-Dance nachtanzen',
  'Tequila- oder Pfeffi-Shot',
  'Ein kurzes Liebesgedicht für Steffi aufsagen',
  'Die nächsten 10 Minuten nur in Dialekt oder in Reimen sprechen',
  'Nächstes Spiel mit Augenklappe (ein Auge zu) spielen',
];

const DEFAULT_REWARDS: string[] = [
  'Ein Freund macht stattdessen 10 Liegestütze',
  'Du bestimmst den nächsten Spielmodus',
  'Joker: Eine zukünftige Bestrafung aussetzen',
  'Ein Freund übernimmt deinen nächsten Shot',
  'Du verpasst jemandem die Augenklappe für die nächste Runde',
];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toEntries(labels: string[]): WheelEntry[] {
  return labels.map((label) => ({ id: generateId(), label }));
}

function loadState(): WheelState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return {
      punishments: toEntries(DEFAULT_PUNISHMENTS),
      rewards: toEntries(DEFAULT_REWARDS),
      usedPunishmentIds: [],
      usedRewardIds: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WheelState>;
    return {
      punishments: parsed.punishments ?? [],
      rewards: parsed.rewards ?? [],
      usedPunishmentIds: parsed.usedPunishmentIds ?? [],
      usedRewardIds: parsed.usedRewardIds ?? [],
    };
  } catch {
    return { punishments: [], rewards: [], usedPunishmentIds: [], usedRewardIds: [] };
  }
}

@Service()
export class WheelStore {
  private readonly loaded = loadState();

  readonly punishments = signal<WheelEntry[]>(this.loaded.punishments);
  readonly rewards = signal<WheelEntry[]>(this.loaded.rewards);
  readonly usedPunishmentIds = signal<string[]>(this.loaded.usedPunishmentIds);
  readonly usedRewardIds = signal<string[]>(this.loaded.usedRewardIds);

  // Entries already hit are excluded until every entry has been hit once, at which point
  // the cycle reopens (minus the just-hit entry, see markPunishmentUsed/markRewardUsed) -
  // so nothing repeats immediately, but the pool never dead-ends into "nothing left to spin".
  readonly availablePunishments = computed(() => {
    const all = this.punishments();
    const unused = all.filter((entry) => !this.usedPunishmentIds().includes(entry.id));
    return unused.length > 0 ? unused : all;
  });

  readonly availableRewards = computed(() => {
    const all = this.rewards();
    const unused = all.filter((entry) => !this.usedRewardIds().includes(entry.id));
    return unused.length > 0 ? unused : all;
  });

  constructor() {
    effect(() => {
      const state: WheelState = {
        punishments: this.punishments(),
        rewards: this.rewards(),
        usedPunishmentIds: this.usedPunishmentIds(),
        usedRewardIds: this.usedRewardIds(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  addPunishment(label: string): void {
    this.punishments.update((list) => [...list, { id: generateId(), label }]);
  }

  removePunishment(id: string): void {
    this.punishments.update((list) => list.filter((entry) => entry.id !== id));
    this.usedPunishmentIds.update((ids) => ids.filter((usedId) => usedId !== id));
  }

  addReward(label: string): void {
    this.rewards.update((list) => [...list, { id: generateId(), label }]);
  }

  removeReward(id: string): void {
    this.rewards.update((list) => list.filter((entry) => entry.id !== id));
    this.usedRewardIds.update((ids) => ids.filter((usedId) => usedId !== id));
  }

  isPunishmentUsed(id: string): boolean {
    return this.usedPunishmentIds().includes(id);
  }

  isRewardUsed(id: string): boolean {
    return this.usedRewardIds().includes(id);
  }

  markPunishmentUsed(id: string): void {
    const all = this.punishments();
    const nextUsed = [...this.usedPunishmentIds().filter((usedId) => usedId !== id), id];
    const allUsed = all.every((entry) => nextUsed.includes(entry.id));
    this.usedPunishmentIds.set(allUsed ? [id] : nextUsed);
  }

  markRewardUsed(id: string): void {
    const all = this.rewards();
    const nextUsed = [...this.usedRewardIds().filter((usedId) => usedId !== id), id];
    const allUsed = all.every((entry) => nextUsed.includes(entry.id));
    this.usedRewardIds.set(allUsed ? [id] : nextUsed);
  }

  resetPunishmentUsage(): void {
    this.usedPunishmentIds.set([]);
  }

  resetRewardUsage(): void {
    this.usedRewardIds.set([]);
  }
}
