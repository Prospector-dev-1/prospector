import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Enhanced AI Conversation Start ===');
    const { 
      sessionId, 
      originalMoment, 
      replayMode, 
      prospectPersonality, 
      gamificationMode,
      customProspectId 
    } = await req.json();

    console.log('Enhanced AI conversation start:', { 
      sessionId, 
      replayMode, 
      prospectPersonality, 
      gamificationMode,
      customProspectId 
    });

    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    if (!vapiApiKey) {
      console.error('VAPI_API_KEY not found in environment');
      throw new Error('VAPI_API_KEY not found');
    }
    console.log('VAPI API Key available:', !!vapiApiKey);

    // Get user ID from auth
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Get AI prospect profile (custom or default)
    let prospectProfile = null;
    if (customProspectId) {
      const { data: customProfile } = await supabase
        .from('ai_prospect_profiles')
        .select('*')
        .eq('id', customProspectId)
        .single();
      
      prospectProfile = customProfile;
    } else {
      // Get default profile based on personality
      const { data: defaultProfile } = await supabase
        .from('ai_prospect_profiles')
        .select('*')
        .eq('base_personality', prospectPersonality)
        .eq('is_public', true)
        .order('difficulty_level', { ascending: true })
        .limit(1)
        .single();
      
      prospectProfile = defaultProfile;
    }

    // Get user's interaction history for this personality
    const { data: interactionHistory } = await supabase
      .from('ai_prospect_interactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('prospect_personality', prospectPersonality)
      .order('created_at', { ascending: false })
      .limit(5);

    // Generate enhanced system prompt
    const systemPrompt = generateEnhancedSystemPrompt({
      originalMoment,
      replayMode,
      prospectPersonality,
      gamificationMode,
      prospectProfile,
      interactionHistory: interactionHistory || []
    });

    // Get voice for personality with fallback
    const voiceId = getVoiceForPersonality(prospectPersonality);
    console.log('Selected voice for personality:', { prospectPersonality, voiceId });

    // Create VAPI assistant with enhanced configuration
    const assistantConfig = {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        maxTokens: 250,
        temperature: 0.8
      },
      voice: {
        provider: "openai",
        voiceId: voiceId
      },
      firstMessage: generateContextualFirstMessage(originalMoment, prospectProfile),
      recordingEnabled: false,
      endCallMessage: "Thank you for the practice session. Your performance will be analyzed shortly.",
      metadata: {
        sessionId,
        prospectPersonality,
        replayMode,
        gamificationMode,
        customProspectId,
        prospectProfileId: prospectProfile?.id
      }
    };

    console.log('Creating VAPI assistant with config:', JSON.stringify(assistantConfig, null, 2));

    let response;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        response = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assistantConfig),
        });

        if (response.ok) {
          console.log('VAPI assistant created successfully on attempt', retryCount + 1);
          break;
        }

        const errorText = await response.text();
        console.error(`VAPI API error (attempt ${retryCount + 1}):`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        if (response.status === 429) {
          // Rate limit - wait with exponential backoff
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Rate limited, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        } else {
          // Non-retryable error
          throw new Error(`VAPI API error: ${response.status} - ${errorText}`);
        }
      } catch (fetchError) {
        console.error(`Network error on attempt ${retryCount + 1}:`, fetchError);
        if (retryCount === maxRetries - 1) {
          throw new Error(`Failed to connect to VAPI after ${maxRetries} attempts: ${fetchError.message}`);
        }
        const delay = baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    if (!response || !response.ok) {
      throw new Error('Failed to create VAPI assistant after all retries');
    }

    const assistantData = await response.json();

    // Store conversation analytics initialization
    await supabase
      .from('conversation_analytics')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        conversation_flow: [],
        objection_handling_patterns: {},
        personality_transitions: [],
        buying_signal_responses: {},
        performance_metrics: {
          start_time: new Date().toISOString(),
          prospect_profile_id: prospectProfile?.id,
          custom_prospect_used: !!customProspectId
        }
      });

    return new Response(JSON.stringify({
      assistantId: assistantData.id,
      sessionConfig: {
        replayMode,
        prospectPersonality,
        gamificationMode,
        prospectProfile: prospectProfile ? {
          id: prospectProfile.id,
          name: prospectProfile.name,
          difficulty_level: prospectProfile.difficulty_level,
          personality_traits: prospectProfile.personality_traits
        } : null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== Error in start-enhanced-ai-conversation ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sessionId,
      prospectPersonality,
      replayMode
    });
    
    let errorMessage = 'Failed to start AI conversation';
    let statusCode = 500;
    
    if (error.message.includes('Rate limit')) {
      errorMessage = 'AI service is currently busy. Please try again in a moment.';
      statusCode = 429;
    } else if (error.message.includes('VAPI_API_KEY')) {
      errorMessage = 'Service configuration error. Please contact support.';
      statusCode = 503;
    } else if (error.message.includes('User not authenticated')) {
      errorMessage = 'Authentication required. Please sign in again.';
      statusCode = 401;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message,
      retry: statusCode === 429
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateEnhancedSystemPrompt({ originalMoment, replayMode, prospectPersonality, gamificationMode, prospectProfile, interactionHistory }) {
  const basePersonality = getPersonalityTraits(prospectPersonality);
  const profileTraits = prospectProfile?.personality_traits || {};
  const objectionPatterns = prospectProfile?.objection_patterns || [];
  const buyingSignals = prospectProfile?.buying_signals || [];
  
  // Analyze interaction history for personality evolution
  const personalityState = analyzePersonalityEvolution(interactionHistory);
  
  let prompt = `You are an AI prospect in a sales training simulation. Your role is to provide realistic sales practice.

CORE PERSONALITY: ${prospectPersonality.toUpperCase()}
${basePersonality}

ENHANCED PROFILE TRAITS:
${Object.entries(profileTraits).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

CURRENT PERSONALITY STATE: ${personalityState.current}
${personalityState.description}

OBJECTION PATTERNS:
${objectionPatterns.map(pattern => 
  `- ${pattern.type} (${pattern.intensity}): Triggered by ${pattern.triggers.join(', ')}`
).join('\n')}

BUYING SIGNALS TO SHOW:
${buyingSignals.map(signal => 
  `- ${signal.signal} (${signal.probability * 100}% chance when appropriate)`
).join('\n')}

CONVERSATION CONTEXT:
We're discussing a ${originalMoment.type} moment from a previous call: "${originalMoment.context}"

BEHAVIORAL INSTRUCTIONS:
1. Start with your current personality state but be ready to transition based on the user's approach
2. Show objections according to your patterns, but allow them to be overcome with good responses
3. Display buying signals when the user demonstrates competence
4. Remember and reference previous interactions if this isn't your first conversation with this user
5. Gradually warm up if the user shows expertise and builds trust
6. Challenge the user appropriately for their skill level

REALISM GUIDELINES:
- Use industry-appropriate language for ${prospectProfile?.industry_context || 'general business'}
- Maintain ${profileTraits.formality || 'medium'} formality level
- Show ${profileTraits.directness || 'medium'} directness in communication
- Demonstrate ${profileTraits.technical_depth || 'medium'} technical understanding

ROLE GUARDRAILS:
- You are the BUYER/PROSPECT. Do not pitch, sell, or promote any product or service.
- Never speak as the seller. Refer to the user's offer as "your product/solution/company". Do NOT say "our product", "we can offer", or similar.
- Do not invent pricing, features, or implementation details. Ask the user to provide them.
- If the user asks you to pitch or to describe "your" product, correct the role: "I'm the buyer here—help me understand your value and fit."

FEW-SHOT CALIBRATION:
User (seller): "We help SMBs reduce no-shows by 30% using automated reminders."
Prospect (you): "Okay. We already use Google Calendar. Where exactly does the 30% come from, and what does rollout look like for a 15-person team?"

User (seller): "Can you give me your pricing tiers?"
Prospect (you): "That's your area—walk me through your pricing and what drives ROI for businesses like mine."

GAMIFICATION MODE: ${gamificationMode.toUpperCase()}
${getGamificationInstructions(gamificationMode)}

Remember: You're here to help the user practice and improve. Be challenging but fair, and provide realistic responses that help them develop real sales skills.`;

  return prompt;
}

function analyzePersonalityEvolution(interactionHistory) {
  if (!interactionHistory.length) {
    return {
      current: 'initial',
      description: 'This is our first interaction. Start with base personality settings.'
    };
  }

  const latestInteraction = interactionHistory[0];
  const personalityState = latestInteraction.personality_state;
  
  if (personalityState?.current === 'warmed_up') {
    return {
      current: 'returning_warm',
      description: 'You remember this person positively from previous conversations. Start somewhat warmer but still maintain your core personality.'
    };
  } else if (personalityState?.current === 'frustrated') {
    return {
      current: 'returning_skeptical',
      description: 'You had a challenging previous conversation with this person. Start more guarded and require extra effort to warm up.'
    };
  }

  return {
    current: 'returning_neutral',
    description: 'You have some history with this person but previous conversations were mixed. Start with slight recognition.'
  };
}

function getPersonalityTraits(personality) {
  const traits = {
    skeptical: "You are naturally doubtful and require strong evidence. You question claims, ask for proof, and are slow to trust. However, you can be won over with data, references, and logical arguments.",
    enthusiastic: "You are excited about new solutions but also busy and easily distracted. You appreciate innovation but need quick, clear value propositions. You make decisions quickly when convinced.",
    professional: "You are formal, process-oriented, and thorough. You value proper procedures, documentation, and risk management. You prefer detailed discussions and careful evaluation.",
    aggressive: "You are direct, challenging, and demanding. You push back hard on everything, test the salesperson's knowledge, and don't accept weak answers. You respect strength and expertise.",
    analytical: "You are data-driven, detail-oriented, and methodical. You want numbers, charts, and technical specifications. You ask probing questions and need comprehensive information."
  };
  
  return traits[personality] || traits.professional;
}

function getGamificationInstructions(mode) {
  const instructions = {
    speed: "Focus on quick responses and rapid-fire objections. Test the user's ability to think fast and respond efficiently.",
    difficulty: "Present complex, multi-layered objections. Combine several concerns into single responses and require sophisticated handling.",
    empathy: "Pay special attention to emotional intelligence. Respond positively to empathetic approaches and negatively to purely logical ones."
  };
  
  return instructions[mode] || '';
}

function getVoiceForPersonality(personality) {
  // Use OpenAI TTS voices that are compatible with VAPI
  const voiceMap = {
    skeptical: 'nova',      // Strong, authoritative
    enthusiastic: 'alloy',  // Energetic, engaging
    professional: 'echo',   // Professional, clear
    aggressive: 'fable',    // Bold, assertive
    analytical: 'onyx'      // Thoughtful, measured
  };
  
  const selectedVoice = voiceMap[personality] || voiceMap.professional;
  console.log('Voice mapping:', { personality, selectedVoice });
  return selectedVoice;
}

function generateContextualFirstMessage(originalMoment, prospectProfile) {
  const contextualMessages = {
    objection: [
      "I have to say, I'm still not convinced about what we discussed before...",
      "Look, I've been thinking about our last conversation, and I still have concerns...",
      "Before we continue, I need to address some issues from last time..."
    ],
    question: [
      "I still have some questions about what you mentioned before...",
      "Can we dive deeper into that topic we were discussing?",
      "I've been thinking about your proposal, but I need more details..."
    ],
    closing: [
      "Alright, let's talk next steps. What exactly are you proposing?",
      "I'm ready to hear your recommendation, but I need to understand the details...",
      "Walk me through what you're suggesting we do here..."
    ],
    discovery: [
      "Tell me more about how this would work for someone in my situation...",
      "I'm curious about your approach. What makes you different?",
      "Help me understand how this fits with what we're trying to accomplish..."
    ]
  };
  
  const messages = contextualMessages[originalMoment.type] || contextualMessages.discovery;
  return messages[Math.floor(Math.random() * messages.length)];
}