import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { replayMode, prospectPersonality, gamificationMode, originalMoment } = await req.json();
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    // Generate enhanced system prompt based on configuration
    const systemPrompt = generateSystemPrompt(replayMode, prospectPersonality, gamificationMode, originalMoment);
    
    // Create VAPI assistant with enhanced configuration
    const assistantConfig = {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ],
        temperature: 0.8
      },
      voice: {
        provider: "11labs",
        voiceId: getVoiceForPersonality(prospectPersonality)
      },
      firstMessage: generateFirstMessage(replayMode, originalMoment),
      serverUrl: 'https://akcxkwbqeehxvwhmrqbb.supabase.co/functions/v1/vapi-webhook',
      endCallFunctionEnabled: false,
      recordingEnabled: true,
      hipaaEnabled: false,
      transcriber: {
        provider: "deepgram",
        model: "nova-3-general",
        language: "en"
      },
      clientMessages: ["conversation-update", "function-call", "hang", "model-output", "speech-update", "status-update", "transcript", "tool-calls", "user-interrupted", "voice-input"]
    };
    console.log('Assistant config:', JSON.stringify(assistantConfig, null, 2));

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assistantConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VAPI API error:', errorText);
      throw new Error(`VAPI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('VAPI assistant created:', data.id);

    return new Response(JSON.stringify({ 
      assistantId: data.id,
      sessionConfig: {
        replayMode,
        prospectPersonality,
        gamificationMode,
        originalMoment
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in start-replay-conversation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateSystemPrompt(replayMode: string, prospectPersonality: string, gamificationMode: string, originalMoment: any): string {
  const basePrompt = `You are an AI prospect in a sales call replay simulation. Your job is to engage with the salesperson in a realistic conversation based on the original call moment.

ORIGINAL MOMENT CONTEXT:
Type: ${originalMoment.type}
Summary: ${originalMoment.summary}
Label: ${originalMoment.label}
Coaching Context: ${originalMoment.coaching_tip || 'None'}

REPLAY MODE: ${replayMode}`;

  let modeInstructions = '';
  switch (replayMode) {
    case 'exact':
      modeInstructions = 'Replicate the exact objection or response from the original moment. Stay as close to the original scenario as possible.';
      break;
    case 'variation':
      modeInstructions = 'Present similar objections but with different wording and approach. Keep the core concern the same but vary your presentation.';
      break;
    case 'escalation':
      modeInstructions = 'Be more challenging than the original. Push back harder, ask tougher questions, and be more resistant to their responses.';
      break;
    case 'chain':
      modeInstructions = 'Continue the conversation beyond the original moment. Present follow-up objections and questions to extend the practice session.';
      break;
  }

  let personalityInstructions = '';
  switch (prospectPersonality) {
    case 'professional':
      personalityInstructions = 'Be courteous and professional. Focus on business value and speak in a measured, respectful tone.';
      break;
    case 'skeptical':
      personalityInstructions = 'Be cautious and resistant. Question everything, need lots of proof, and express doubt about claims.';
      break;
    case 'aggressive':
      personalityInstructions = 'Be direct and challenging. Interrupt occasionally, push back strongly, and challenge their expertise.';
      break;
    case 'indecisive':
      personalityInstructions = 'Ask many clarifying questions, seem overwhelmed by information, and express uncertainty about decisions.';
      break;
    case 'budget-conscious':
      personalityInstructions = 'Focus heavily on price and cost. Express concern about budget limitations and demand ROI justification.';
      break;
    case 'time-pressed':
      personalityInstructions = 'Be impatient and want quick answers. Express that you have limited time and need fast decisions.';
      break;
  }

  let gamificationInstructions = '';
  switch (gamificationMode) {
    case 'speed-challenge':
      gamificationInstructions = 'Present objections that require quick thinking. Be ready to escalate if they take too long to respond.';
      break;
    case 'streak-builder':
      gamificationInstructions = 'Start easy but gradually increase difficulty with each exchange if they handle responses well.';
      break;
    case 'perfect-score':
      gamificationInstructions = 'Be demanding and expect excellent responses. Only positive signals should come from truly outstanding answers.';
      break;
    case 'objection-master':
      gamificationInstructions = 'Present multiple variations of the same core objection to test their adaptability.';
      break;
    case 'closing-champion':
      gamificationInstructions = 'Focus on testing their closing abilities. Present buying signals mixed with final objections.';
      break;
    default:
      gamificationInstructions = 'Engage naturally and provide appropriate resistance level for good practice.';
  }

  return `${basePrompt}

${modeInstructions}

PERSONALITY: ${prospectPersonality}
${personalityInstructions}

CHALLENGE MODE: ${gamificationMode}
${gamificationInstructions}

CONVERSATION GUIDELINES:
- Keep responses concise (1-2 sentences usually)
- Stay in character throughout the conversation
- Provide natural reactions to their responses
- Allow 2-3 exchanges before indicating resolution
- Give buying signals if they handle objections very well
- End positively if they demonstrate mastery

Remember: You're helping them practice. Be challenging but fair, and respond naturally to their skill level.`;
}

function getVoiceForPersonality(personality: string): string {
  const voiceMap: Record<string, string> = {
    'professional': 'bVMeCyTHy58xNoL34h3p', // Professional female voice
    'skeptical': 'EXAVITQu4vr4xnSDxMaL', // Cautious male voice
    'aggressive': 'ZQe5CqHNmFuG8oJR5EBZ', // Direct male voice
    'indecisive': 'pqHfZKP75CvOlQylNhV4', // Uncertain female voice
    'budget-conscious': 'CwhRBWXzGAhq8TQ4Fs17', // Serious male voice
    'time-pressed': 'iP95p4xoKVk53GoZ742B' // Fast-paced female voice
  };
  
  return voiceMap[personality] || 'bVMeCyTHy58xNoL34h3p'; // Default to professional
}

function generateFirstMessage(replayMode: string, originalMoment: any): string {
  const contextualOpeners = {
    'objection': [
      "I'm not sure this is right for us.",
      "I have some concerns about this.",
      "I need to think about this more."
    ],
    'pricing': [
      "That seems expensive.",
      "What's this going to cost me?",
      "I'm not sure we have the budget."
    ],
    'discovery': [
      "Tell me more about this.",
      "How does this work exactly?",
      "What makes you different?"
    ],
    'closing': [
      "I need to discuss this with my team.",
      "Send me some information.",
      "I'll get back to you."
    ]
  };

  const openers = contextualOpeners[originalMoment.type] || [
    "So, what can you tell me?",
    "I'm listening.",
    "Go ahead."
  ];

  return openers[Math.floor(Math.random() * openers.length)];
}