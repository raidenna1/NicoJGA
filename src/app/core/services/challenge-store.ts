import { Service, signal, computed, effect } from '@angular/core';
import {
  Challenge,
  ChallengeDraft,
  ChallengeMode,
  GameKey,
  HistoryEntry,
  gameOf,
} from '../models/challenge';

const VALID_MODES: ChallengeMode[] = ['classic', 'aram', 'scrim', 'normal', 'custom'];

const STORAGE_KEY = 'jga-challenge-state';

interface PersistedState {
  challenges: Challenge[];
  currentChallengeId: string | null;
  history: HistoryEntry[];
  // Set once the player has answered the post-League gate, so the dialog does
  // not reappear on every later reload.
  gateAnswered: boolean;
  // Games whose challenges have already been appended, so a repeat spin cannot
  // add the same set twice.
  unlockedGames: GameKey[];
}

const EMPTY_STATE: PersistedState = {
  challenges: [],
  currentChallengeId: null,
  history: [],
  gateAnswered: false,
  unlockedGames: [],
};

// After this many resolved League challenges the dashboard asks whether to keep
// going with League or spin the wheel for an optional game.
const CORE_LEAGUE_COUNT = 8;

// All 15 League challenges live in the Zeitplan from the start; the gate only
// interrupts the run after the first CORE_LEAGUE_COUNT of them.
const SEED_CHALLENGES: ChallengeDraft[] = [
  {
    title: 'Autofill',
    description: 'Nico spielt auf einer Autofill-Rolle – kein Rollentausch, kein Dodge.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Kein Flash',
    description: 'Nico spielt das gesamte Game ohne Flash zu benutzen.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Max. 5 Deaths für Nico',
    description: 'Nico stirbt im Scrim höchstens 5 Mal.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Einäugig',
    description: 'Nico spielt den Scrim mit Augenklappe – nur ein Auge.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Nico 0 Deaths + Sieg',
    description: 'Das Team gewinnt und Nico stirbt kein einziges Mal.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Scrim Game mit Nico draft only',
    description: 'Nico bestimmt den kompletten Draft – und muss damit gewinnen.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Champions mit 0 Wins',
    description: 'Nico spielt einen Champion, auf dem er noch keinen einzigen Sieg hat.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Post-its auf dem Bildschirm',
    description: 'Die untere Bildschirmhälfte wird mit Post-its abgeklebt.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },

  // --- Ab hier: nach dem Gate-Dialog ("Weiter mit League?") ---
  {
    title: 'Locked Camera',
    description: 'Nico spielt das gesamte Game mit gesperrter Kamera.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Kein Voice, nur Pings',
    description: 'Nico darf im Scrim nicht sprechen – Kommunikation ausschließlich über Pings.',
    mode: 'scrim',
    timeLimitMinutes: 35,
  },
  {
    title: 'Bis Level 6 nur Q',
    description: 'Nico skillt bis Level 6 ausschließlich seine Q-Fähigkeit.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Nico Pentakill',
    description: 'Nico landet einen Pentakill.',
    mode: 'classic',
    timeLimitMinutes: null,
  },
  {
    title: 'Bronze Bravery',
    description:
      'Zufälliges Build/Setup von bronze-bravery.com – eventuell mit 1-3 Rerolls. https://bronze-bravery.com',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
  {
    title: 'Team-Challenge von den Tokens',
    description:
      'Eine Team-Challenge aus den Tokens ziehen, z.B. "win games with 3 or more champions with a stealth".',
    mode: 'classic',
    timeLimitMinutes: null,
  },
  {
    title: 'WASD-Steuerung',
    description: 'Nico steuert seinen Champion per WASD statt per Rechtsklick.',
    mode: 'classic',
    timeLimitMinutes: 40,
  },
];

// Appended to the Zeitplan when the games wheel lands on that game.
const GAME_CHALLENGES: Record<Exclude<GameKey, 'league'>, ChallengeDraft[]> = {
  cs2: [
    {
      title: 'Nur Pistolen',
      description: 'Nico darf das ganze Match über ausschließlich Pistolen kaufen.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Messer-Kill',
      description: 'Nico muss mindestens einen Kill mit dem Messer landen.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Blind eingekauft',
      description: 'Das Team kauft für Nico ein – er spielt mit dem, was er bekommt.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Kein Fadenkreuz',
      description: 'Fadenkreuz in den Settings ausschalten und so eine Runde spielen.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  geoguessr: [
    {
      title: 'Richtiges Land',
      description: 'Nico errät in 3 von 5 Runden das richtige Land.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'NMPZ',
      description: 'Kein Bewegen, kein Drehen, kein Zoomen – nur das Startbild.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: '10-Sekunden-Runde',
      description: 'Nico hat pro Runde nur 10 Sekunden Zeit für seinen Guess.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: '4.000+ Punkte',
      description: 'Nico landet in einer einzelnen Runde über 4.000 Punkte.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  golf: [
    {
      title: 'Hole-in-One',
      description: 'Nico spielt mindestens ein Hole-in-One.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Unter Par',
      description: 'Nico beendet einen kompletten Kurs unter Par.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Invertierte Maus',
      description: 'Nico spielt einen ganzen Kurs mit invertierter Steuerung.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Letzter trinkt',
      description: 'Wer den Kurs als Letzter beendet, trinkt.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  horror: [
    {
      title: 'Kein Schreien',
      description: 'Nico darf nicht schreien – das Mikro läuft mit.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Solo voraus',
      description: 'Nico geht als Erster und allein rein.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Licht aus',
      description: 'Gespielt wird im komplett abgedunkelten Raum.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Kopfhörer laut',
      description: 'Nico spielt mit Kopfhörern auf voller Lautstärke.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  valorant: [
    {
      title: 'Nur Classic',
      description: 'Nico kauft das ganze Match über nur die Standard-Pistole.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Kein Ult',
      description: 'Nico darf sein Ultimate kein einziges Mal zünden.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: '3K in einer Runde',
      description: 'Nico holt drei Kills in einer einzigen Runde.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Nur Schleichen',
      description: 'Nico bewegt sich eine Runde lang ausschließlich im Schleichmodus.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  fallguys: [
    {
      title: 'Krone holen',
      description: 'Nico gewinnt eine komplette Show.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Ins Finale',
      description: 'Nico erreicht das Finale einer Show.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Invertierte Steuerung',
      description: 'Nico spielt eine ganze Show mit invertierter Steuerung.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Erster raus trinkt',
      description: 'Wer als Erster ausscheidet, trinkt.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  minecraft: [
    {
      title: 'Diamanten in 15 Minuten',
      description: 'Nico findet innerhalb von 15 Minuten Diamanten.',
      mode: 'custom',
      timeLimitMinutes: 15,
    },
    {
      title: 'Nether-Portal',
      description: 'Das Team baut gemeinsam ein funktionierendes Nether-Portal.',
      mode: 'custom',
      timeLimitMinutes: 20,
    },
    {
      title: 'Kein Springen',
      description: 'Nico darf die Leertaste nicht benutzen.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Keine Tode',
      description: 'Nico überlebt die gesamte Session ohne einmal zu sterben.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
  warzone: [
    {
      title: 'Gulag gewinnen',
      description: 'Nico gewinnt sein Gulag-Duell.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: '5 Kills',
      description: 'Nico holt 5 Kills in einem einzigen Match.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Start-Loadout',
      description: 'Nico behält seine Startwaffe – kein Loadout-Drop.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
    {
      title: 'Nur Pistole',
      description: 'Nico nutzt bis zu seinem ersten Kill ausschließlich die Pistole.',
      mode: 'custom',
      timeLimitMinutes: null,
    },
  ],
};

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
        gateAnswered: parsed.gateAnswered ?? false,
        unlockedGames: parsed.unlockedGames ?? [],
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
  return SEED_CHALLENGES.map((draft) => ({
    ...draft,
    game: 'league' as GameKey,
    id: generateId(),
    status: 'pending',
  }));
}

@Service()
export class ChallengeStore {
  private readonly loaded = loadState();

  readonly challenges = signal<Challenge[]>(
    this.loaded.isFirstRun ? seedChallenges() : this.loaded.state.challenges,
  );
  readonly currentChallengeId = signal<string | null>(this.loaded.state.currentChallengeId);
  readonly history = signal<HistoryEntry[]>(this.loaded.state.history);
  readonly gateAnswered = signal<boolean>(this.loaded.state.gateAnswered);
  readonly unlockedGames = signal<GameKey[]>(this.loaded.state.unlockedGames);

  readonly currentChallenge = computed(
    () => this.challenges().find((c) => c.id === this.currentChallengeId()) ?? null,
  );

  readonly pendingChallenges = computed(() =>
    this.challenges().filter((c) => c.status === 'pending'),
  );

  private readonly resolvedLeagueCount = computed(
    () =>
      this.challenges().filter(
        (c) => gameOf(c) === 'league' && (c.status === 'success' || c.status === 'failed'),
      ).length,
  );

  readonly hasMoreLeague = computed(() =>
    this.challenges().some((c) => gameOf(c) === 'league' && c.status === 'pending'),
  );

  // True exactly once: the first 8 League challenges are done and the player
  // has not yet chosen between more League and spinning for a game.
  readonly gateDue = computed(
    () => !this.gateAnswered() && this.resolvedLeagueCount() >= CORE_LEAGUE_COUNT,
  );

  constructor() {
    effect(() => {
      const state: PersistedState = {
        challenges: this.challenges(),
        currentChallengeId: this.currentChallengeId(),
        history: this.history(),
        gateAnswered: this.gateAnswered(),
        unlockedGames: this.unlockedGames(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  answerGate(): void {
    this.gateAnswered.set(true);
  }

  // Appends the challenge set for a game to the Zeitplan and starts the first
  // of them. A game already unlocked is not added a second time.
  unlockGame(game: GameKey): void {
    this.gateAnswered.set(true);
    if (game === 'league' || this.unlockedGames().includes(game)) {
      return;
    }
    const drafts = GAME_CHALLENGES[game];
    if (!drafts) {
      return;
    }
    const added: Challenge[] = drafts.map((draft) => ({
      ...draft,
      game,
      id: generateId(),
      status: 'pending',
    }));
    this.challenges.update((list) => [...list, ...added]);
    this.unlockedGames.update((list) => [...list, game]);
    this.setCurrent(added[0].id);
  }

  // Discards all challenge state and re-seeds from SEED_CHALLENGES.
  resetToDefaults(): void {
    this.challenges.set(seedChallenges());
    this.currentChallengeId.set(null);
    this.history.set([]);
    this.gateAnswered.set(false);
    this.unlockedGames.set([]);
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
    const previous = this.currentChallenge();
    const previousGame = previous ? gameOf(previous) : null;
    this.currentChallengeId.set(null);
    const pending = this.pendingChallenges();
    // Finish the current game's set before falling back to whatever is next in
    // the list - otherwise a drawn game would bounce back to League after one
    // challenge, since the remaining League entries sit earlier in the array.
    const sameGame = previousGame ? pending.find((c) => gameOf(c) === previousGame) : undefined;
    const next = sameGame ?? pending[0];
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
