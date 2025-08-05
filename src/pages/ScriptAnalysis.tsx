import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Target, TrendingUp, MessageSquare, Star, CheckCircle, AlertCircle, ArrowLeft, Clipboard, Maximize2, Minimize2 } from 'lucide-react';
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
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewrittenScript, setRewrittenScript] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setScript(text);
      toast({
        title: "Pasted",
        description: "Content pasted from clipboard!",
      });
    } catch (error) {
      toast({
        title: "Paste Failed",
        description: "Unable to paste from clipboard. Please paste manually.",
        variant: "destructive",
      });
    }
  };

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

  const handleRewrite = async () => {
    if (!analysis || !script.trim()) {
      toast({
        title: "Cannot Rewrite",
        description: "Please analyze a script first before rewriting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to rewrite your script.",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.credits < 0.5) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 0.5 credits to rewrite a script.",
        variant: "destructive",
      });
      return;
    }

    setRewriteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rewrite-script', {
        body: { 
          originalScript: script,
          analysis: analysis
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRewrittenScript(data.rewritten_script);
      setCreditsRemaining(data.credits_remaining);
      await refreshProfile();
      
      toast({
        title: "Script Rewritten",
        description: "Your script has been rewritten successfully!",
      });
    } catch (error: any) {
      console.error('Rewrite error:', error);
      toast({
        title: "Rewrite Failed",
        description: error.message || "Failed to rewrite script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRewriteLoading(false);
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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Script Analysis</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Get professional AI feedback on your sales script</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-muted-foreground">Available Credits</p>
            <p className="text-base sm:text-lg font-semibold text-foreground">
              {profile?.credits?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* Script Input */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Your Script or Pitch
            </CardTitle>
            <CardDescription className="text-sm">
              Paste your sales script, pitch, or talking points below. Analysis costs 0.5 credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaste}
                  className="flex items-center gap-2"
                >
                  <Clipboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Paste from Clipboard</span>
                  <span className="sm:hidden">Paste</span>
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  placeholder="Enter your sales script or pitch here..."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className={`resize-none text-sm sm:text-base transition-all duration-300 ${
                    isExpanded 
                      ? "min-h-[400px] sm:min-h-[500px]" 
                      : "min-h-[150px] sm:min-h-[200px]"
                  }`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="absolute bottom-2 right-2 h-6 w-6 p-0 hover:bg-muted/80"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {script.length} characters
              </p>
              <Button 
                onClick={handleAnalyze}
                disabled={loading || !script.trim() || (profile && profile.credits < 0.5)}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm sm:text-base">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <span className="text-sm sm:text-base">Analyze Script (0.5 credits)</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4 sm:space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                    {analysis.overall_score}/10
                  </div>
                  <Badge variant={getScoreBadgeVariant(analysis.overall_score)} className="text-xs sm:text-sm">
                    {analysis.overall_score >= 8 ? 'Excellent' : 
                     analysis.overall_score >= 6 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Scores */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm font-medium">Clarity</span>
                      <span className={`text-xs sm:text-sm font-semibold ${getScoreColor(analysis.clarity_score)}`}>
                        {analysis.clarity_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm font-medium">Persuasiveness</span>
                      <span className={`text-xs sm:text-sm font-semibold ${getScoreColor(analysis.persuasiveness_score)}`}>
                        {analysis.persuasiveness_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm font-medium">Structure</span>
                      <span className={`text-xs sm:text-sm font-semibold ${getScoreColor(analysis.structure_score)}`}>
                        {analysis.structure_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm font-medium">Tone</span>
                      <span className={`text-xs sm:text-sm font-semibold ${getScoreColor(analysis.tone_score)}`}>
                        {analysis.tone_score}/10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm font-medium">Call to Action</span>
                      <span className={`text-xs sm:text-sm font-semibold ${getScoreColor(analysis.call_to_action_score)}`}>
                        {analysis.call_to_action_score}/10
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Feedback */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  Detailed Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-foreground leading-relaxed">{analysis.detailed_feedback}</p>
              </CardContent>
            </Card>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-green-600 text-base sm:text-lg">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-red-600 text-base sm:text-lg">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Suggestions and Best Practices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    Suggested Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.suggested_improvements.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                    Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.best_practices.map((practice, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground">{practice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Rewrite Script Section */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  AI Script Rewrite
                </CardTitle>
                <CardDescription className="text-sm">
                  Get an improved version of your script based on the analysis feedback. Costs 0.5 credits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleRewrite}
                  disabled={rewriteLoading || !analysis || (profile && profile.credits < 0.5)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                  size="lg"
                  variant="secondary"
                >
                  {rewriteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm sm:text-base">Rewriting Script...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm sm:text-base">Rewrite Script (0.5 credits)</span>
                    </>
                  )}
                </Button>

                {rewrittenScript && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm sm:text-base font-semibold text-foreground">Improved Script:</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(rewrittenScript)}
                        className="flex items-center gap-2"
                      >
                        <Clipboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </Button>
                    </div>
                    <div className="p-3 sm:p-4 bg-muted rounded-lg border">
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {rewrittenScript}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credits Info */}
            {creditsRemaining !== null && (
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
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