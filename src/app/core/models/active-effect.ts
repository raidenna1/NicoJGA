export type EffectKind = 'punishment' | 'reward';

// A punishment or reward that outlives the challenge it was spun on - an
// eye patch worn for the next few games, or a Joker saved for later.
export interface ActiveEffect {
  id: string;
  label: string;
  kind: EffectKind;
}
