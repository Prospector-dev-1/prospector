import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callRecordId, transcript, duration } = await req.json();
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Decode JWT locally
    let userId: string | undefined;
    try {
      const base64Url = token.split('.')[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch (_) {
      userId = undefined;
    }
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get call record
    const { data: callRecord } = await supabaseService
      .from('calls')
      .select('*')
      .eq('id', callRecordId)
      .eq('user_id', userId)
      .single();

    if (!callRecord) {
      throw new Error('Call record not found');
    }

    console.log('=== ANALYSIS DEBUG ===');
    console.log('Transcript received:', transcript);
    console.log('Transcript length:', transcript.length);
    console.log('Duration:', duration);

    // Clean up transcript to remove duplicates and repetitive text
    function cleanTranscript(rawTranscript: string): string {
      if (!rawTranscript) return '';
      const lines = rawTranscript.split('\n').map(line => line.trim()).filter(Boolean);
      const cleanedLines: string[] = [];
      for (const line of lines) {
        const words = line.split(/\s+/);
        const cleanedWords: string[] = [];
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (i === 0 || word !== words[i - 1]) cleanedWords.push(word);
        }
        const cleanedLine = cleanedWords.join(' ');
        if (cleanedLines.length === 0 || cleanedLines[cleanedLines.length - 1] !== cleanedLine) {
          cleanedLines.push(cleanedLine);
        }
      }
      return cleanedLines.join(' ');
    }

    // Advanced normalization: rebuild turns and collapse repeated phrases
    function collapseRepeatedPhrases(text: string): string {
      const words = text.split(/\s+/).filter(Boolean);
      const out: string[] = [];
      let i = 0;
      while (i < words.length) {
        let collapsed = false;
        for (let n = 6; n >= 2; n--) {
          if (i + 2 * n <= words.length) {
            const a = words.slice(i, i + n).join(' ');
            const b = words.slice(i + n, i + 2 * n).join(' ');
            if (a === b) {
              out.push(...words.slice(i, i + n));
              i += n * 2;
              while (i + n <= words.length && words.slice(i, i + n).join(' ') === a) {
                i += n;
              }
              collapsed = true;
              break;
            }
          }
        }
        if (!collapsed) {
          const w = words[i];
          if (out.length === 0 || out[out.length - 1] !== w) out.push(w);
          i++;
        }
      }
      return out.join(' ').replace(/\s+([,.!?;:])/g, '$1');
    }

    function rebuildTurns(raw: string): string {
      const normalized = raw
        .replace(/\r/g, '')
        .replace(/Assistant:\s*Assistant:/g, 'Assistant:')
        .replace(/User:\s*User:/g, 'User:')
        .replace(/\s*(Assistant:)/g, '\n$1')
        .replace(/\s*(User:)/g, '\n$1')
        .trim();

      const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
      type Turn = { speaker: 'Assistant' | 'User'; text: string };
      const turns: Turn[] = [];

      for (const l of lines) {
        let speaker: 'Assistant' | 'User' | null = null;
        if (l.startsWith('Assistant:')) speaker = 'Assistant';
        else if (l.startsWith('User:')) speaker = 'User';
        const content = speaker ? l.replace(/^(Assistant:|User:)\s*/, '') : l;
        if (speaker) {
          if (turns.length && turns[turns.length - 1].speaker === speaker) {
            turns[turns.length - 1].text += (turns[turns.length - 1].text ? ' ' : '') + content;
          } else {
            turns.push({ speaker, text: content });
          }
        } else if (turns.length) {
          turns[turns.length - 1].text += (turns[turns.length - 1].text ? ' ' : '') + content;
        }
      }

      const out: string[] = [];
      let prevLine = '';
      for (const t of turns) {
        const text = collapseRepeatedPhrases(t.text).trim();
        const line = `${t.speaker}: ${text}`.trim();
        if (text && line !== prevLine) {
          out.push(line);
          prevLine = line;
        }
      }
      return out.join('\n');
    }

    const initialClean = cleanTranscript(transcript);
    const cleanedTranscript = rebuildTurns(initialClean);
    console.log('Cleaned transcript:', cleanedTranscript);

    // Check if the transcript shows meaningful caller participation
    const transcriptLower = cleanedTranscript.toLowerCase();
    const hasBasicParticipation = transcript.length > 30 && (
      transcriptLower.includes('hello') || 
      transcriptLower.includes('hi') || 
      transcriptLower.includes('website') ||
      transcriptLower.includes('business') ||
      transcriptLower.includes('call')
    );
    
    console.log('Has basic participation:', hasBasicParticipation);
    
    // If no participation at all, return zeros immediately
    if (!hasBasicParticipation) {
      console.log('No participation detected');
      const analysis = {
        confidence_score: 0,
        objection_handling_score: 0,
        clarity_score: 0,
        persuasiveness_score: 0,
        tone_score: 0,
        overall_pitch_score: 0,
        closing_score: 0,
        overall_score: 0,
        successful_sale: false,
        feedback: "No sales conversation detected. You need to actively participate in the call by speaking to the prospect."
      };
      
      console.log('Using zero scores for no participation');
      
      // Update call record with analysis
      const { error: updateError } = await supabaseService
        .from('calls')
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
        transcript: cleanedTranscript,
          ai_feedback: analysis.feedback,
          call_status: 'completed'
        })
        .eq('id', callRecordId);

      if (updateError) {
        console.error('Error updating call record:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        analysis: analysis 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For any participation, use AI analysis for rigorous scoring
    console.log('Participation detected, proceeding with rigorous AI analysis');
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
}`;

    console.log('Sending analysis prompt to OpenAI...');
    
    // Multiple fallback models for reliability
    const models = ['gpt-4o-mini', 'gpt-4o'];
    let analysis;
    let openAISuccess = false;

    for (const model of models) {
      try {
        console.log(`Attempting OpenAI model: ${model}`);
        
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert sales coach. You MUST respond with valid JSON only. Analyze cold calling performance and provide specific, actionable feedback with quotes from the transcript.' 
              },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.2,
            max_tokens: 1000,
          }),
        });

        console.log(`OpenAI response status for ${model}:`, openAIResponse.status);
        
        if (openAIResponse.ok) {
          const openAIData = await openAIResponse.json();
          const analysisText = openAIData.choices[0].message.content;
          
          try {
            analysis = JSON.parse(analysisText);
            console.log('OpenAI analysis successful with model:', model);
            openAISuccess = true;
            break;
          } catch (parseError) {
            console.log(`JSON parsing failed for ${model}, trying next model`);
            continue;
          }
        } else {
          const errorText = await openAIResponse.text();
          console.log(`OpenAI API error for ${model}:`, errorText);
          continue;
        }
      } catch (error) {
        console.log(`OpenAI request failed for ${model}:`, error.message);
        continue;
      }
    }

    // If OpenAI failed, use manual analysis
    if (!openAISuccess) {
      console.log('All OpenAI models failed, using manual analysis');
      
      // Rigorous manual analysis based on actual sales performance
      const transcriptLower = cleanedTranscript.toLowerCase();
      
      // Check for proper introduction (professional opening)
      const hasProperIntro = transcriptLower.includes('this is') || transcriptLower.includes('my name is') || transcriptLower.includes('calling from');
      
      // Check for clear value proposition (not just mentioning website)
      const hasValueProp = (transcriptLower.includes('better') && transcriptLower.includes('website')) || 
                          transcriptLower.includes('improve your') || 
                          transcriptLower.includes('help you') ||
                          transcriptLower.includes('save you');
      
      // Check for objection handling (responding to resistance)
      const hasObjectionHandling = transcriptLower.includes('understand') || 
                                  transcriptLower.includes('but what if') || 
                                  transcriptLower.includes('let me explain');
      
      // Check for closing attempt (asking for next step)
      const hasClosing = transcriptLower.includes('would you be interested') || 
                        transcriptLower.includes('can we schedule') || 
                        transcriptLower.includes('when would be good');
      
      // Check for successful appointment booking or sale indicators
      const hasAppointmentBooked = transcriptLower.includes('appointment') || 
                                  transcriptLower.includes('meeting') || 
                                  transcriptLower.includes('schedule') ||
                                  transcriptLower.includes('book') ||
                                  transcriptLower.includes('calendar') ||
                                  transcriptLower.includes('available') ||
                                  transcriptLower.includes('free time') ||
                                  transcriptLower.includes('tomorrow') ||
                                  transcriptLower.includes('next week') ||
                                  transcriptLower.includes('monday') ||
                                  transcriptLower.includes('tuesday') ||
                                  transcriptLower.includes('wednesday') ||
                                  transcriptLower.includes('thursday') ||
                                  transcriptLower.includes('friday') ||
                                  (transcriptLower.includes('yes') && (transcriptLower.includes('interested') || transcriptLower.includes('like to'))) ||
                                  transcriptLower.includes('sounds good') ||
                                  transcriptLower.includes('that works') ||
                                  transcriptLower.includes('perfect');
      
      // Harsh but fair scoring - most people should get 1-3 on their first tries
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
        tone_score: 2, // Default low since we can't assess tone from text
        overall_pitch_score: pitchScore,
        closing_score: closingScore,
        overall_score: overallScore,
        successful_sale: hasAppointmentBooked,
        feedback: `Sales Performance Analysis:
INTRODUCTION: ${hasProperIntro ? 'Good - You introduced yourself professionally' : 'Poor - No professional introduction detected'}
VALUE PROPOSITION: ${hasValueProp ? 'Fair - You mentioned improvements' : 'Poor - No clear value proposition offered'}
OBJECTION HANDLING: ${hasObjectionHandling ? 'Good - You addressed concerns' : 'Poor - No objection handling detected'}
CLOSING: ${hasClosing ? 'Good - You attempted to advance the sale' : 'Poor - No closing attempt detected'}

${overallScore < 3 ? 'This was a weak sales call. Focus on: 1) Professional introduction 2) Clear value proposition 3) Asking for next steps' : 
  overallScore < 6 ? 'This was an average attempt. Improve your objection handling and closing technique.' : 
  'Solid performance! Keep refining your approach.'}`
      };
    }

    // Update call record with analysis
    const { error: updateError } = await supabaseService
      .from('calls')
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
        transcript: cleanedTranscript,
        ai_feedback: analysis.feedback,
        call_status: 'completed'
      })
      .eq('id', callRecordId);

    if (updateError) {
      console.error('Error updating call record:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in end-call-analysis function:', error);
    
    // Update call status to failed so it doesn't stay in analyzing state
    if (callRecordId) {
      try {
        await supabaseService
          .from('calls')
          .update({ call_status: 'failed' })
          .eq('id', callRecordId);
      } catch (updateError) {
        console.error('Failed to update call status to failed:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});