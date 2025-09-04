-- Seed AI prospect profiles for testing
INSERT INTO public.ai_prospect_profiles (
  name, 
  base_personality, 
  difficulty_level, 
  is_public, 
  personality_traits, 
  objection_patterns, 
  buying_signals, 
  conversation_style,
  industry_context
) VALUES 
(
  'Sarah Chen - Professional Decision Maker',
  'professional',
  2,
  true,
  '{"formality": "high", "directness": "medium", "technical_depth": "medium", "decision_speed": "slow", "risk_tolerance": "low"}',
  '[
    {"type": "budget", "intensity": "medium", "triggers": ["price", "cost", "expensive"], "frequency": 0.7},
    {"type": "timing", "intensity": "low", "triggers": ["urgent", "deadline", "quick"], "frequency": 0.4},
    {"type": "authority", "intensity": "high", "triggers": ["decision", "approve", "budget"], "frequency": 0.8}
  ]',
  '[
    {"signal": "asking_for_references", "probability": 0.8, "triggers": ["similar", "case_study", "example"]},
    {"signal": "discussing_implementation", "probability": 0.6, "triggers": ["how", "when", "process"]},
    {"signal": "mentioning_budget_availability", "probability": 0.7, "triggers": ["budget", "approved", "funds"]}
  ]',
  '{"pace": "measured", "interruption_tolerance": "low", "detail_preference": "high"}',
  'Technology'
),
(
  'Mike Rodriguez - Skeptical Analyst',
  'skeptical',
  3,
  true,
  '{"formality": "medium", "directness": "high", "technical_depth": "high", "decision_speed": "very_slow", "risk_tolerance": "very_low"}',
  '[
    {"type": "proof", "intensity": "high", "triggers": ["claim", "guarantee", "promise"], "frequency": 0.9},
    {"type": "competitor", "intensity": "medium", "triggers": ["better", "different", "unique"], "frequency": 0.6},
    {"type": "risk", "intensity": "high", "triggers": ["change", "new", "implementation"], "frequency": 0.8}
  ]',
  '[
    {"signal": "requesting_detailed_data", "probability": 0.9, "triggers": ["numbers", "metrics", "proof"]},
    {"signal": "asking_technical_questions", "probability": 0.8, "triggers": ["how", "technical", "architecture"]},
    {"signal": "wanting_trial_period", "probability": 0.7, "triggers": ["test", "trial", "pilot"]}
  ]',
  '{"pace": "slow", "interruption_tolerance": "very_low", "detail_preference": "very_high"}',
  'Finance'
),
(
  'Jessica Park - Enthusiastic Innovator',
  'enthusiastic',
  1,
  true,
  '{"formality": "low", "directness": "medium", "technical_depth": "low", "decision_speed": "fast", "risk_tolerance": "high"}',
  '[
    {"type": "feature", "intensity": "low", "triggers": ["limitation", "cannot", "missing"], "frequency": 0.3},
    {"type": "integration", "intensity": "medium", "triggers": ["current", "existing", "system"], "frequency": 0.5}
  ]',
  '[
    {"signal": "expressing_excitement", "probability": 0.8, "triggers": ["great", "love", "perfect"]},
    {"signal": "asking_about_latest_features", "probability": 0.9, "triggers": ["new", "latest", "innovation"]},
    {"signal": "discussing_quick_implementation", "probability": 0.7, "triggers": ["fast", "quick", "soon"]}
  ]',
  '{"pace": "fast", "interruption_tolerance": "high", "detail_preference": "low"}',
  'Marketing'
),
(
  'Robert Thompson - Aggressive Negotiator',
  'aggressive',
  4,
  true,
  '{"formality": "low", "directness": "very_high", "technical_depth": "medium", "decision_speed": "fast", "risk_tolerance": "medium"}',
  '[
    {"type": "price", "intensity": "very_high", "triggers": ["cost", "price", "expensive"], "frequency": 0.9},
    {"type": "value", "intensity": "high", "triggers": ["worth", "benefit", "roi"], "frequency": 0.8},
    {"type": "competition", "intensity": "high", "triggers": ["competitor", "alternative", "option"], "frequency": 0.7}
  ]',
  '[
    {"signal": "challenging_on_price", "probability": 0.9, "triggers": ["negotiate", "discount", "better"]},
    {"signal": "demanding_immediate_value", "probability": 0.8, "triggers": ["now", "immediately", "today"]},
    {"signal": "testing_salesperson_knowledge", "probability": 0.9, "triggers": ["really", "prove", "show"]}
  ]',
  '{"pace": "very_fast", "interruption_tolerance": "high", "detail_preference": "medium"}',
  'Sales'
),
(
  'Dr. Emily Watson - Analytical Researcher',
  'analytical',
  3,
  true,
  '{"formality": "high", "directness": "low", "technical_depth": "very_high", "decision_speed": "very_slow", "risk_tolerance": "low"}',
  '[
    {"type": "data", "intensity": "high", "triggers": ["assumption", "claim", "statement"], "frequency": 0.8},
    {"type": "methodology", "intensity": "medium", "triggers": ["approach", "method", "process"], "frequency": 0.6},
    {"type": "research", "intensity": "high", "triggers": ["study", "research", "evidence"], "frequency": 0.9}
  ]',
  '[
    {"signal": "requesting_research_data", "probability": 0.9, "triggers": ["research", "study", "data"]},
    {"signal": "asking_methodological_questions", "probability": 0.8, "triggers": ["methodology", "approach", "framework"]},
    {"signal": "wanting_peer_review", "probability": 0.7, "triggers": ["peers", "colleagues", "review"]}
  ]',
  '{"pace": "very_slow", "interruption_tolerance": "very_low", "detail_preference": "very_high"}',
  'Healthcare'
);

-- Create some sample call moments for testing
DO $$
DECLARE
    sample_user_id uuid := '6b5388f7-bd0a-483a-8d73-48d8cd07da0c'; -- Replace with actual user ID from auth
    sample_call_id uuid;
BEGIN
    -- Insert a sample call upload first
    INSERT INTO public.call_uploads (
        id,
        user_id,
        original_filename,
        file_type,
        file_size,
        status,
        confidence_score,
        transcript,
        ai_analysis,
        call_moments
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'sample_sales_call.mp3',
        'audio/mpeg',
        1024000,
        'completed',
        85,
        'Salesperson: Hi there, thanks for taking the time to speak with me today. I understand you''re looking into solutions for your team''s productivity challenges.

Prospect: Yes, that''s right. We''ve been struggling with our current process and are exploring options.

Salesperson: I''d love to learn more about your specific challenges. What''s the biggest pain point you''re facing right now?

Prospect: Well, our team spends way too much time on manual data entry, and we''re making errors that are costing us customers.

Salesperson: That sounds frustrating. How much time would you estimate your team is spending on this manual work each week?

Prospect: Probably about 15-20 hours across the whole team. It''s really eating into our productive time.

Salesperson: I can definitely understand how that would impact your bottom line. Have you looked into automation solutions before?

Prospect: We''ve explored a few options, but they all seem either too expensive or too complicated for our team to adopt.

Salesperson: That''s a common concern I hear. What would an ideal solution look like for you?

Prospect: Something that''s easy to implement, doesn''t require a lot of training, and shows ROI quickly.

Salesperson: Those are all very reasonable requirements. Let me show you how our solution addresses each of those points...',
        '{"overall_score": 85, "strengths": ["Good discovery questions", "Active listening", "Empathy"], "improvements": ["More specific ROI discussion", "Handle price objection better"], "key_moments": ["Discovery phase", "Pain point identification", "Solution positioning"]}',
        '[
            {
                "id": "moment_1",
                "type": "discovery",
                "timestamp": 45,
                "moment_label": "Initial Discovery Questions",
                "context": "Salesperson asking about specific challenges and pain points",
                "scenario": "The prospect has mentioned productivity challenges and the salesperson is digging deeper to understand the root cause.",
                "coaching_tip": "Great discovery questioning technique. Continue to ask open-ended questions to fully understand their situation before presenting solutions.",
                "difficulty_level": 2,
                "prospect_response": "Well, our team spends way too much time on manual data entry, and we are making errors that are costing us customers."
            },
            {
                "id": "moment_2", 
                "type": "objection",
                "timestamp": 180,
                "moment_label": "Price and Complexity Objection",
                "context": "Prospect expressing concerns about cost and implementation complexity",
                "scenario": "The prospect has indicated they have looked at solutions before but found them too expensive or complicated.",
                "coaching_tip": "This is a perfect opportunity to position your solution as different. Focus on ease of implementation and quick ROI rather than just features.",
                "difficulty_level": 3,
                "prospect_response": "We have explored a few options, but they all seem either too expensive or too complicated for our team to adopt."
            },
            {
                "id": "moment_3",
                "type": "closing",
                "timestamp": 240,
                "moment_label": "Solution Positioning Opportunity", 
                "context": "Prospect has outlined their ideal solution requirements",
                "scenario": "The prospect has clearly stated what they are looking for: easy implementation, minimal training, quick ROI.",
                "coaching_tip": "Perfect setup for solution positioning. Address each requirement they mentioned specifically and provide concrete examples or proof points.",
                "difficulty_level": 2,
                "prospect_response": "Something that is easy to implement, does not require a lot of training, and shows ROI quickly."
            }
        ]'
    ) RETURNING id INTO sample_call_id;
    
    RAISE NOTICE 'Created sample call upload with ID: %', sample_call_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Sample data creation failed (user may not exist): %', SQLERRM;
END $$;