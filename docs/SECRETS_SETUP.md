# Secrets Setup

This document explains where to place environment variables for the Prospector app.

## Frontend (.env.local)

These variables are used in the frontend build and should be set in your hosting environment (e.g. Vercel):

- `VITE_SUPABASE_URL` – your Supabase project URL (starts with https://)
- `VITE_SUPABASE_PUBLISHABLE_KEY` – your Supabase anon public key

## Supabase Edge Functions

In your Supabase dashboard, navigate to **Project Settings -> Functions -> Environment Variables** and add the following variables:

| Variable | Description | Used By |
|---------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL (same as above) | All edge functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (never expose in frontend) | start-call, credit deduction |
| `VAPI_API_KEY` | Vapi API key for initiating calls | start-call |
| `VAPI_PUBLIC_KEY` | Vapi public key for client | get-vapi-key |
| `OPENAI_API_KEY` | OpenAI API key for call analysis | upload-call-analysis |

Remember: do **not** commit actual values to the repository. Set them only in the Supabase dashboard for each environment (prod and staging).
