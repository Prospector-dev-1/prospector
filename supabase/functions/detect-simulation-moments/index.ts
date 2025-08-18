import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, call_id } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Analyze transcript to extract meaningful moments
    const moments = await extractMomentsFromTranscript(transcript);

    console.log(`Generated ${moments.length} moments for call ${call_id}`);

    return new Response(
      JSON.stringify({ moments }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in detect-simulation-moments:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze call moments',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function extractMomentsFromTranscript(transcript: string) {
  const moments = [];
  
  // Split transcript by speaker changes or natural breaks
  const lines = transcript.split('\n').filter(line => line.trim().length > 10);
  
  // Look for specific patterns that indicate important moments
  const objectionPatterns = [
    /but\s+(?:i|we|the)/i,
    /however\s+(?:i|we|the)/i,
    /not\s+(?:sure|interested|ready)/i,
    /(?:can't|cannot)\s+(?:afford|do)/i,
    /(?:don't|do\s+not)\s+(?:need|want|think)/i,
    /already\s+(?:have|using|work)/i,
    /too\s+(?:expensive|costly|much)/i
  ];

  const questionPatterns = [
    /\?$/,
    /^(?:what|how|when|where|why|who)\s+/i,
    /can\s+you\s+(?:tell|explain|clarify)/i,
    /could\s+you\s+(?:help|show)/i
  ];

  const closingPatterns = [
    /(?:ready\s+to|want\s+to|let's)\s+(?:move|proceed|start|begin)/i,
    /(?:sounds\s+good|looks\s+good|that\s+works)/i,
    /(?:when\s+can|how\s+do)\s+(?:we|i)\s+(?:start|begin)/i,
    /(?:i'm|we're)\s+interested/i
  ];

  let momentCounter = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLines = lines.slice(i + 1, i + 4).join(' ');
    const context = lines.slice(Math.max(0, i - 1), i + 3).join('\n');

    // Check for objections
    if (objectionPatterns.some(pattern => pattern.test(line))) {
      moments.push({
        id: `moment_${momentCounter++}`,
        type: 'objection',
        label: 'Objection Handling',
        start_char: Math.max(0, transcript.indexOf(line)),
        end_char: Math.max(0, transcript.indexOf(line)) + line.length,
        summary: `Objection: "${line.substring(0, 80)}${line.length > 80 ? '...' : ''}"`,
        full_text: context,
        difficulty: calculateDifficulty(line, nextLines) <= 2 ? 'easy' : calculateDifficulty(line, nextLines) <= 3 ? 'medium' : 'hard'
      });
    }
    
    // Check for questions
    else if (questionPatterns.some(pattern => pattern.test(line))) {
      moments.push({
        id: `moment_${momentCounter++}`,
        type: 'question',
        label: 'Question Handling',
        start_char: Math.max(0, transcript.indexOf(line)),
        end_char: Math.max(0, transcript.indexOf(line)) + line.length,
        summary: `Question: "${line.substring(0, 80)}${line.length > 80 ? '...' : ''}"`,
        full_text: context,
        difficulty: calculateDifficulty(line, nextLines) <= 2 ? 'easy' : calculateDifficulty(line, nextLines) <= 3 ? 'medium' : 'hard'
      });
    }
    
    // Check for closing opportunities
    else if (closingPatterns.some(pattern => pattern.test(line))) {
      moments.push({
        id: `moment_${momentCounter++}`,
        type: 'closing',
        label: 'Closing Opportunity',
        start_char: Math.max(0, transcript.indexOf(line)),
        end_char: Math.max(0, transcript.indexOf(line)) + line.length,
        summary: `Closing opportunity: "${line.substring(0, 80)}${line.length > 80 ? '...' : ''}"`,
        full_text: context,
        difficulty: calculateDifficulty(line, nextLines) <= 2 ? 'easy' : calculateDifficulty(line, nextLines) <= 3 ? 'medium' : 'hard'
      });
    }
  }

  // If no specific moments found, create general practice moments
  if (moments.length === 0) {
    const sections = transcript.split(/[.!?]{2,}/).filter(section => section.trim().length > 50);
    
    for (let i = 0; i < Math.min(3, sections.length); i++) {
      const section = sections[i].trim();
      moments.push({
        id: `moment_${i + 1}`,
        type: i === 0 ? 'opening' : i === sections.length - 1 ? 'closing' : 'general',
        label: i === 0 ? 'Opening' : i === sections.length - 1 ? 'Closing' : 'General Practice',
        start_char: i * 100,
        end_char: (i + 1) * 100,
        summary: `Practice moment: "${section.substring(0, 80)}${section.length > 80 ? '...' : ''}"`,
        full_text: section,
        difficulty: Math.floor(Math.random() * 3) === 0 ? 'easy' : Math.floor(Math.random() * 3) === 1 ? 'medium' : 'hard'
      });
    }
  }

  // Limit to maximum 5 moments and sort by start_char
  return moments
    .slice(0, 5)
    .sort((a, b) => a.start_char - b.start_char);
}

function calculateDifficulty(line: string, nextLines: string): number {
  let difficulty = 1;
  
  // Increase difficulty based on negative sentiment
  const negativeWords = ['no', 'not', 'never', 'impossible', 'can\'t', 'won\'t', 'refuse'];
  const negativeCount = negativeWords.filter(word => 
    line.toLowerCase().includes(word) || nextLines.toLowerCase().includes(word)
  ).length;
  
  difficulty += Math.min(negativeCount, 2);
  
  // Increase difficulty for complex objections
  if (line.length > 100 || nextLines.length > 200) {
    difficulty += 1;
  }
  
  // Cap at 5
  return Math.min(difficulty, 5);
}