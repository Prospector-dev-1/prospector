import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Target, TrendingUp, MessageSquare, Star, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScriptAnalysis {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  clarity_score: number;
  persuasiveness_score: number;
  structure_score: number;
  tone_score: number;
  call_to_action_score: number;
  detailed_feedback: string;
  suggested_improvements: string[];
  best_practices: string[];
}

const ScriptAnalysis = () => {
  const [script, setScript] = useState('');
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!script.trim()) {
      toast({
        title: "Script Required",
        description: "Please enter your script or pitch to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to analyze your script.",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.credits < 0.5) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 0.5 credits to analyze a script.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-script', {
        body: { script }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      setCreditsRemaining(data.credits_remaining);
      await refreshProfile();
      
      toast({
        title: "Analysis Complete",
        description: "Your script has been analyzed successfully!",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Script Analysis</h1>
              <p className="text-muted-foreground">Get professional AI feedback on your sales script</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available Credits</p>
            <p className="text-lg font-semibold text-foreground">
              {profile?.credits?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* Script Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Script or Pitch
            </CardTitle>
            <CardDescription>
              Paste your sales script, pitch, or talking points below. Analysis costs 0.5 credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your sales script or pitch here..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {script.length} characters
              </p>
              <Button 
                onClick={handleAnalyze}
                disabled={loading || !script.trim() || (profile && profile.credits < 0.5)}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Analyze Script (0.5 credits)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-foreground">
                    {analysis.overall_score}/10
                  </div>
                  <Badge variant={getScoreBadgeVariant(analysis.overall_score)}>
                    {analysis.overall_score >= 8 ? 'Excellent' : 
                     analysis.overall_score >= 6 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Clarity</span>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.clarity_score)}`}>
                        {analysis.clarity_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Persuasiveness</span>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.persuasiveness_score)}`}>
                        {analysis.persuasiveness_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Structure</span>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.structure_score)}`}>
                        {analysis.structure_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tone</span>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.tone_score)}`}>
                        {analysis.tone_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Call to Action</span>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.call_to_action_score)}`}>
                        {analysis.call_to_action_score}/10
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Detailed Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{analysis.detailed_feedback}</p>
              </CardContent>
            </Card>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Suggestions and Best Practices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Suggested Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.suggested_improvements.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.best_practices.map((practice, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{practice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Credits Info */}
            {creditsRemaining !== null && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Analysis complete! You have {creditsRemaining.toFixed(1)} credits remaining.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptAnalysis;