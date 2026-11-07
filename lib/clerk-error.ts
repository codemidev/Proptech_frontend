type ClerkLikeError = {
  errors?: Array<{ message?: string }>;
};

function isClerkLikeError(err: unknown): err is ClerkLikeError {
  return typeof err === "object" && err !== null && "errors" in err;
}

export function getClerkErrorMessage(err: unknown, fallback: string): string {
  if (isClerkLikeError(err)) {
    const message = err.errors?.[0]?.message;
    if (message) return message;
  }

  if (err instanceof Error) return err.message;

  return fallback;
}
