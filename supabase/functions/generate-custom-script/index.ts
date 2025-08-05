import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== CUSTOM SCRIPT GENERATION REQUEST STARTED ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== CORS OPTIONS REQUEST ===');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('=== ERROR: Missing required environment variables ===');
      return new Response(JSON.stringify({ error: 'Required environment variables not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 1: Parsing request body ===');
    const formData = await req.json();
    console.log('Form data received:', Object.keys(formData));

    // Validate required fields
    const requiredFields = ['businessType', 'productService', 'targetAudience', 'callObjective'];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim().length === 0) {
        return new Response(JSON.stringify({ error: `${field} is required` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('=== STEP 2: Checking auth header ===');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 3: Creating Supabase client ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== STEP 4: Verifying user token ===');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('=== ERROR: Auth error ===', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 5: Fetching user profile ===');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('=== ERROR: Profile error ===', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 6: Checking credits ===');
    if (Number(profile.credits) < 1) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 1 credit to generate a custom script.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 7: Deducting credits ===');
    const currentCredits = Number(profile.credits);
    const newCreditAmount = Number((currentCredits - 1).toFixed(2));
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditAmount })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('=== ERROR: Failed to deduct credits ===', updateError);
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 8: Recording transaction ===');
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'custom_script_generation',
        amount: -1,
        description: 'Custom script generation based on business profile'
      });

    if (transactionError) {
      console.error('=== WARNING: Transaction recording failed ===', transactionError);
    }

    console.log('=== STEP 9: Generating custom script with OpenAI ===');
    
    // Create detailed prompt based on form data
    const prompt = `You are a professional sales script writer and cold calling expert. Create a personalized, high-converting cold calling script based on the following business information:

BUSINESS DETAILS:
- Business Type/Industry: ${formData.businessType}
- Product/Service: ${formData.productService}
- Target Audience: ${formData.targetAudience}
- Call Objective: ${formData.callObjective}
- Key Benefits/Value Proposition: ${formData.keyBenefits || 'Not specified'}
- Tone Preference: ${formData.tonePreference || 'Professional and friendly'}
- Common Objections: ${formData.commonObjections || 'Not specified'}
- Company Name: ${formData.companyName || '[Company Name]'}

SCRIPT REQUIREMENTS:
1. Create a complete cold calling script that is 60-90 seconds long when spoken
2. Include a strong opening that grabs attention within the first 10 seconds
3. Clearly communicate the value proposition early
4. Address potential objections proactively
5. Include 2-3 discovery questions to engage the prospect
6. Have a clear, compelling call to action that aligns with the specified objective
7. Use the preferred tone throughout
8. Make it conversational and natural, not robotic
9. Include transition phrases and handling for common responses
10. Structure it with clear sections: Opening, Value Prop, Discovery, Handling Objections, Close

SCRIPT STRUCTURE:
- Opening Hook (10-15 seconds)
- Introduction & Purpose (15-20 seconds)
- Value Proposition (20-25 seconds)
- Discovery Questions (15-20 seconds)
- Objection Handling (if needed)
- Call to Action/Close (10-15 seconds)

Please provide ONLY the script text, formatted clearly with sections labeled. Make it sound natural and conversational, as if a real person would speak it. Ensure it flows smoothly and addresses the specific business needs provided.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional sales script writer and cold calling expert. Create personalized, high-converting sales scripts that sound natural and conversational. Focus on results and practical application.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('=== STEP 10: Processing OpenAI response ===');
    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('=== ERROR: OpenAI API error ===', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate custom script with AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const customScript = openAIData.choices[0].message.content.trim();

    console.log('=== STEP 11: Returning custom script ===');
    console.log('Custom script length:', customScript.length);

    return new Response(JSON.stringify({
      success: true,
      custom_script: customScript,
      credits_remaining: newCreditAmount,
      business_profile: {
        businessType: formData.businessType,
        productService: formData.productService,
        targetAudience: formData.targetAudience,
        callObjective: formData.callObjective
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== FATAL ERROR in generate-custom-script function ===', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});