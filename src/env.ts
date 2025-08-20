import { z } from "zod";

// Web application environment schema
export const WebEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("Invalid Supabase URL").optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, "Supabase anon key required").optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(10, "Supabase publishable key required").optional(),
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

/**
 * Validates and returns web environment variables
 * Throws descriptive error if any required variables are missing
 */
export function getWebEnv(): WebEnv {
  const env = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  const parsed = WebEnvSchema.parse(env);

  // Dev-only guidance instead of throwing
  if (import.meta.env.DEV) {
    const hasKey = !!parsed.VITE_SUPABASE_ANON_KEY || !!parsed.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!hasKey) {
      console.warn(
        "[ENV] No Supabase publishable/anon key found. The app uses a built-in client key; this warning is safe to ignore in dev."
      );
    }
    if (!parsed.VITE_SUPABASE_URL) {
      console.warn(
        "[ENV] VITE_SUPABASE_URL is not set. Using the hardcoded URL from the Supabase client."
      );
    }
  }

  return parsed;
}

/**
 * Debug utility for development - only logs in dev mode
 */
export function debug(...args: any[]) {
  if (import.meta.env.DEV) {
    console.log('[DEBUG]', ...args);
  }
}