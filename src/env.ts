import { z } from "zod";

// Web application environment schema
export const WebEnvSchema = z.object({
  SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  SUPABASE_ANON_KEY: z.string().min(10, "Supabase anon key required"),
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

/**
 * Validates and returns web environment variables
 * Returns hardcoded values for Lovable project
 */
export function getWebEnv(): WebEnv {
  const env = {
    SUPABASE_URL: "https://akcxkwbqeehxvwhmrqbb.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3hrd2JxZWVoeHZ3aG1ycWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNTgzMTMsImV4cCI6MjA2OTkzNDMxM30.ix6oVIa0vyWg1R_IoUZyEiadZTvCDa6GitEIqRLoIYk"
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