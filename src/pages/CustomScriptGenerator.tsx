import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, ArrowLeft, Clipboard, Sparkles, Building, Target, Users, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import SmartBackButton from '@/components/SmartBackButton';

interface ScriptFormData {
  businessType: string;
  productService: string;
  targetAudience: string;
  callObjective: string;
  keyBenefits: string;
  tonePreference: string;
  commonObjections: string;
  companyName: string;
}

const CustomScriptGenerator = () => {
  const [formData, setFormData] = useState<ScriptFormData>({
    businessType: '',
    productService: '',
    targetAudience: '',
    callObjective: '',
    keyBenefits: '',
    tonePreference: 'professional',
    commonObjections: '',
    companyName: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: keyof ScriptFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = () => {
    return formData.businessType.trim() && 
           formData.productService.trim() && 
           formData.targetAudience.trim() && 
           formData.callObjective.trim();
  };

  const handleGenerate = async () => {
    if (!isFormValid()) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate a custom script.",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.credits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to generate a custom script.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-custom-script', {
        body: formData
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedScript(data.custom_script);
      setCreditsRemaining(data.credits_remaining);
      await refreshProfile();
      
      toast({
        title: "Script Generated",
        description: "Your custom script has been generated successfully!",
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Script copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      businessType: '',
      productService: '',
      targetAudience: '',
      callObjective: '',
      keyBenefits: '',
      tonePreference: 'professional',
      commonObjections: '',
      companyName: '',
    });
    setGeneratedScript(null);
    setCreditsRemaining(null);
  };

  return (<>
    <SEO title="Custom Script Generator | Prospector" description="Generate personalized cold call scripts tailored to your business." canonicalPath="/custom-script" />
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <SmartBackButton
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 self-start"
            />
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Custom Script Generator
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Get a personalized sales script tailored to your business
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-muted-foreground">Available Credits</p>
            <p className="text-base sm:text-lg font-semibold text-foreground">
              {profile?.credits?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {!generatedScript ? (
          /* Form */
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Business Information
              </CardTitle>
              <CardDescription className="text-sm">
                Fill out this form to generate a custom script for your business. Costs 1 credit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Business Type */}
                <div className="space-y-2">
                  <Label htmlFor="businessType" className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Business Type / Industry *
                  </Label>
                  <Input
                    id="businessType"
                    placeholder="e.g., Web Development, Real Estate, Insurance"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Your company name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="targetAudience" className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Target Audience *
                  </Label>
                  <Input
                    id="targetAudience"
                    placeholder="e.g., Small business owners, Homeowners, CEOs"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Call Objective */}
                <div className="space-y-2">
                  <Label htmlFor="callObjective" className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4" />
                    Call Objective *
                  </Label>
                  <Select 
                    value={formData.callObjective} 
                    onValueChange={(value) => handleInputChange('callObjective', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select your call objective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appointment">Schedule Appointment/Meeting</SelectItem>
                      <SelectItem value="demo">Book Product Demo</SelectItem>
                      <SelectItem value="consultation">Free Consultation</SelectItem>
                      <SelectItem value="direct_sale">Direct Sale</SelectItem>
                      <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
                      <SelectItem value="follow_up">Follow-up Call</SelectItem>
                      <SelectItem value="referral">Get Referrals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone Preference */}
                <div className="space-y-2">
                  <Label htmlFor="tonePreference" className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Tone Preference
                  </Label>
                  <Select 
                    value={formData.tonePreference} 
                    onValueChange={(value) => handleInputChange('tonePreference', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product/Service Description */}
              <div className="space-y-2">
                <Label htmlFor="productService" className="text-sm font-medium">
                  Product/Service Description *
                </Label>
                <Textarea
                  id="productService"
                  placeholder="Describe what you're selling and its main features..."
                  value={formData.productService}
                  onChange={(e) => handleInputChange('productService', e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>

              {/* Key Benefits */}
              <div className="space-y-2">
                <Label htmlFor="keyBenefits" className="text-sm font-medium">
                  Key Benefits / Value Proposition
                </Label>
                <Textarea
                  id="keyBenefits"
                  placeholder="What are the main benefits customers get? How do you solve their problems?"
                  value={formData.keyBenefits}
                  onChange={(e) => handleInputChange('keyBenefits', e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>

              {/* Common Objections */}
              <div className="space-y-2">
                <Label htmlFor="commonObjections" className="text-sm font-medium">
                  Common Objections (Optional)
                </Label>
                <Textarea
                  id="commonObjections"
                  placeholder="What objections do you usually hear? e.g., 'Too expensive', 'Not interested', 'Call me later'"
                  value={formData.commonObjections}
                  onChange={(e) => handleInputChange('commonObjections', e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>

              {/* Generate Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={handleGenerate}
                  disabled={loading || !isFormValid() || (profile && profile.credits < 1)}
                  className="flex items-center gap-2 flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm sm:text-base">Generating Script...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm sm:text-base">Generate Custom Script (1 credit)</span>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                * Required fields. The more information you provide, the better your custom script will be.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Generated Script Display */
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Your Custom Script
                </CardTitle>
                <CardDescription className="text-sm">
                  Generated specifically for your {formData.businessType} business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h4 className="text-sm sm:text-base font-semibold text-foreground">
                    Custom Sales Script
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedScript)}
                      className="flex items-center gap-2"
                    >
                      <Clipboard className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy Script</span>
                      <span className="sm:hidden">Copy</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetForm}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Generate New</span>
                      <span className="sm:hidden">New</span>
                    </Button>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-muted rounded-lg border">
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {generatedScript}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Credits Info */}
            {creditsRemaining !== null && (
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Script generated successfully! You have {creditsRemaining.toFixed(1)} credits remaining.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  </>);
};

export default CustomScriptGenerator;