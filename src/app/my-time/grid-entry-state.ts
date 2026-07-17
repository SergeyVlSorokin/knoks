export interface GridEntryState {
  error?: string;
  attemptedInput?: string;
  committed?: boolean;
}

export const initialGridEntryState: GridEntryState = {};
