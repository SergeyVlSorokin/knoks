export type CreateAccountState =
  | { error?: undefined; receipt?: undefined }
  | { error: string; receipt?: undefined }
  | {
      error?: undefined;
      receipt: {
        displayName: string;
        username: string;
        initialPassword: string;
      };
    };
