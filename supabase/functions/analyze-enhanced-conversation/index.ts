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
    const { transcript, exchangeCount, sessionConfig, sessionId, retryAttempt } = await req.json();
    
    console.log('🔍 Analyzing enhanced conversation:', { 
      sessionId, 
      exchangeCount, 
      transcriptLength: transcript?.length || 0,
      retryAttempt: retryAttempt || 1,
      transcriptSample: transcript?.substring(0, 200) + '...'
    });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Get user ID from auth
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Get conversation analytics
    const { data: analytics } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Get prospect profile for enhanced analysis
    let prospectProfile = null;
    if (sessionConfig.prospectProfile?.id) {
      const { data: profile } = await supabase
        .from('ai_prospect_profiles')
        .select('*')
        .eq('id', sessionConfig.prospectProfile.id)
        .single();
      
      prospectProfile = profile;
    }

    // Enhanced analysis prompt with personality awareness
    const analysisPrompt = `You are an advanced AI sales coach analyzing a conversation between a salesperson and an AI prospect.

PROSPECT PROFILE:
${prospectProfile ? `
- Name: ${prospectProfile.name}
- Personality: ${prospectProfile.base_personality}
- Traits: ${JSON.stringify(prospectProfile.personality_traits)}
- Objection Patterns: ${JSON.stringify(prospectProfile.objection_patterns)}
- Buying Signals: ${JSON.stringify(prospectProfile.buying_signals)}
- Difficulty Level: ${prospectProfile.difficulty_level}/5
` : `Basic personality: ${sessionConfig.prospectPersonality}`}

SESSION CONFIGURATION:
- Replay Mode: ${sessionConfig.replayMode}
- Gamification: ${sessionConfig.gamificationMode}
- Exchange Count: ${exchangeCount}

CONVERSATION TRANSCRIPT:
${transcript}

Please provide a comprehensive analysis in the following JSON format:
{
  "score": [0-100 number],
  "feedback": "Overall performance summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "personalityHandling": {
    "effectiveness": [0-100],
    "personalityTransitions": ["transition1", "transition2"],
    "objectionHandling": {
      "attempted": ["objection1", "objection2"],
      "successful": ["objection1"],
      "missed_opportunities": ["opportunity1"]
    },
    "buyingSignalResponse": {
      "signals_shown": ["signal1", "signal2"],
      "signals_capitalized": ["signal1"],
      "signals_missed": ["signal2"]
    }
  },
  "conversationFlow": {
    "pace": "appropriate|too_fast|too_slow",
    "structure": "excellent|good|needs_improvement",
    "closing_attempt": "yes|no",
    "information_gathering": [0-100]
  },
  "skillAssessment": {
    "rapport_building": [0-100],
    "questioning_technique": [0-100],
    "objection_handling": [0-100],
    "closing_skills": [0-100],
    "product_knowledge": [0-100],
    "emotional_intelligence": [0-100]
  }
}

Focus on how well the salesperson adapted to the specific AI prospect's personality and requirements.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert sales coach providing detailed analysis of sales conversations.' },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📝 OpenAI raw response length:', data.choices[0].message.content.length);
    
    let analysis;
    const rawContent = data.choices[0].message.content;
    
    // Multiple JSON parsing attempts with different strategies
    const parseAttempts = [
      // Attempt 1: Direct parsing
      () => JSON.parse(rawContent),
      
      // Attempt 2: Extract JSON from markdown code blocks
      () => {
        const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) return JSON.parse(jsonMatch[1]);
        throw new Error('No JSON in code block');
      },
      
      // Attempt 3: Find first complete JSON object
      () => {
        const startIdx = rawContent.indexOf('{');
        const endIdx = rawContent.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          return JSON.parse(rawContent.substring(startIdx, endIdx + 1));
        }
        throw new Error('No JSON object found');
      },
      
      // Attempt 4: Clean and parse
      () => {
        const cleaned = rawContent
          .replace(/```json\s*|\s*```/g, '')
          .replace(/^\s*|\s*$/g, '')
          .replace(/\n\s*\/\/.*$/gm, ''); // Remove comments
        return JSON.parse(cleaned);
      }
    ];
    
    let parseSuccess = false;
    for (let i = 0; i < parseAttempts.length; i++) {
      try {
        console.log(`🔄 JSON parse attempt ${i + 1}/${parseAttempts.length}`);
        analysis = parseAttempts[i]();
        console.log('✅ JSON parsing successful on attempt', i + 1);
        parseSuccess = true;
        break;
      } catch (e) {
        console.log(`❌ Parse attempt ${i + 1} failed:`, e.message);
      }
    }
    
    if (!parseSuccess) {
      console.log('⚠️ All JSON parsing attempts failed, using enhanced fallback');
      analysis = parseTextAnalysis(rawContent, sessionConfig, exchangeCount);
    }
    
    // Validate analysis structure
    analysis = validateAnalysisStructure(analysis);

    // Apply difficulty multipliers
    const finalScore = applyDifficultyBonus(
      analysis.score,
      sessionConfig,
      exchangeCount,
      prospectProfile?.difficulty_level || 1
    );

    // Update conversation analytics with results
    if (analytics) {
      await supabase
        .from('conversation_analytics')
        .update({
          conversation_flow: analysis.conversationFlow || [],
          objection_handling_patterns: analysis.personalityHandling?.objectionHandling || {},
          personality_transitions: analysis.personalityHandling?.personalityTransitions || [],
          buying_signal_responses: analysis.personalityHandling?.buyingSignalResponse || {},
          performance_metrics: {
            ...analytics.performance_metrics,
            final_score: finalScore,
            skill_assessment: analysis.skillAssessment,
            end_time: new Date().toISOString()
          }
        })
        .eq('session_id', sessionId);
    }

    // Determine new personality state based on performance
    const newPersonalityState = determinePersonalityEvolution(
      analysis.score,
      analysis.personalityHandling?.effectiveness || 0,
      sessionConfig.prospectPersonality
    );

    // Update or create AI prospect interaction history
    await supabase
      .from('ai_prospect_interactions')
      .upsert({
        user_id: user.id,
        prospect_personality: sessionConfig.prospectPersonality,
        interaction_summary: analysis.feedback,
        personality_state: {
          current: newPersonalityState,
          transitions: analysis.personalityHandling?.personalityTransitions || [],
          last_updated: new Date().toISOString()
        },
        user_strengths: analysis.strengths || [],
        user_weaknesses: analysis.improvements || [],
        successful_responses: analysis.personalityHandling?.objectionHandling?.successful || [],
        failed_responses: analysis.personalityHandling?.objectionHandling?.missed_opportunities || [],
        objection_types_encountered: analysis.personalityHandling?.objectionHandling?.attempted || [],
        conversation_context: {
          session_config: sessionConfig,
          final_score: finalScore,
          exchange_count: exchangeCount
        }
      });

    return new Response(JSON.stringify({
      score: finalScore,
      feedback: analysis.feedback,
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      recommendations: analysis.recommendations || [],
      personalityAnalysis: analysis.personalityHandling,
      skillAssessment: analysis.skillAssessment,
      conversationFlow: analysis.conversationFlow
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-enhanced-conversation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseTextAnalysis(text, sessionConfig, exchangeCount) {
  console.log('📋 Using enhanced fallback text analysis');
  
  // Extract score from various patterns
  const scoreMatches = [
    text.match(/score["\s:]*(\d+)/i),
    text.match(/(\d+)\/100/),
    text.match(/(\d+)\s*points?/i),
    text.match(/rating["\s:]*(\d+)/i)
  ];
  
  let score = 75; // Default
  for (const match of scoreMatches) {
    if (match) {
      score = Math.min(100, Math.max(0, parseInt(match[1])));
      break;
    }
  }
  
  // Extract strengths
  const strengthsSection = text.match(/strengths?[\s\S]*?(?=improvements?|recommendations?|$)/i);
  const strengths = strengthsSection 
    ? extractListItems(strengthsSection[0])
    : ["Maintained conversation flow", "Showed engagement", "Professional communication"];
  
  // Extract improvements  
  const improvementsSection = text.match(/improvements?[\s\S]*?(?=recommendations?|strengths?|$)/i);
  const improvements = improvementsSection
    ? extractListItems(improvementsSection[0])
    : ["Practice active listening", "Ask more probing questions", "Work on objection handling"];
  
  // Extract recommendations
  const recommendationsSection = text.match(/recommendations?[\s\S]*?(?=strengths?|improvements?|$)/i);
  const recommendations = recommendationsSection
    ? extractListItems(recommendationsSection[0])
    : ["Continue practicing with AI prospects", "Focus on specific objection handling", "Study best practices"];
  
  // Context-aware feedback
  let feedback = "Analysis completed successfully. ";
  if (exchangeCount < 3) {
    feedback += "The conversation was brief - try to engage longer for more detailed feedback.";
  } else if (exchangeCount > 10) {
    feedback += "Great conversation length! You maintained good engagement throughout.";
  } else {
    feedback += "Good conversation flow and appropriate length for practice.";
  }
  
  return {
    score,
    feedback,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4), 
    recommendations: recommendations.slice(0, 4),
    personalityHandling: {
      effectiveness: Math.max(40, score - 10),
      personalityTransitions: [],
      objectionHandling: {
        attempted: [],
        successful: [],
        missed_opportunities: []
      }
    },
    skillAssessment: {
      rapport_building: Math.max(30, score - 15),
      questioning_technique: Math.max(25, score - 20),
      objection_handling: Math.max(20, score - 25),
      closing_skills: Math.max(15, score - 30),
      product_knowledge: Math.max(35, score - 10),
      emotional_intelligence: Math.max(30, score - 15)
    }
  };
}

function extractListItems(text) {
  const items = [];
  const patterns = [
    /[-•*]\s*(.+)/g,
    /\d+\.\s*(.+)/g,
    /"([^"]+)"/g,
    /\n\s*([A-Z][^.\n]+)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && items.length < 5) {
      const item = match[1].trim();
      if (item.length > 10 && item.length < 200) {
        items.push(item);
      }
    }
    if (items.length >= 3) break;
  }
  
  return items.length > 0 ? items : [];
}

function validateAnalysisStructure(analysis) {
  return {
    score: typeof analysis.score === 'number' ? Math.min(100, Math.max(0, analysis.score)) : 75,
    feedback: typeof analysis.feedback === 'string' ? analysis.feedback : "Analysis completed",
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : ["Good communication"],
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements : ["Continue practicing"],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : ["Keep improving"],
    personalityHandling: analysis.personalityHandling || {},
    skillAssessment: analysis.skillAssessment || {},
    conversationFlow: analysis.conversationFlow || {}
  };
}

function applyDifficultyBonus(baseScore, sessionConfig, exchangeCount, difficultyLevel = 1) {
  let finalScore = baseScore;

  // Difficulty multiplier (higher difficulty = higher potential score)
  const difficultyMultiplier = 1 + (difficultyLevel - 1) * 0.1;
  finalScore *= difficultyMultiplier;

  // Replay mode bonuses
  const replayModeBonus = {
    detailed: 1.1,
    quick: 1.05,
    focused: 1.15
  };
  finalScore *= replayModeBonus[sessionConfig.replayMode] || 1.0;

  // Gamification bonuses
  const gamificationBonus = {
    speed: exchangeCount >= 8 ? 1.1 : 1.0,
    difficulty: 1.15,
    empathy: 1.1
  };
  finalScore *= gamificationBonus[sessionConfig.gamificationMode] || 1.0;

  // Minimum exchanges bonus
  if (exchangeCount >= 10) {
    finalScore += 5;
  }

  return Math.min(100, Math.round(finalScore));
}

function determinePersonalityEvolution(score, personalityEffectiveness, prospectPersonality) {
  if (score >= 85 && personalityEffectiveness >= 80) {
    return 'warmed_up';
  } else if (score < 50 || personalityEffectiveness < 40) {
    return 'frustrated';
  } else if (score >= 70) {
    return 'interested';
  } else {
    return 'neutral';
  }
}