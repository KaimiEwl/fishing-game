export const getErrorMessage = (error: unknown, fallback = 'Unknown error'): string => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      shortMessage?: unknown;
    };

    if (typeof candidate.shortMessage === 'string' && candidate.shortMessage.trim()) {
      return candidate.shortMessage;
    }

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
  }

  return fallback;
};

export const isUserRejectedError = (error: unknown) => getErrorMessage(error).includes('User rejected');
