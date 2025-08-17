-- Add custom scenario fields to calls table
ALTER TABLE calls ADD COLUMN business_type TEXT;
ALTER TABLE calls ADD COLUMN prospect_role TEXT;
ALTER TABLE calls ADD COLUMN call_objective TEXT;
ALTER TABLE calls ADD COLUMN custom_instructions TEXT;
ALTER TABLE calls ADD COLUMN scenario_data JSONB;

-- Create call objectives table for predefined options
CREATE TABLE public.call_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  scoring_categories JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_objectives ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing objectives
CREATE POLICY "Call objectives are viewable by everyone" 
ON public.call_objectives 
FOR SELECT 
USING (true);

-- Insert predefined call objectives with scoring categories
INSERT INTO public.call_objectives (name, description, scoring_categories) VALUES 
(
  'Book Appointment',
  'Schedule a follow-up meeting or demo',
  '{
    "rapport_building": {"weight": 20, "description": "Building trust and connection"},
    "needs_discovery": {"weight": 25, "description": "Understanding their pain points"},
    "scheduling_efficiency": {"weight": 25, "description": "Moving toward calendar booking"},
    "objection_handling": {"weight": 15, "description": "Addressing concerns about meeting"},
    "closing_effectiveness": {"weight": 15, "description": "Securing the appointment"}
  }'
),
(
  'Close Sale',
  'Complete a sale during the call',
  '{
    "product_presentation": {"weight": 25, "description": "Explaining value proposition clearly"},
    "objection_handling": {"weight": 25, "description": "Overcoming purchase resistance"},
    "closing_techniques": {"weight": 25, "description": "Using effective closing methods"},
    "urgency_creation": {"weight": 15, "description": "Creating reason to buy now"},
    "price_negotiation": {"weight": 10, "description": "Handling pricing discussions"}
  }'
),
(
  'Generate Lead',
  'Qualify and capture lead information',
  '{
    "lead_qualification": {"weight": 30, "description": "Determining if they are a good fit"},
    "interest_generation": {"weight": 25, "description": "Creating curiosity about your solution"},
    "contact_collection": {"weight": 20, "description": "Getting their contact information"},
    "pain_identification": {"weight": 15, "description": "Uncovering their challenges"},
    "next_step_agreement": {"weight": 10, "description": "Getting commitment for follow-up"}
  }'
),
(
  'Product Demo',
  'Showcase product features and benefits',
  '{
    "demo_preparation": {"weight": 20, "description": "Setting up the demonstration properly"},
    "feature_explanation": {"weight": 25, "description": "Clearly explaining key features"},
    "benefit_connection": {"weight": 25, "description": "Connecting features to their needs"},
    "engagement_maintenance": {"weight": 15, "description": "Keeping them engaged throughout"},
    "next_step_progression": {"weight": 15, "description": "Moving toward next steps"}
  }'
);

-- Create business types table for predefined options
CREATE TABLE public.business_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  typical_roles TEXT[] NOT NULL,
  common_pain_points TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing business types
CREATE POLICY "Business types are viewable by everyone" 
ON public.business_types 
FOR SELECT 
USING (true);

-- Insert predefined business types
INSERT INTO public.business_types (name, category, typical_roles, common_pain_points) VALUES 
('Local Plumber', 'Service', ARRAY['Owner', 'Operations Manager', 'Office Manager'], ARRAY['Scheduling efficiency', 'Payment collection', 'Customer communication', 'Emergency response time']),
('Electrician', 'Service', ARRAY['Owner', 'Foreman', 'Office Manager'], ARRAY['Job estimation accuracy', 'Safety compliance', 'Material costs', 'Skilled labor shortage']),
('Restaurant Owner', 'Hospitality', ARRAY['Owner', 'General Manager', 'Operations Manager'], ARRAY['Food costs', 'Staff turnover', 'Customer retention', 'Delivery coordination']),
('Dental Practice', 'Healthcare', ARRAY['Practice Owner', 'Office Manager', 'Practice Administrator'], ARRAY['Patient scheduling', 'Insurance claims', 'Patient retention', 'Equipment costs']),
('Real Estate Agent', 'Real Estate', ARRAY['Agent', 'Broker', 'Team Lead'], ARRAY['Lead generation', 'Market competition', 'Transaction management', 'Client communication']),
('Auto Repair Shop', 'Service', ARRAY['Owner', 'Service Manager', 'Shop Foreman'], ARRAY['Parts sourcing', 'Diagnostic efficiency', 'Customer trust', 'Equipment maintenance']),
('Law Firm', 'Professional Services', ARRAY['Partner', 'Office Manager', 'Practice Administrator'], ARRAY['Case management', 'Client communication', 'Billing efficiency', 'Document organization']),
('Accounting Firm', 'Professional Services', ARRAY['Partner', 'Managing Partner', 'Office Manager'], ARRAY['Tax deadline pressure', 'Client onboarding', 'Document collection', 'Compliance tracking']),
('Marketing Agency', 'Professional Services', ARRAY['Owner', 'Account Manager', 'Creative Director'], ARRAY['Client retention', 'Project management', 'Creative workflow', 'Results measurement']),
('Fitness Gym', 'Fitness', ARRAY['Owner', 'General Manager', 'Operations Manager'], ARRAY['Member retention', 'Equipment maintenance', 'Class scheduling', 'Staff management']),
('Retail Store', 'Retail', ARRAY['Owner', 'Store Manager', 'Operations Manager'], ARRAY['Inventory management', 'Customer experience', 'Staff scheduling', 'Sales tracking']),
('Manufacturing Plant', 'Manufacturing', ARRAY['Plant Manager', 'Operations Director', 'Production Manager'], ARRAY['Production efficiency', 'Quality control', 'Supply chain', 'Equipment downtime']);