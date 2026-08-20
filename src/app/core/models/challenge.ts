export type ChallengeMode = 'classic' | 'aram' | 'scrim' | 'normal' | 'custom';

export type ChallengeStatus = 'pending' | 'active' | 'success' | 'failed';

export type GameKey =
  | 'league'
  | 'cs2'
  | 'geoguessr'
  | 'golf'
  | 'horror'
  | 'valorant'
  | 'fallguys'
  | 'minecraft'
  | 'warzone';

export const GAME_LABELS: Record<GameKey, string> = {
  league: 'League of Legends',
  cs2: 'CS2',
  geoguessr: 'GeoGuessr',
  golf: 'Golf With Your Friends',
  horror: 'Horror Game',
  valorant: 'Valorant',
  fallguys: 'Fall Guys',
  minecraft: 'Minecraft',
  warzone: 'Warzone',
};

export interface Challenge {
  id: string;
  title: string;
  description: string;
  mode: ChallengeMode;
  timeLimitMinutes: number | null;
  status: ChallengeStatus;
  // Optional so challenges saved before games existed - and drafts from the
  // editor, which has no game picker - keep working as League challenges.
  game?: GameKey;
}

export function gameOf(challenge: Challenge): GameKey {
  return challenge.game ?? 'league';
}

// Maps a games-wheel entry back to its key. Returns null for games the user
// added by hand, which have no challenge set to unlock.
export function gameKeyFromLabel(label: string): GameKey | null {
  const needle = label.trim().toLowerCase();
  const match = (Object.entries(GAME_LABELS) as [GameKey, string][]).find(
    ([, value]) => value.toLowerCase() === needle,
  );
  return match ? match[0] : null;
}

export type ChallengeDraft = Omit<Challenge, 'id' | 'status'>;

// Fulfillable at any time during any other challenge, so these are tracked
// independently of the sequential challenge list rather than as Challenges.
export interface BonusChallenge {
  id: string;
  label: string;
  completed: boolean;
}

export interface HistoryEntry {
  challengeId: string;
  title: string;
  result: 'success' | 'failed';
  timestamp: number;
}
