/**
 * Async utility functions for audio processing
 */

/**
 * Wait until a predicate function returns true, with timeout
 */
export async function waitUntil(
  predicate: () => boolean,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> {
  const { timeout = 1000, interval = 50 } = options;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - start >= timeout) {
        reject(new Error(`Timeout after ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Wait for Krisp processor to be ready
 * This should be implemented based on your Krisp integration
 */
export async function waitForKrispReady(
  krispProcessor: any,
  timeout: number = 1000
): Promise<void> {
  if (!krispProcessor) {
    throw new Error('No Krisp processor provided');
  }

  // Poll for ready state - adapt this to your Krisp implementation
  return waitUntil(
    () => krispProcessor.ready === true || krispProcessor.isReady === true,
    { timeout, interval: 50 }
  );
}

/**
 * Safe promise that won't reject - useful for cleanup operations
 */
export function safePromise<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) => {
    console.warn('Safe promise caught error:', error);
    return null;
  });
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 100, maxDelay = 1000 } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}