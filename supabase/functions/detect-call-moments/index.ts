import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { call_upload_id } = await req.json();
    if (!call_upload_id) {
      return new Response(JSON.stringify({ error: "call_upload_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user from the JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the call upload (ensure ownership via RLS by selecting with anon key? Here we use service role but filter by user_id)
    const { data: upload, error: uploadError } = await supabase
      .from("call_uploads")
      .select("id, user_id, transcript, ai_analysis, call_moments")
      .eq("id", call_upload_id)
      .single();

    if (uploadError || !upload) {
      console.error("Upload fetch error:", uploadError);
      return new Response(JSON.stringify({ error: "Call upload not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (upload.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!upload.transcript) {
      return new Response(JSON.stringify({ error: "Transcript not available for this call" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If moments already exist and non-empty, return them
    if (Array.isArray(upload.call_moments) && upload.call_moments.length > 0) {
      return new Response(JSON.stringify({ moments: upload.call_moments, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is missing");
      return new Response(JSON.stringify({ error: "Server not configured for AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a call analysis engine. Given a full sales call transcript, split it into 5-12 key moments that are useful for practice. 
Return STRICT JSON with this TypeScript schema (no markdown):
{
  "moments": Array<{
    id: string;                // stable kebab-case id like "price-objection-1"
    type: 'objection'|'pricing'|'opening'|'closing'|'discovery'|'rapport'|'other';
    label: string;             // short title of the moment
    start_char: number;        // index in transcript string where moment starts
    end_char: number;          // index in transcript string where moment ends
    summary: string;           // 1-2 sentence description
    coaching_tip?: string;     // concrete advice for improvement
    difficulty?: 'easy'|'medium'|'hard';
  }>
}`;

    const userPrompt = `Transcript:\n\n${upload.transcript.slice(0, 100000)}\n\nNotes: If timestamps are not present, approximate boundaries by semantic breakpoints and return character index ranges. Ensure indices are within bounds of the provided transcript.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
      }),
    });

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content;

    let moments: unknown = [];
    try {
      const parsed = JSON.parse(content || '{}');
      if (Array.isArray(parsed.moments)) {
        moments = parsed.moments.map((m: any, idx: number) => ({
          id: String(m.id || `moment-${idx + 1}`),
          type: String(m.type || 'other'),
          label: String(m.label || `Moment ${idx + 1}`),
          start_char: Math.max(0, Math.min(Number(m.start_char ?? 0), upload.transcript.length - 1)),
          end_char: Math.max(0, Math.min(Number(m.end_char ?? 0), upload.transcript.length)),
          summary: String(m.summary || ''),
          coaching_tip: m.coaching_tip ? String(m.coaching_tip) : undefined,
          difficulty: (['easy','medium','hard'] as const).includes(m.difficulty) ? m.difficulty : undefined,
        }));
      }
    } catch (e) {
      console.error("AI parse error:", e, content);
    }

    if (!Array.isArray(moments) || (moments as any[]).length === 0) {
      // Minimal fallback: split transcript into chunks
      const chunkSize = Math.ceil(upload.transcript.length / 5);
      const fallback: any[] = [];
      for (let i = 0; i < 5; i++) {
        const start = i * chunkSize;
        const end = Math.min(upload.transcript.length, (i + 1) * chunkSize);
        fallback.push({
          id: `segment-${i + 1}`,
          type: 'other',
          label: `Segment ${i + 1}`,
          start_char: start,
          end_char: end,
          summary: upload.transcript.slice(start, Math.min(end, start + 160)).replace(/\s+/g, ' '),
        });
      }
      moments = fallback;
    }

    const { error: updateError } = await supabase
      .from('call_uploads')
      .update({ call_moments: moments, updated_at: new Date().toISOString() })
      .eq('id', call_upload_id);

    if (updateError) {
      console.error('Failed to save moments:', updateError);
    }

    return new Response(JSON.stringify({ moments, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error('detect-call-moments error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
