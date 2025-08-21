import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Basic CORS headers for webhooks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature, x-signature",
};
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function verifySignatureIfPresent(rawBody: string, req: Request) {
  const secret = Deno.env.get("VAPI_WEBHOOK_SECRET");
  const signatureHeader =
    req.headers.get("x-vapi-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("vapi-signature");

  // If no secret configured or no signature provided, skip verification
  if (!secret || !signatureHeader) return { verified: false, skipped: true };

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const digestHex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Accept either raw hex, or `sha256=<hex>` formats commonly used
    const normalizedHeader = signatureHeader.replace(/^sha256=/i, "");

    const matches = normalizedHeader === digestHex;
    return { verified: matches, skipped: false };
  } catch (e) {
    console.error("[vapi-webhook] Signature verification error:", e);
    return { verified: false, skipped: false, error: String(e) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  console.log("[vapi-webhook] Incoming request", {
    method: req.method,
    path: url.pathname,
  });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Read raw body for potential signature validation first
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (e) {
    console.error("[vapi-webhook] Failed to read request body:", e);
    return new Response(
      JSON.stringify({ error: "Invalid body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Optional signature verification (if VAPI_WEBHOOK_SECRET set)
  const verification = await verifySignatureIfPresent(rawBody, req);
  if (!verification.skipped && !verification.verified) {
    console.warn("[vapi-webhook] Signature verification failed");
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse JSON after verification
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (e) {
    console.error("[vapi-webhook] Invalid JSON payload:", e);
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Minimal logging of event type to help with debugging
  const eventType = payload?.type || payload?.event || "unknown";
  const callId = payload?.callId || payload?.call_id || payload?.id;
  console.log("[vapi-webhook] Event received", { eventType, callId });

  // TODO: Add your handling logic here (e.g., persist updates, trigger flows)

  return new Response(
    JSON.stringify({ ok: true, received: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
