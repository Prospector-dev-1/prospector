import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";

// Server environment schema for edge functions
export const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  SUPABASE_ANON_KEY: z.string().min(10, "Supabase anon key required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, "Supabase service role key required"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/**
 * Validates and returns server environment variables for edge functions
 * Throws descriptive error if any required variables are missing
 */
export function getServerEnv(): ServerEnv {
  const env = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'), 
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  try {
    return ServerEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(
        `Environment validation failed in edge function. Missing or invalid variables: ${missingVars}. ` +
        `Please ensure all required secrets are configured in Supabase.`
      );
    }
    throw error;
  }
}

// Function-specific environment schemas
export const VapiEnvSchema = ServerEnvSchema.extend({
  VAPI_API_KEY: z.string().min(10, "VAPI API key required"),
  VAPI_PUBLIC_KEY: z.string().min(10, "VAPI public key required"),
});

export const OpenAIEnvSchema = ServerEnvSchema.extend({
  OPENAI_API_KEY: z.string().regex(/^sk-/, "Invalid OpenAI API key format"),
});

export const ResendEnvSchema = ServerEnvSchema.extend({
  RESEND_API_KEY: z.string().regex(/^re_/, "Invalid Resend API key format"),
  SUPPORT_FROM_EMAIL: z.string().email("Invalid support from email"),
  SUPPORT_TO_EMAIL: z.string().email("Invalid support to email"),
});

export type VapiEnv = z.infer<typeof VapiEnvSchema>;
export type OpenAIEnv = z.infer<typeof OpenAIEnvSchema>;
export type ResendEnv = z.infer<typeof ResendEnvSchema>;