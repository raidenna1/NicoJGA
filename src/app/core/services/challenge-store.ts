import { Service, signal, computed, effect } from '@angular/core';
import { Challenge, ChallengeDraft, ChallengeMode, HistoryEntry } from '../models/challenge';

const VALID_MODES: ChallengeMode[] = ['classic', 'aram', 'scrim', 'normal', 'custom'];

const STORAGE_KEY = 'jga-challenge-state';

interface PersistedState {
  challenges: Challenge[];
  currentChallengeId: string | null;
  history: HistoryEntry[];
}

const EMPTY_STATE: PersistedState = { challenges: [], currentChallengeId: null, history: [] };

const SEED_CHALLENGES: ChallengeDraft[] = [
  {
    title: 'Classic 5v5 – Autofill-Legende',
    description: 'Gewinnt ein Classic 5v5 mit Nico auf einer Autofill-Rolle (keine Rollentausch-Tricks).',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Classic 5v5 – Jungle-Gott',
    description: 'Nico spielt Jungler und gewinnt mit mindestens 6 Kills+Assists aus Gank-Situationen.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Scrim 1 – Perfect Game',
    description: 'Team gewinnt den Scrim, ohne dass Nico auch nur einmal stirbt (0 Deaths).',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Scrim 2 – Wunschgegner-Ban',
    description: 'Die Freunde bannen vorher einen Champion für Nico – trotzdem gewinnen.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Scrim 3 – Comeback-Sieg',
    description: 'Das Team liegt zwischenzeitlich mit 5+ Kills zurück und dreht die Partie trotzdem zum Sieg.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'ARAM 1 – Ohne Flucht',
    description: 'Gewinnt ein ARAM, ohne dass Nico einmal Zünder (Flash) benutzt.',
    mode: 'aram',
    timeLimitMinutes: 25,
  },
  {
    title: 'ARAM 2 – Poro-König',
    description: 'Gewinnt ein ARAM, bei dem Nico die höchste Kill-Participation im Team hat.',
    mode: 'aram',
    timeLimitMinutes: 25,
  },
  {
    title: 'Normal – 3 Wins mit Autofill',
    description: '3 gewonnene Normal-Spiele in Folge, jeweils mit Autofill-Rolle.',
    mode: 'normal',
    timeLimitMinutes: null,
  },
];

function loadState(): { state: PersistedState; isFirstRun: boolean } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { state: EMPTY_STATE, isFirstRun: true };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      state: {
        challenges: parsed.challenges ?? [],
        currentChallengeId: parsed.currentChallengeId ?? null,
        history: parsed.history ?? [],
      },
      isFirstRun: false,
    };
  } catch {
    return { state: EMPTY_STATE, isFirstRun: false };
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedChallenges(): Challenge[] {
  return SEED_CHALLENGES.map((draft) => ({ ...draft, id: generateId(), status: 'pending' }));
}

@Service()
export class ChallengeStore {
  private readonly loaded = loadState();

  readonly challenges = signal<Challenge[]>(
    this.loaded.isFirstRun ? seedChallenges() : this.loaded.state.challenges,
  );
  readonly currentChallengeId = signal<string | null>(this.loaded.state.currentChallengeId);
  readonly history = signal<HistoryEntry[]>(this.loaded.state.history);

  readonly currentChallenge = computed(
    () => this.challenges().find((c) => c.id === this.currentChallengeId()) ?? null,
  );

  readonly pendingChallenges = computed(() =>
    this.challenges().filter((c) => c.status === 'pending'),
  );

  constructor() {
    effect(() => {
      const state: PersistedState = {
        challenges: this.challenges(),
        currentChallengeId: this.currentChallengeId(),
        history: this.history(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  addChallenge(draft: ChallengeDraft): void {
    const challenge: Challenge = {
      ...draft,
      id: generateId(),
      status: 'pending',
    };
    this.challenges.update((list) => [...list, challenge]);
  }

  updateChallenge(id: string, draft: ChallengeDraft): void {
    this.challenges.update((list) => list.map((c) => (c.id === id ? { ...c, ...draft } : c)));
  }

  removeChallenge(id: string): void {
    this.challenges.update((list) => list.filter((c) => c.id !== id));
    if (this.currentChallengeId() === id) {
      this.currentChallengeId.set(null);
    }
  }

  moveUp(id: string): void {
    this.swap(id, -1);
  }

  moveDown(id: string): void {
    this.swap(id, 1);
  }

  private swap(id: string, offset: number): void {
    this.challenges.update((list) => {
      const index = list.findIndex((c) => c.id === id);
      const targetIndex = index + offset;
      if (index === -1 || targetIndex < 0 || targetIndex >= list.length) {
        return list;
      }
      const copy = [...list];
      [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
      return copy;
    });
  }

  setCurrent(id: string): void {
    const previousId = this.currentChallengeId();
    this.challenges.update((list) =>
      list.map((c) => {
        if (c.id === previousId && c.status === 'active') {
          return { ...c, status: 'pending' };
        }
        if (c.id === id) {
          return { ...c, status: 'active' };
        }
        return c;
      }),
    );
    this.currentChallengeId.set(id);
  }

  resolveCurrent(result: 'success' | 'failed'): void {
    const current = this.currentChallenge();
    if (!current) {
      return;
    }
    this.challenges.update((list) =>
      list.map((c) => (c.id === current.id ? { ...c, status: result } : c)),
    );
    this.history.update((entries) => [
      { challengeId: current.id, title: current.title, result, timestamp: Date.now() },
      ...entries,
    ]);
  }

  advanceToNext(): void {
    this.currentChallengeId.set(null);
    const next = this.pendingChallenges()[0];
    if (next) {
      this.setCurrent(next.id);
    }
  }

  resetProgress(): void {
    this.challenges.update((list) => list.map((c) => ({ ...c, status: 'pending' })));
    this.currentChallengeId.set(null);
    this.history.set([]);
  }

  exportChallengesJson(): string {
    return JSON.stringify(this.challenges(), null, 2);
  }

  importChallenges(data: unknown): void {
    if (!Array.isArray(data)) {
      throw new Error('Ungültiges Format: Erwartet eine Liste von Challenges.');
    }
    const imported: Challenge[] = data.map((raw) => {
      const draft = (raw ?? {}) as Partial<Challenge>;
      const mode = VALID_MODES.includes(draft.mode as ChallengeMode)
        ? (draft.mode as ChallengeMode)
        : 'custom';
      return {
        id: generateId(),
        title: typeof draft.title === 'string' && draft.title.trim() ? draft.title : 'Unbenannte Challenge',
        description: typeof draft.description === 'string' ? draft.description : '',
        mode,
        timeLimitMinutes: typeof draft.timeLimitMinutes === 'number' ? draft.timeLimitMinutes : null,
        status: 'pending',
      };
    });
    this.challenges.update((list) => [...list, ...imported]);
  }
}
