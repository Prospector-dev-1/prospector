// Objection Detection and Coaching Utilities

export interface ObjectionType {
  type: 'price' | 'timing' | 'trust' | 'authority' | 'need' | 'competitor' | 'budget' | 'feature';
  confidence: number;
  keywords: string[];
  context?: string;
}

export interface CoachingResponse {
  immediate: string;
  followUp?: string;
  technique: string;
  example?: string;
}

export const OBJECTION_PATTERNS = {
  price: {
    keywords: ['expensive', 'costly', 'price', 'afford', 'budget', 'cheap', 'investment', 'roi', 'cost'],
    phrases: ['too expensive', 'out of budget', 'can\'t afford', 'too much money', 'cheaper alternative']
  },
  timing: {
    keywords: ['time', 'later', 'busy', 'now', 'rush', 'urgency', 'priority', 'schedule'],
    phrases: ['not the right time', 'too busy', 'maybe later', 'not a priority', 'bad timing']
  },
  trust: {
    keywords: ['trust', 'skeptical', 'doubt', 'unsure', 'risky', 'guarantee', 'proof', 'credible'],
    phrases: ['don\'t trust', 'seems risky', 'not convinced', 'need proof', 'sounds too good']
  },
  authority: {
    keywords: ['decision', 'boss', 'manager', 'team', 'committee', 'approval', 'consult'],
    phrases: ['need to ask', 'not my decision', 'talk to my boss', 'team decision', 'need approval']
  },
  need: {
    keywords: ['need', 'problem', 'issue', 'challenge', 'satisfied', 'current', 'working'],
    phrases: ['don\'t need', 'working fine', 'no problem', 'satisfied with current', 'not necessary']
  },
  competitor: {
    keywords: ['competitor', 'alternative', 'comparing', 'other', 'vendor', 'similar', 'options'],
    phrases: ['looking at others', 'comparing options', 'other vendors', 'similar products', 'alternatives']
  },
  budget: {
    keywords: ['budget', 'allocated', 'funds', 'financial', 'quarter', 'fiscal', 'spending'],
    phrases: ['no budget', 'budget constraints', 'already allocated', 'next quarter', 'financial approval']
  },
  feature: {
    keywords: ['feature', 'functionality', 'capability', 'missing', 'lacks', 'doesn\'t do'],
    phrases: ['missing feature', 'doesn\'t have', 'can\'t do', 'lacks functionality', 'need more']
  }
};

export const PERSONALITY_COACHING = {
  skeptical: {
    approach: 'Provide concrete evidence and social proof',
    tone: 'Patient and fact-based',
    avoid: 'Pressure tactics or over-enthusiasm'
  },
  aggressive: {
    approach: 'Stay calm, acknowledge their directness, focus on business value',
    tone: 'Professional and confident',
    avoid: 'Getting defensive or matching their aggression'
  },
  analytical: {
    approach: 'Present detailed data, ROI calculations, and logical arguments',
    tone: 'Methodical and thorough',
    avoid: 'Emotional appeals or rushing the process'
  },
  enthusiastic: {
    approach: 'Match their energy, focus on exciting benefits and possibilities',
    tone: 'Energetic and optimistic',
    avoid: 'Being too conservative or dampening their enthusiasm'
  },
  professional: {
    approach: 'Maintain professional standards, focus on business outcomes',
    tone: 'Balanced and respectful',
    avoid: 'Being too casual or overly aggressive'
  }
};

export const OBJECTION_COACHING_RESPONSES: Record<string, Record<string, CoachingResponse>> = {
  price: {
    skeptical: {
      immediate: "Acknowledge the price concern and ask about their decision criteria beyond cost.",
      followUp: "Share ROI data and case studies showing value delivered to similar companies.",
      technique: "Value-based selling",
      example: "I understand price is important. What other factors will influence your decision?"
    },
    aggressive: {
      immediate: "Don't defend the price. Instead, focus on the business impact and urgency.",
      followUp: "Quantify the cost of not solving their problem now.",
      technique: "Cost of inaction",
      example: "What's the cost to your business of waiting another quarter to solve this?"
    },
    analytical: {
      immediate: "Break down the ROI with specific numbers and compare to their current costs.",
      followUp: "Offer to create a detailed cost-benefit analysis for their review.",
      technique: "ROI analysis",
      example: "Let me show you exactly how this pays for itself in the first 6 months..."
    }
  },
  timing: {
    skeptical: {
      immediate: "Ask about what would need to change for timing to be right.",
      followUp: "Explore the consequences of delaying and create urgency around their pain points.",
      technique: "Implication questions",
      example: "What would need to happen for this to become a priority?"
    },
    aggressive: {
      immediate: "Acknowledge their schedule but redirect to the cost of waiting.",
      followUp: "Create a timeline that shows gradual implementation to reduce disruption.",
      technique: "Phased implementation",
      example: "I respect your timeline. What if we could phase this in to minimize disruption?"
    }
  },
  trust: {
    skeptical: {
      immediate: "Acknowledge their caution and offer references from similar companies.",
      followUp: "Provide case studies and offer to connect them with existing customers.",
      technique: "Social proof",
      example: "I understand your caution. Would you like to speak with a customer in your industry?"
    },
    analytical: {
      immediate: "Offer detailed documentation, security certifications, and compliance information.",
      followUp: "Provide technical specifications and invite them to conduct due diligence.",
      technique: "Evidence-based trust building",
      example: "I'll send you our security certifications and compliance documentation."
    }
  },
  authority: {
    professional: {
      immediate: "Respect their process and ask about decision-making criteria and timeline.",
      followUp: "Offer to present to the decision-makers or provide materials for them to share.",
      technique: "Stakeholder mapping",
      example: "Who else would be involved in this decision, and what's important to them?"
    }
  }
};

export function detectObjections(message: string): ObjectionType[] {
  const normalizedMessage = message.toLowerCase();
  const detectedObjections: ObjectionType[] = [];

  Object.entries(OBJECTION_PATTERNS).forEach(([type, patterns]) => {
    let confidence = 0;
    const matchedKeywords: string[] = [];

    // Check for phrase matches (higher weight)
    patterns.phrases.forEach(phrase => {
      if (normalizedMessage.includes(phrase)) {
        confidence += 0.8;
        matchedKeywords.push(phrase);
      }
    });

    // Check for keyword matches
    patterns.keywords.forEach(keyword => {
      if (normalizedMessage.includes(keyword)) {
        confidence += 0.3;
        matchedKeywords.push(keyword);
      }
    });

    // Normalize confidence (max 1.0)
    confidence = Math.min(confidence, 1.0);

    if (confidence > 0.3 && matchedKeywords.length > 0) {
      detectedObjections.push({
        type: type as ObjectionType['type'],
        confidence,
        keywords: matchedKeywords,
        context: normalizedMessage.substring(
          Math.max(0, normalizedMessage.indexOf(matchedKeywords[0]) - 20),
          Math.min(normalizedMessage.length, normalizedMessage.indexOf(matchedKeywords[0]) + 50)
        )
      });
    }
  });

  // Sort by confidence
  return detectedObjections.sort((a, b) => b.confidence - a.confidence);
}

export function getObjectionCoaching(
  objectionType: ObjectionType['type'], 
  personality: string
): CoachingResponse | null {
  const personalityResponses = OBJECTION_COACHING_RESPONSES[objectionType];
  if (!personalityResponses) return null;

  // Try to find personality-specific response
  let response = personalityResponses[personality];
  
  // Fallback to professional if personality not found
  if (!response && personalityResponses.professional) {
    response = personalityResponses.professional;
  }
  
  // Fallback to first available response
  if (!response) {
    const firstKey = Object.keys(personalityResponses)[0];
    response = personalityResponses[firstKey];
  }

  return response || null;
}

export function getPersonalityGuidance(personality: string) {
  return PERSONALITY_COACHING[personality as keyof typeof PERSONALITY_COACHING] || PERSONALITY_COACHING.professional;
}