interface ErrorInfo {
  componentStack?: string;
}

export const logError = (error: Error, errorInfo?: ErrorInfo) => {
  console.error('Error:', error);
  if (errorInfo?.componentStack) {
    console.error('Error component stack:', errorInfo.componentStack);
  }
  
  // Here you can add error reporting service integration
  // For example, with Sentry:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: { errorInfo } });
  // }
};

export const handlePromiseError = (promise: Promise<any>) => {
  return promise.catch(error => {
    logError(error);
    throw error; // Re-throw to allow further error handling if needed
  });
};

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | void> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error);
      // You might want to show a user-friendly message here
      throw error; // Re-throw to allow further error handling if needed
    }
  };
};
