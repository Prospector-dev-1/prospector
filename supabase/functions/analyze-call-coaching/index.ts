import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced manual coaching analysis function
function generateManualCoachingAnalysis(transcript: string): any {
  const lines = transcript.split('\n').map(l => l.trim()).filter(Boolean);
  const userLines = lines.filter(line => line.startsWith('User:'));
  const assistantLines = lines.filter(line => line.startsWith('Assistant:'));
  
  // Extract common issues and generate coaching
  const coachingItems = [];
  
  // Analyze conversation flow and common issues
  let hasIntroduction = false;
  let hasValueProposition = false;
  let hasClosing = false;
  let hasObjectionHandling = false;
  
  const userContent = userLines.join(' ').toLowerCase();
  const assistantContent = assistantLines.join(' ').toLowerCase();
  
  // Check for introduction
  if (userContent.includes('hello') || userContent.includes('hi') || userContent.includes('my name')) {
    hasIntroduction = true;
  }
  
  // Check for value proposition keywords
  if (userContent.includes('help') || userContent.includes('benefit') || userContent.includes('value') || 
      userContent.includes('solution') || userContent.includes('improve')) {
    hasValueProposition = true;
  }
  
  // Check for closing attempts
  if (userContent.includes('next step') || userContent.includes('schedule') || userContent.includes('meeting') ||
      userContent.includes('contract') || userContent.includes('sign up')) {
    hasClosing = true;
  }
  
  // Check for objection handling
  if (assistantContent.includes('but') || assistantContent.includes('however') || assistantContent.includes('concern') ||
      assistantContent.includes('not sure') || assistantContent.includes('expensive') || assistantContent.includes('think about')) {
    hasObjectionHandling = true;
  }
  
  // Generate specific coaching based on conversation
  if (!hasIntroduction && userLines.length > 0) {
    const firstUserLine = userLines[0].replace('User:', '').trim();
    const firstAssistantResponse = assistantLines.length > 0 ? assistantLines[0].replace('Assistant:', '').trim() : "Initial response";
    
    coachingItems.push({
      assistant_said: firstAssistantResponse,
      your_response: firstUserLine,
      issue: "You jumped straight into your pitch without a proper introduction. This can make you sound unprofessional and pushy.",
      better_response: "Hi, this is [Your Name] from [Company]. I hope I'm not catching you at a bad time. I'm calling because we help [target audience] with [specific benefit]. Do you have a quick minute to chat?",
      why_better: "A proper introduction builds trust and gives context for your call, making prospects more receptive.",
      category: "clarity"
    });
  }
  
  if (!hasValueProposition && userLines.length > 1) {
    const midUserLine = userLines[Math.floor(userLines.length / 2)].replace('User:', '').trim();
    const midAssistantLine = assistantLines.length > 1 ? assistantLines[Math.floor(assistantLines.length / 2)].replace('Assistant:', '').trim() : "Prospect response";
    
    coachingItems.push({
      assistant_said: midAssistantLine,
      your_response: midUserLine,
      issue: "You didn't clearly communicate the value proposition. Prospects need to understand what's in it for them.",
      better_response: "What I'd like to share with you is how we've helped [similar companies/people] [specific result/benefit]. For example, [brief case study or result].",
      why_better: "Leading with specific value and proof points makes your offer more credible and relevant.",
      category: "clarity"
    });
  }
  
  if (hasObjectionHandling) {
    // Find objection-related exchanges
    const objectionPattern = /(but|however|concern|not sure|expensive|think about|cost|price|budget)/i;
    for (let i = 0; i < assistantLines.length; i++) {
      if (objectionPattern.test(assistantLines[i]) && i < userLines.length) {
        coachingItems.push({
          assistant_said: assistantLines[i].replace('Assistant:', '').trim(),
          your_response: userLines[i + 1] ? userLines[i + 1].replace('User:', '').trim() : "Your response",
          issue: "You need to acknowledge their concern before providing a solution. This shows you're listening and builds trust.",
          better_response: "I completely understand that concern. Many of our clients felt the same way initially. What they found was [address the specific concern with evidence/examples].",
          why_better: "Acknowledging concerns first validates their feelings and makes them more open to your solution.",
          category: "objection_handling"
        });
        break;
      }
    }
  }
  
  if (!hasClosing && userLines.length > 2) {
    const lastUserLine = userLines[userLines.length - 1].replace('User:', '').trim();
    const lastAssistantLine = assistantLines.length > 0 ? assistantLines[assistantLines.length - 1].replace('Assistant:', '').trim() : "Final response";
    
    coachingItems.push({
      assistant_said: lastAssistantLine,
      your_response: lastUserLine,
      issue: "You didn't attempt to close or ask for a next step. Every sales conversation should end with a clear call to action.",
      better_response: "Based on what we've discussed, I think this could be a great fit for you. What would you like to do as a next step? I can schedule a brief demo for next week.",
      why_better: "A clear, confident close gives the prospect a path forward and shows you're committed to helping them.",
      category: "closing"
    });
  }
  
  // If no specific issues found, provide general guidance
  if (coachingItems.length === 0) {
    coachingItems.push({
      assistant_said: assistantLines.length > 0 ? assistantLines[0].replace('Assistant:', '').trim() : "Prospect's initial response",
      your_response: userLines.length > 0 ? userLines[0].replace('User:', '').trim() : "Your opening",
      issue: "Your approach could be more structured and engaging to build better rapport with prospects.",
      better_response: "Focus on asking questions to understand their needs first, then present solutions that directly address those needs.",
      why_better: "A consultative approach builds trust and makes your recommendations more relevant and compelling.",
      category: "approach"
    });
  }
  
  // Generate summary based on identified issues
  const issues = coachingItems.map(item => item.category);
  const uniqueIssues = [...new Set(issues)];
  
  let summary = "Based on your call transcript, ";
  if (uniqueIssues.includes('clarity')) {
    summary += "focus on clearer communication and value proposition. ";
  }
  if (uniqueIssues.includes('objection_handling')) {
    summary += "Work on acknowledging concerns before addressing them. ";
  }
  if (uniqueIssues.includes('closing')) {
    summary += "Always end with a clear next step. ";
  }
  summary += "Practice active listening and tailor your responses to their specific needs.";
  
  return {
    coaching: coachingItems.slice(0, 3), // Limit to 3 most important items
    summary: summary,
    tips: [
      "Always start with a professional introduction",
      "Lead with value and benefits, not features",
      "Ask questions to understand their needs first",
      "Acknowledge objections before addressing them",
      "End every call with a clear next step"
    ]
  };
}

serve(async (req) => {
  console.log('=== ANALYZE CALL COACHING START ===');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { callId } = await req.json();
    if (!callId) {
      return new Response(JSON.stringify({ error: 'callId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Decode JWT to get user id
    const token = authHeader.replace('Bearer ', '');
    let userId: string | undefined;
    try {
      const base64Url = token.split('.')[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch (_) {
      userId = undefined;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch call transcript and validate ownership
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id, transcript')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      console.error('Call fetch error', callError);
      return new Response(JSON.stringify({ error: 'Call not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (call.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!call.transcript || call.transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No transcript available for this call' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (Number(profile.credits) < 0.5) {
      return new Response(JSON.stringify({ error: 'Insufficient credits. You need 0.5 credits for objection coaching.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build OpenAI prompt for objection coaching
    // Prepare a trimmed, normalized transcript to avoid overload and improve parsing
    const rawTranscript = call.transcript as string;
    let normalizedTranscript = rawTranscript.replace(/\r/g, '');
    normalizedTranscript = normalizedTranscript
      .replace(/Assistant:\s*Assistant:/g, 'Assistant:')
      .replace(/User:\s*User:/g, 'User:')
      .replace(/\s*(Assistant:)/g, '\n$1')
      .replace(/\s*(User:)/g, '\n$1');
    const parts = normalizedTranscript.split('\n').map(l => l.trim()).filter(Boolean);
    const compact: string[] = [];
    for (const l of parts) { if (compact.length === 0 || compact[compact.length - 1] !== l) compact.push(l); }
    const maxLines = 160;
    let limitedParts = compact.length > maxLines ? compact.slice(-maxLines) : compact;
    let safeTranscript = limitedParts.join('\n');
    const maxChars = 6000;
    if (safeTranscript.length > maxChars) {
      safeTranscript = safeTranscript.slice(-maxChars);
    }
    const prompt = `You are a world-class sales coach. Analyze the following call transcript and extract concrete objection-coaching advice.

TRANSCRIPT FORMAT AND ROLE MAPPING:
- The transcript contains lines prefixed by "User:" and "Assistant:".
- "User:" = the sales rep being coached (the person you address as "You").
- "Assistant:" = the prospect/customer.
- When you output JSON:
  - "assistant_said" MUST quote what the prospect said (from a line starting with "Assistant:").
  - "your_response" MUST quote what the sales rep said (from a line starting with "User:").
  - Never swap these.

    TRANSCRIPT:
    """
    ${safeTranscript}
    """
    
Return ONLY valid JSON with this exact shape:
{
  "coaching": [
    {
      "assistant_said": "verbatim or close paraphrase of the prospect's objection or question (from Assistant)",
      "your_response": "verbatim or close paraphrase of your reply (from User)",
      "issue": "what went wrong in your reply (1-2 sentences, address the person as 'You')",
      "better_response": "a concise, high-quality response you should say next time (2-4 sentences, natural phrasing)",
      "why_better": "brief reasoning why this works (1-2 sentences)",
      "category": "one of: pricing, timing, authority, fit, competition, clarity, trust, other"
    }
  ],
  "summary": "overall guidance in 2-3 sentences (address the person as 'You')",
  "tips": ["3 short bullet tips you should remember"]
}

Instructions:
- Prefer analyzing moments where an Assistant line is followed by a User reply; pick the most instructive examples.
- Focus on your weaknesses and how to respond better next time.
- Use plain language; avoid jargon.
- Address the person directly as "You" throughout all feedback.
- If no clear objection exists, still identify weak spots and propose better phrasing.
- Keep responses human and natural, not robotic.
- Do NOT include markdown fences or any text outside of the JSON.`;

    // Robust analysis with multiple fallbacks
    const attemptOpenAIAnalysis = async (): Promise<any | null> => {
      const attempts = [
        { model: 'gpt-5-2025-08-07', useNewParams: true, max: 700 },
        { model: 'o4-mini-2025-04-16', useNewParams: true, max: 650 },
        { model: 'gpt-5-mini-2025-08-07', useNewParams: true, max: 650 },
        { model: 'gpt-5-nano-2025-08-07', useNewParams: true, max: 600 },
        { model: 'gpt-4.1-2025-04-14', useNewParams: true, max: 650 },
        { model: 'gpt-4o-mini', useNewParams: false, max: 600 },
      ];

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      
      for (const attempt of attempts) {
        console.log(`Attempting model: ${attempt.model}`);

        const bodyBase: any = {
          model: attempt.model,
          messages: [
            { role: 'system', content: 'You are a concise, practical sales coach. Always return strict JSON.' },
            { role: 'user', content: prompt },
          ],
        };

        const maxTries = 3;
        for (let i = 0; i < maxTries; i++) {
          try {
            const body = { ...bodyBase } as any;
            if (attempt.useNewParams) {
              body.max_completion_tokens = attempt.max;
            } else {
              body.max_tokens = attempt.max;
              body.temperature = 0.6;
            }

            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });

            if (resp.ok) {
              const aiData = await resp.json();
              return aiData;
            }

            const errorText = await resp.text();
            console.error(`OpenAI error for ${attempt.model} (try ${i + 1}/${maxTries})`, {
              status: resp.status,
              error: errorText
            });

            const isRateLimit = resp.status === 429 || errorText.includes('rate_limit_exceeded') || errorText.includes('Rate limit');
            const isQuotaExceeded = errorText.includes('insufficient_quota') || errorText.includes('quota');
            
            if (!isRateLimit && !isQuotaExceeded) {
              // For other errors, break this model attempt and try next model
              break;
            }

            // For rate limits, wait and retry the same model
            if (isRateLimit && i < maxTries - 1) {
              await sleep(1000 * (i + 1));
              continue;
            }
          } catch (fetchError) {
            console.error(`Network error for ${attempt.model} (try ${i + 1}/${maxTries}):`, fetchError);
            if (i < maxTries - 1) {
              await sleep(500);
              continue;
            }
          }
        }
      }

      return null;
    };

    console.log('Making OpenAI request...');
    const aiData = await attemptOpenAIAnalysis();

    let coaching;
    if (!aiData) {
      console.log('All OpenAI models failed, generating manual analysis...');
      
      // Generate robust local fallback analysis
      coaching = generateManualCoachingAnalysis(safeTranscript);
    } else {
      let content: string = aiData.choices?.[0]?.message?.content ?? '';

      // Strip markdown fences if present
      content = content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }

      try {
        coaching = JSON.parse(content);
      } catch (e) {
        console.warn('JSON parse failed, using manual analysis');
        coaching = generateManualCoachingAnalysis(safeTranscript);
      }
    }

    // After successful AI analysis, deduct 0.5 credits and record transaction
    const currentCredits = Number(profile.credits);
    const newCreditAmount = Number((currentCredits - 0.5).toFixed(2));

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditAmount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to deduct credits after analysis', updateError);
      return new Response(JSON.stringify({ error: 'Analysis succeeded but credit deduction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record transaction with allowed type 'deduction' (amount in hundredths)
    const { error: txnError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'deduction',
        amount: -50,
        description: `Objection coaching for call ${callId}`,
      });

    if (txnError) {
      console.warn('Transaction insert failed', txnError);
    }

    console.log('Coaching analysis completed successfully');
    return new Response(JSON.stringify({ success: true, ...coaching, credits_remaining: newCreditAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('FATAL in analyze-call-coaching', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});