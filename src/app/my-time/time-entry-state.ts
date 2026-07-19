export interface TimeEntryState {
  error?: string;
  attemptedDuration?: string;
  attemptedDescription?: string;
  committed?: boolean;
}

export const initialTimeEntryState: TimeEntryState = {};
