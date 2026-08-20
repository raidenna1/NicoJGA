import { Service, signal, computed, effect } from '@angular/core';
import { WheelEntry } from '../models/wheel-entry';

const STORAGE_KEY = 'jga-wheel-state';

interface WheelState {
  punishments: WheelEntry[];
  rewards: WheelEntry[];
  games: WheelEntry[];
  usedPunishmentIds: string[];
  usedRewardIds: string[];
  usedGameIds: string[];
}

const DEFAULT_PUNISHMENTS: string[] = [
  '20 Liegestütze · Wall-Sit bis zum nächsten Spielstart · 30 Sekunden Plank',
  'Anime-Girl-Dance oder TikTok-Dance nachtanzen',
  'Fortnite-Emote nachmachen bei jedem Kill innerhalb eines Games',
  'Werbespot drehen: "Warum ihr alle Steffi heiraten solltet"',
  'Liebesgedicht',
  'Öttinger exen',
  '1 Shot trinken',
  'Augenklappe',
  'Maus-Sensitivität verstellt / Hotkeys umbinden / Maus invertieren',
  'Champion wird vorgegeben',
  '1 Item-Slot weniger',
  'Ein Game live kommentieren',
  'Wortverbot – keine League-related Begriffe',
  'Wachsstreifen',
  'Chili',
  'Bronze Bravery (eventuell mit 1-3 Rerolls)',
];

// At least one per bonus challenge, so all 7 can be cashed in without the
// pool recycling. The first four come from the Excel, the rest fill it up to
// the "mind. 8" the sheet asked for.
const DEFAULT_REWARDS: string[] = [
  'Strafe weiterreichen',
  'Bestrafung abwehren',
  'Halbe Strafe',
  'Reroll bei Bestrafungsboard',
  'Joker: Eine Bestrafung später aussetzen',
  'Strafe aufteilen: Zwei Freunde machen je die Hälfte',
  'Nächste Bestrafung selbst aussuchen',
  'Ein Freund holt die nächste Runde Getränke',
];

const DEFAULT_GAMES: string[] = [
  'CS2',
  'GeoGuessr',
  'Golf With Your Friends',
  'Horror Game',
  'Valorant',
  'Fall Guys',
  'Minecraft',
  'Warzone',
];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toEntries(labels: string[]): WheelEntry[] {
  return labels.map((label) => ({ id: generateId(), label }));
}

function defaultState(): WheelState {
  return {
    punishments: toEntries(DEFAULT_PUNISHMENTS),
    rewards: toEntries(DEFAULT_REWARDS),
    games: toEntries(DEFAULT_GAMES),
    usedPunishmentIds: [],
    usedRewardIds: [],
    usedGameIds: [],
  };
}

function loadState(): WheelState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return defaultState();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WheelState>;
    return {
      punishments: parsed.punishments ?? [],
      rewards: parsed.rewards ?? [],
      // Seeded rather than empty so saves written before the games wheel existed
      // still come back with a usable pool instead of a blank wheel.
      games: parsed.games ?? toEntries(DEFAULT_GAMES),
      usedPunishmentIds: parsed.usedPunishmentIds ?? [],
      usedRewardIds: parsed.usedRewardIds ?? [],
      usedGameIds: parsed.usedGameIds ?? [],
    };
  } catch {
    return defaultState();
  }
}

@Service()
export class WheelStore {
  private readonly loaded = loadState();

  readonly punishments = signal<WheelEntry[]>(this.loaded.punishments);
  readonly rewards = signal<WheelEntry[]>(this.loaded.rewards);
  readonly games = signal<WheelEntry[]>(this.loaded.games);
  readonly usedPunishmentIds = signal<string[]>(this.loaded.usedPunishmentIds);
  readonly usedRewardIds = signal<string[]>(this.loaded.usedRewardIds);
  readonly usedGameIds = signal<string[]>(this.loaded.usedGameIds);

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

  readonly availableGames = computed(() => {
    const all = this.games();
    const unused = all.filter((entry) => !this.usedGameIds().includes(entry.id));
    return unused.length > 0 ? unused : all;
  });

  constructor() {
    effect(() => {
      const state: WheelState = {
        punishments: this.punishments(),
        rewards: this.rewards(),
        games: this.games(),
        usedPunishmentIds: this.usedPunishmentIds(),
        usedRewardIds: this.usedRewardIds(),
        usedGameIds: this.usedGameIds(),
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

  addGame(label: string): void {
    this.games.update((list) => [...list, { id: generateId(), label }]);
  }

  removeGame(id: string): void {
    this.games.update((list) => list.filter((entry) => entry.id !== id));
    this.usedGameIds.update((ids) => ids.filter((usedId) => usedId !== id));
  }

  isGameUsed(id: string): boolean {
    return this.usedGameIds().includes(id);
  }

  markGameUsed(id: string): void {
    const all = this.games();
    const nextUsed = [...this.usedGameIds().filter((usedId) => usedId !== id), id];
    const allUsed = all.every((entry) => nextUsed.includes(entry.id));
    this.usedGameIds.set(allUsed ? [id] : nextUsed);
  }

  resetPunishmentUsage(): void {
    this.usedPunishmentIds.set([]);
  }

  resetRewardUsage(): void {
    this.usedRewardIds.set([]);
  }

  resetGameUsage(): void {
    this.usedGameIds.set([]);
  }

  // Discards every custom edit and restores the pools shipped with the app.
  resetToDefaults(): void {
    const state = defaultState();
    this.punishments.set(state.punishments);
    this.rewards.set(state.rewards);
    this.games.set(state.games);
    this.usedPunishmentIds.set([]);
    this.usedRewardIds.set([]);
    this.usedGameIds.set([]);
  }
}
