import { Service, signal, computed, effect } from '@angular/core';
import { ActiveEffect, EffectKind } from '../models/active-effect';

const STORAGE_KEY = 'jga-active-state';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState(): ActiveEffect[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ActiveEffect[]) : [];
  } catch {
    return [];
  }
}

@Service()
export class ActiveStore {
  readonly effects = signal<ActiveEffect[]>(loadState());

  readonly activePunishments = computed(() =>
    this.effects().filter((entry) => entry.kind === 'punishment'),
  );

  readonly activeRewards = computed(() =>
    this.effects().filter((entry) => entry.kind === 'reward'),
  );

  readonly hasEffects = computed(() => this.effects().length > 0);

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.effects()));
    });
  }

  add(label: string, kind: EffectKind): void {
    this.effects.update((list) => [...list, { id: generateId(), label, kind }]);
  }

  // Removes a single effect once it has been served or cashed in.
  resolve(id: string): void {
    this.effects.update((list) => list.filter((entry) => entry.id !== id));
  }

  clear(): void {
    this.effects.set([]);
  }
}
