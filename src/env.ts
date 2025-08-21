/**
 * Environment configuration for the web application
 * Since Supabase client is hardcoded, we don't need strict validation
 */

/**
 * Debug utility for development - only logs in dev mode
 */
export function debug(...args: any[]) {
  if (import.meta.env.DEV) {
    console.log('[DEBUG]', ...args);
  }
}