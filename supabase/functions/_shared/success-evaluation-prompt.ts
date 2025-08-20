// Shared success evaluation prompt used by both Vapi and OpenAI
export const getSuccessEvaluationPrompt = (transcript?: string) => {
  const templateTranscript = transcript || '{{transcript}}';
  
  return `Analyze this cold calling transcript and provide detailed, personalized feedback. The transcript shows a conversation between a CALLER (salesperson) and a PROSPECT (business owner).

TRANSCRIPT:
${templateTranscript}

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
}`
};