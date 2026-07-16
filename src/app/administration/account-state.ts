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

export type ManageAccountState =
  | { error?: undefined; resetPassword?: undefined }
  | { error: string; resetPassword?: undefined }
  | { error?: undefined; resetPassword: string };

export type AccountAccessState =
  | { error?: undefined; success?: undefined }
  | { error: string; success?: undefined }
  | { error?: undefined; success: string };
