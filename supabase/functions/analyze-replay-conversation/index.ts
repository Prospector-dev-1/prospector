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
    const { transcript, exchangeCount, sessionConfig } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Analyze the conversation using GPT
    const analysisPrompt = `Analyze this sales call replay conversation and provide a detailed score and feedback.

CONVERSATION TRANSCRIPT:
${transcript}

SESSION CONFIGURATION:
- Replay Mode: ${sessionConfig.replayMode}
- Prospect Personality: ${sessionConfig.prospectPersonality}  
- Challenge Mode: ${sessionConfig.gamificationMode}
- Original Moment: ${sessionConfig.originalMoment.type} - ${sessionConfig.originalMoment.summary}
- Number of Exchanges: ${exchangeCount}

SCORING CRITERIA (Rate 1-100):
1. Response Quality (40%): How well did they handle the objections?
2. Communication Skills (25%): Clarity, tone, professionalism
3. Objection Handling (20%): Specific techniques used
4. Persistence & Follow-up (15%): Ability to continue conversation naturally

BONUS POINTS:
- Replay Mode difficulty multiplier
- Personality challenge bonus
- Gamification mode achievement

Provide:
1. Overall score (1-100)
2. Brief feedback (2-3 sentences)
3. Key strengths
4. Areas for improvement
5. Specific technique recommendations

Format as JSON with keys: score, feedback, strengths, improvements, recommendations`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert sales coach analyzing replay conversations. Provide detailed, actionable feedback.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Try to parse as JSON, fallback to structured text analysis
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // Fallback analysis if JSON parsing fails
      analysis = parseTextAnalysis(analysisText, sessionConfig, exchangeCount);
    }

    // Apply difficulty multipliers
    const finalScore = applyDifficultyBonus(analysis.score, sessionConfig, exchangeCount);

    return new Response(JSON.stringify({
      score: Math.round(finalScore),
      feedback: analysis.feedback,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      recommendations: analysis.recommendations,
      rawScore: analysis.score,
      bonusPoints: Math.round(finalScore - analysis.score)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-replay-conversation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseTextAnalysis(text: string, sessionConfig: any, exchangeCount: number) {
  // Extract score from text (look for numbers)
  const scoreMatch = text.match(/(?:score|rating).*?(\d{1,3})/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

  // Extract feedback (first few sentences)
  const sentences = text.split('.').slice(0, 3).join('.') + '.';
  
  return {
    score: Math.min(Math.max(score, 1), 100),
    feedback: sentences.length > 10 ? sentences : 'Good effort! Continue practicing to improve your objection handling skills.',
    strengths: ['Participated actively', 'Completed the conversation'],
    improvements: ['Practice objection handling', 'Work on response timing'],
    recommendations: ['Focus on acknowledging concerns first', 'Ask follow-up questions']
  };
}

function applyDifficultyBonus(baseScore: number, sessionConfig: any, exchangeCount: number): number {
  let multiplier = 1.0;
  let bonus = 0;

  // Replay mode difficulty
  switch (sessionConfig.replayMode) {
    case 'variation':
      multiplier += 0.05;
      break;
    case 'escalation':
      multiplier += 0.15;
      break;
    case 'chain':
      multiplier += 0.10;
      break;
  }

  // Personality difficulty
  switch (sessionConfig.prospectPersonality) {
    case 'skeptical':
      multiplier += 0.08;
      break;
    case 'aggressive':
      multiplier += 0.15;
      break;
    case 'budget-conscious':
      multiplier += 0.05;
      break;
    case 'time-pressed':
      multiplier += 0.03;
      break;
  }

  // Gamification bonuses
  switch (sessionConfig.gamificationMode) {
    case 'speed-challenge':
      bonus += exchangeCount >= 3 ? 10 : 5;
      break;
    case 'streak-builder':
      bonus += exchangeCount * 3;
      break;
    case 'perfect-score':
      multiplier += 0.20;
      break;
    case 'objection-master':
      bonus += exchangeCount >= 3 ? 15 : 5;
      break;
    case 'closing-champion':
      multiplier += 0.10;
      break;
  }

  // Exchange completion bonus
  if (exchangeCount >= 3) {
    bonus += 5;
  }

  return Math.min((baseScore * multiplier) + bonus, 100);
}