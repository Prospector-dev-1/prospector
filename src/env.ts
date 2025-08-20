import { z } from "zod";

// Web application environment schema
export const WebEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, "Supabase anon key required"),
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
  };

  try {
    return WebEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => e.path.join('.')).join(', ');
      throw new Error(
        `Environment validation failed. Missing or invalid variables: ${missingVars}. ` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

/**
 * Debug utility for development - only logs in dev mode
 */
export function debug(...args: any[]) {
  if (import.meta.env.DEV) {
    console.log('[DEBUG]', ...args);
  }
}