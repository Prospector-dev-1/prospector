// supabase/functions/end-call-analysis/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- NEW: light sanitize only (no heavy cleaners)
function lightSanitize(text: string): string {
  if (!text) return "";
  // normalize CRLF → LF, trim lines, drop empties
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Hoist for use in catch:
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  let callRecordId: string | undefined;

  try {
    const { callRecordId: bodyCallRecordId, transcript, duration } = await req.json();
    callRecordId = bodyCallRecordId;

    // Authenticate user
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    // Decode JWT locally to get user id
    let userId: string | undefined;
    try {
      const base64Url = token.split(".")[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch {
      userId = undefined;
    }
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get call record owned by user
    const { data: callRecord } = await supabaseService
      .from("calls")
      .select("*")
      .eq("id", callRecordId)
      .eq("user_id", userId)
      .single();

    if (!callRecord) {
      throw new Error("Call record not found");
    }

    console.log("=== ANALYSIS DEBUG ===");
    console.log("Transcript received length:", transcript?.length ?? 0);
    console.log("Duration:", duration);

    // --- NEW: minimal clean only
    const cleanedTranscript = lightSanitize(transcript || "");
    console.log("Cleaned transcript (light):", cleanedTranscript.slice(0, 500));

    // --- Participation check (accepts USER:/User: labels)
    const userTurns = cleanedTranscript
      .split("\n")
      .filter((l) => /^(User|USER):/.test(l))
      .map((l) => l.replace(/^(User|USER):\s*/, "").trim())
      .filter(Boolean);

    const trivialUtterances = new Set([
      "hi", "hello", "yeah", "ok", "okay", "mm-hmm", "mhm", "right", "got it", "bye", "thanks", "hmm",
    ]);
    const hasMeaningfulParticipation = userTurns.some((t) => {
      const tClean = t.toLowerCase().replace(/[.,!?]/g, "").trim();
      if (tClean.length < 8) return false;
      return !trivialUtterances.has(tClean);
    });

    console.log("User turns:", userTurns.length, "Has meaningful participation:", hasMeaningfulParticipation);

    // If no meaningful user participation, assign minimum scores and finish
    if (!hasMeaningfulParticipation) {
      console.log("No meaningful user participation detected");
      const analysis = {
        confidence_score: 1,
        objection_handling_score: 1,
        clarity_score: 1,
        persuasiveness_score: 1,
        tone_score: 1,
        overall_pitch_score: 1,
        closing_score: 1,
        overall_score: 1,
        successful_sale: false,
        feedback:
          "No sales conversation detected. Assigned minimum score (1/10). Please actively participate by speaking to the prospect to receive a full analysis.",
      };

      const { error: updateError } = await supabaseService
        .from("calls")
        .update({
          duration_seconds: duration,
          confidence_score: analysis.confidence_score,
          objection_handling_score: analysis.objection_handling_score,
          clarity_score: analysis.clarity_score,
          persuasiveness_score: analysis.persuasiveness_score,
          tone_score: analysis.tone_score,
          overall_pitch_score: analysis.overall_pitch_score,
          closing_score: analysis.closing_score,
          overall_score: analysis.overall_score,
          successful_sale: analysis.successful_sale,
          transcript: cleanedTranscript, // ← store sanitized transcript directly
          ai_feedback: analysis.feedback,
          call_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", callRecordId);

      if (updateError) {
        console.error("Error updating call record:", updateError);
      }

      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- With participation: rigorous AI analysis (your existing logic preserved)
    console.log("Participation detected, proceeding with rigorous AI analysis");
    const analysisPrompt = `
Analyze this cold calling transcript and provide detailed, personalized feedback. The transcript shows a conversation between a CALLER (salesperson) and a PROSPECT (business owner).

TRANSCRIPT:
${cleanedTranscript}

TASK: Analyze the CALLER'S performance only. Provide scores (1-10) for each category and detailed personalized feedback.

SCORING GUIDELINES:
- 1-3: Poor performance, major issues
- 4-6: Average performance, needs improvement  
- 7-8: Good performance, minor tweaks needed
- 9-10: Excellent performance, professional level

ANALYSIS REQUIREMENTS:
1. Quote specific things the caller said (good and bad)
2. Identify what the caller did well
3. Identify specific areas for improvement
4. Give actionable advice for next time

IMPORTANT: Set "successful_sale" to TRUE if any of these occurred:
- Prospect agreed to an appointment, meeting, or call
- Prospect said they're interested and want to schedule something
- Prospect gave availability/times they're free
- Prospect said "yes", "sounds good", "that works", "perfect" in response to scheduling
- Any form of commitment to next steps was made

Respond in this EXACT JSON format:
{
  "confidence_score": [1-10 number],
  "objection_handling_score": [1-10 number], 
  "clarity_score": [1-10 number],
  "persuasiveness_score": [1-10 number],
  "tone_score": [1-10 number],
  "overall_pitch_score": [1-10 number],
  "closing_score": [1-10 number],
  "overall_score": [1-10 number],
  "successful_sale": [true/false],
  "feedback": "WHAT YOU DID WELL:\\n[Specific examples from the call]\\n\\nAREAS FOR IMPROVEMENT:\\n[Specific issues with quotes]\\n\\nHOW TO IMPROVE:\\n[Actionable advice for next call]"
}`.trim();

    console.log("Sending analysis prompt to OpenAI...");

    const models = ["gpt-4o-mini", "gpt-4o"]; // keep your original fallbacks
    let analysis: any;
    let openAISuccess = false;

    for (const model of models) {
      try {
        console.log(`Attempting OpenAI model: ${model}`);

        const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are an expert sales coach. You MUST respond with valid JSON only. Analyze cold calling performance and provide specific, actionable feedback with quotes from the transcript.",
              },
              { role: "user", content: analysisPrompt },
            ],
            temperature: 0.2,
            max_tokens: 1000,
          }),
        });

        console.log(`OpenAI response status for ${model}:`, openAIResponse.status);

        if (openAIResponse.ok) {
          const openAIData = await openAIResponse.json();
          const analysisText = openAIData.choices?.[0]?.message?.content ?? "";

          try {
            analysis = JSON.parse(analysisText);
            console.log("OpenAI analysis successful with model:", model);
            openAISuccess = true;
            break;
          } catch {
            console.log(`JSON parsing failed for ${model}, trying next model`);
            continue;
          }
        } else {
          const errorText = await openAIResponse.text();
          console.log(`OpenAI API error for ${model}:`, errorText);
          continue;
        }
      } catch (error) {
        console.log(`OpenAI request failed for ${model}:`, (error as Error).message);
        continue;
      }
    }

    if (!openAISuccess) {
      console.log("All OpenAI models failed, using manual analysis");

      const transcriptLower = cleanedTranscript.toLowerCase();

      const hasProperIntro =
        transcriptLower.includes("this is") ||
        transcriptLower.includes("my name is") ||
        transcriptLower.includes("calling from");

      const hasValueProp =
        (transcriptLower.includes("better") && transcriptLower.includes("website")) ||
        transcriptLower.includes("improve your") ||
        transcriptLower.includes("help you") ||
        transcriptLower.includes("save you");

      const hasObjectionHandling =
        transcriptLower.includes("understand") ||
        transcriptLower.includes("but what if") ||
        transcriptLower.includes("let me explain");

      const hasClosing =
        transcriptLower.includes("would you be interested") ||
        transcriptLower.includes("can we schedule") ||
        transcriptLower.includes("when would be good");

      const hasAppointmentBooked =
        transcriptLower.includes("appointment") ||
        transcriptLower.includes("meeting") ||
        transcriptLower.includes("schedule") ||
        transcriptLower.includes("book") ||
        transcriptLower.includes("calendar") ||
        transcriptLower.includes("available") ||
        transcriptLower.includes("free time") ||
        transcriptLower.includes("tomorrow") ||
        transcriptLower.includes("next week") ||
        transcriptLower.includes("monday") ||
        transcriptLower.includes("tuesday") ||
        transcriptLower.includes("wednesday") ||
        transcriptLower.includes("thursday") ||
        transcriptLower.includes("friday") ||
        (transcriptLower.includes("yes") &&
          (transcriptLower.includes("interested") || transcriptLower.includes("like to"))) ||
        transcriptLower.includes("sounds good") ||
        transcriptLower.includes("that works") ||
        transcriptLower.includes("perfect");

      const introScore = hasProperIntro ? 4 : 1;
      const pitchScore = hasValueProp ? 5 : 2;
      const objectionScore = hasObjectionHandling ? 6 : 1;
      const closingScore = hasClosing ? 6 : 1;
      const overallScore = Math.round((introScore + pitchScore + objectionScore + closingScore) / 4);

      analysis = {
        confidence_score: introScore,
        objection_handling_score: objectionScore,
        clarity_score: pitchScore,
        persuasiveness_score: hasValueProp ? 4 : 1,
        tone_score: 2,
        overall_pitch_score: pitchScore,
        closing_score: closingScore,
        overall_score: overallScore,
        successful_sale: hasAppointmentBooked,
        feedback: `Sales Performance Analysis:
INTRODUCTION: ${hasProperIntro ? "Good - You introduced yourself professionally" : "Poor - No professional introduction detected"}
VALUE PROPOSITION: ${hasValueProp ? "Fair - You mentioned improvements" : "Poor - No clear value proposition offered"}
OBJECTION HANDLING: ${hasObjectionHandling ? "Good - You addressed concerns" : "Poor - No objection handling detected"}
CLOSING: ${hasClosing ? "Good - You attempted to advance the sale" : "Poor - No closing attempt detected"}

${
  overallScore < 3
    ? "This was a weak sales call. Focus on: 1) Professional introduction 2) Clear value proposition 3) Asking for next steps"
    : overallScore < 6
    ? "This was an average attempt. Improve your objection handling and closing technique."
    : "Solid performance! Keep refining your approach."
}`,
      };
    }

    // Update call record with analysis + final transcript
    const { error: updateError } = await supabaseService
      .from("calls")
      .update({
        duration_seconds: duration,
        confidence_score: analysis.confidence_score,
        objection_handling_score: analysis.objection_handling_score,
        clarity_score: analysis.clarity_score,
        persuasiveness_score: analysis.persuasiveness_score,
        tone_score: analysis.tone_score,
        overall_pitch_score: analysis.overall_pitch_score,
        closing_score: analysis.closing_score,
        overall_score: analysis.overall_score,
        successful_sale: analysis.successful_sale,
        transcript: cleanedTranscript, // ← store sanitized transcript directly
        ai_feedback: analysis.feedback,
        call_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", callRecordId);

    if (updateError) {
      console.error("Error updating call record:", updateError);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in end-call-analysis function:", error);

    // Try to mark the call as failed so it doesn't linger
    if (callRecordId) {
      try {
        await supabaseService
          .from("calls")
          .update({ call_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", callRecordId);
      } catch (updateError) {
        console.error("Failed to update call status to failed:", updateError);
      }
    }

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
