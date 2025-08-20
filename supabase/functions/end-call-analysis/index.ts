import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getSuccessEvaluationPrompt } from "../_shared/success-evaluation-prompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let callRecordId: string | undefined;
  let userId: string | undefined;
  
  try {
    const requestBody = await req.json();
    callRecordId = requestBody.callRecordId;
    const transcript = requestBody.transcript;
    const duration = requestBody.duration;
    
    console.log('=== END-CALL-ANALYSIS START ===');
    console.log('Call Record ID:', callRecordId);
    console.log('Transcript length:', transcript?.length || 0);
    console.log('Duration:', duration);
    
    // If transcript is missing, try to fetch from call record
    let finalTranscript = transcript;
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Decode JWT locally
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

    // If no transcript provided, try to use the one from the call record
    if (!finalTranscript && callRecord.transcript) {
      console.log('Using transcript from call record');
      finalTranscript = callRecord.transcript;
    }
    
    if (!finalTranscript || finalTranscript.trim().length === 0) {
      console.log('No valid transcript available, updating call status to failed');
      
      // Update call record with failed status and helpful message
      await supabaseService
        .from('calls')
        .update({
          call_status: 'failed',
          ai_feedback: 'Unable to analyze call: No transcript was captured during the call. This may happen if the call was too short or there were technical issues. Please try making another call.'
        })
        .eq('id', callRecordId);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No transcript available for analysis',
        message: 'Call analysis failed due to missing transcript'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== ANALYSIS DEBUG ===');
    console.log('Transcript received:', finalTranscript);
    console.log('Transcript length:', finalTranscript.length);
    console.log('Duration:', duration);

    // Remove large system/prompt blocks and normalize whitespace
    function stripSystemContent(raw: string): string {
      if (!raw) return '';
      let t = raw.replace(/\r/g, '');
      // Aggressively drop known prompt sections (often injected by simulators)
      const sectionPattern = /(?:ROLE AND CONTEXT|BUSINESS CONTEXT|PERSONALITY|OBJECTIONS STRATEGY|HUMAN-LIKE SPEECH GUIDELINES)[\s\S]*?(?=(?:\n{2,}|$))/gi;
      t = t.replace(sectionPattern, '');
      // Remove obvious guideline lines
      const lines = t.split(/\n+/).map(l => l.trim());
      const keep: string[] = [];
      for (const l of lines) {
        if (!l) continue;
        if (/^(Assistant:|User:)/.test(l)) { keep.push(l); continue; }
        // Skip lines that look like meta/guidelines
        if (/\b(communication style|backchannel|disfluenc|guidelines|constraint|primary goal|current toolset|mood right now|conversation quirks)\b/i.test(l)) continue;
        if (/^[-•]/.test(l)) continue;
        if ((l.match(/-/g)?.length || 0) >= 3) continue;
        // Very long lines are likely prompt blocks
        if (l.length > 320) continue;
        keep.push(l);
      }
      // Deduplicate adjacent repeats
      const dedup: string[] = [];
      for (const l of keep) {
        if (dedup.length === 0 || dedup[dedup.length - 1] !== l) dedup.push(l);
      }
      return dedup.join('\n').trim();
    }

    // Clean up transcript to remove duplicates and repetitive text
    function cleanTranscript(rawTranscript: string): string {
      if (!rawTranscript) return '';
      const stripped = stripSystemContent(rawTranscript);
      const lines = stripped.split(/\n+/).map(line => line.trim()).filter(Boolean);
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
      return cleanedLines.join('\n');
    }

    // Advanced normalization: collapse repeated phrases
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

    // Fallback: infer speaker turns from plain text by alternating speakers
    function inferTurnsFromPlainText(raw: string): string {
      const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const filtered = lines.filter(l => {
        if (/^(Assistant:|User:)/.test(l)) return true;
        if (l.length > 280) return false;
        if (/\b(ROLE AND CONTEXT|BUSINESS CONTEXT|PERSONALITY|OBJECTIONS STRATEGY|HUMAN-LIKE SPEECH GUIDELINES)\b/i.test(l)) return false;
        if (/\b(communication style|backchannel|disfluenc|guidelines|constraint|primary goal|current toolset)\b/i.test(l)) return false;
        return true;
      });
      if (filtered.length === 0) return '';
      // Heuristic: if the first line looks like a probing question, assume Assistant starts
      const first = filtered[0].toLowerCase();
      let next: 'Assistant' | 'User' = /(what's|what’s|how can i help|what can i do|tell me|what brings you)/.test(first) ? 'Assistant' : 'User';
      const out: string[] = [];
      for (const l of filtered) {
        if (/^(Assistant:|User:)/.test(l)) { out.push(l); continue; }
        out.push(`${next}: ${l}`);
        next = next === 'Assistant' ? 'User' : 'Assistant';
      }
      // Merge consecutive same-speaker lines
      const merged: string[] = [];
      for (const line of out) {
        const m = line.match(/^(Assistant|User):\s*(.*)$/);
        if (!m) continue;
        const speaker = m[1];
        const content = m[2];
        if (merged.length && merged[merged.length - 1].startsWith(`${speaker}:`)) {
          merged[merged.length - 1] = `${speaker}: ${collapseRepeatedPhrases(merged[merged.length - 1].slice(speaker.length + 2) + ' ' + content).trim()}`;
        } else {
          merged.push(`${speaker}: ${collapseRepeatedPhrases(content).trim()}`);
        }
      }
      return merged.join('\n');
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

      if (turns.length === 0) {
        // No labeled turns present; infer by alternation
        return inferTurnsFromPlainText(normalized);
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

      const joined = out.join('\n');
      const hasUser = /\n?User:\s+/.test(joined);
      if (!hasUser) {
        // Ensure we have user participation for analysis to proceed
        return inferTurnsFromPlainText(normalized);
      }
      return joined;
    }

    const initialClean = cleanTranscript(finalTranscript);
    const cleanedTranscript = rebuildTurns(initialClean);
    console.log('Cleaned transcript:', cleanedTranscript);

    // Check for meaningful USER participation based on cleaned, labeled turns
    const userTurns = cleanedTranscript
      .split('\n')
      .filter(l => l.startsWith('User:'))
      .map(l => l.replace(/^User:\s*/, '').trim())
      .filter(Boolean);

    const trivialUtterances = new Set(['hi','hello','yeah','ok','okay','mm-hmm','mhm','right','got it','bye','thanks','hmm']);
    const hasMeaningfulParticipation = userTurns.some(t => {
      const tClean = t.toLowerCase().replace(/[.,!?]/g, '').trim();
      if (tClean.length < 8) return false;
      return !trivialUtterances.has(tClean);
    });
    
    console.log('User turns:', userTurns.length, 'Has meaningful participation:', hasMeaningfulParticipation);
    
    // If no meaningful user participation, assign minimum scores and finish
    if (!hasMeaningfulParticipation) {
      console.log('No meaningful user participation detected');
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
        feedback: "No sales conversation detected. Assigned minimum score (1/10). Please actively participate by speaking to the prospect to receive a full analysis."
      };
      
      console.log('Using minimum scores (1) for no participation');
      
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
    const analysisPrompt = getSuccessEvaluationPrompt(cleanedTranscript, { target: 'openai' });
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
    
    // Update call record with failed status if we have the callRecordId
    if (callRecordId && userId) {
      try {
        const supabaseService = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
        );
        
        await supabaseService
          .from('calls')
          .update({
            call_status: 'failed',
            ai_feedback: `Analysis failed: ${error.message}. Please try the analysis again or contact support if the issue persists.`
          })
          .eq('id', callRecordId)
          .eq('user_id', userId);
          
        console.log('Updated call record with failed status');
      } catch (updateError) {
        console.error('Failed to update call record with error status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});