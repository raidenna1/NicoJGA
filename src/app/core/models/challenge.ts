export type ChallengeMode = 'classic' | 'aram' | 'scrim' | 'normal' | 'custom';

export type ChallengeStatus = 'pending' | 'active' | 'success' | 'failed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  mode: ChallengeMode;
  timeLimitMinutes: number | null;
  status: ChallengeStatus;
}

export type ChallengeDraft = Omit<Challenge, 'id' | 'status'>;

export interface HistoryEntry {
  challengeId: string;
  title: string;
  result: 'success' | 'failed';
  timestamp: number;
}
