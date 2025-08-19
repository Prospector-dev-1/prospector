// Moment-specific coaching responses

export function getMomentSpecificCoaching(momentType: string, personality: string): string | null {
  const momentCoaching: Record<string, Record<string, string>> = {
    objection: {
      skeptical: "This prospect raised an objection earlier. Stay patient, acknowledge their concern, and provide evidence.",
      aggressive: "They objected before. Be direct but respectful. Focus on business value, not features.",
      analytical: "Previous objection detected. Come prepared with data, ROI calculations, and logical arguments.",
      professional: "They had concerns earlier. Address them systematically and ask clarifying questions.",
      enthusiastic: "They objected but seem engaged. Channel their energy toward solution benefits."
    },
    question: {
      skeptical: "They're asking questions - that's good! Answer thoroughly and ask follow-ups to build trust.",
      aggressive: "Direct questions from an aggressive prospect. Be concise and confident in your responses.",
      analytical: "Detailed questions expected. Provide comprehensive answers with supporting data.",
      professional: "Professional inquiry. Match their level of detail and follow proper business etiquette.",
      enthusiastic: "They're curious! Match their energy and expand on points that excite them."
    },
    closing: {
      skeptical: "Closing moment with a skeptical prospect. Focus on risk mitigation and guarantees.",
      aggressive: "Time to close with an aggressive buyer. Be direct about next steps and timeline.",
      analytical: "Closing with analytical prospect. Present logical next steps and clear implementation plan.",
      professional: "Professional closing opportunity. Outline mutual benefits and formal next steps.",
      enthusiastic: "They're ready! Capture their enthusiasm and move toward commitment."
    },
    discovery: {
      skeptical: "Discovery phase with skeptical prospect. Ask open questions and listen more than you talk.",
      aggressive: "Discovery with aggressive personality. Ask direct questions about business impact.",
      analytical: "Thorough discovery needed. Ask detailed questions about processes and metrics.",
      professional: "Professional discovery. Ask strategic questions about goals and challenges.",
      enthusiastic: "Discovery with enthusiastic prospect. Let them talk while you uncover needs."
    },
    presentation: {
      skeptical: "Presenting to skeptical audience. Use case studies and third-party validation.",
      aggressive: "Present to aggressive prospect. Lead with bottom-line impact and business value.",
      analytical: "Analytical presentation needed. Include detailed features, specs, and comparisons.",
      professional: "Professional presentation. Balance features with business outcomes.",
      enthusiastic: "Present to enthusiastic prospect. Highlight exciting possibilities and benefits."
    }
  };

  return momentCoaching[momentType]?.[personality] || null;
}