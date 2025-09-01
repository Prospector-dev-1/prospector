import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileAudio, FileVideo, CreditCard, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import RecentCallUploads from '@/components/RecentCallUploads';
import VoiceMemoHelp from '@/components/VoiceMemoHelp';

const CallUpload = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { goBack } = useSmartNavigation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!user || !profile) {
      toast.error('Please log in to upload calls');
      return;
    }

    if (profile.credits < 1) {
      toast.error('You need 1 credit to analyze a call. Buy more credits to continue.');
      navigate('/buy-credits');
      return;
    }

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'video/mp4', 'video/mov'];
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      toast.error('Please upload an audio file (mp3, wav, m4a) or video file (mp4, mov)');
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          setProgress(30);

          const fileType = file.type.includes('video') ? 'video' : 'audio';
          
          // Call the upload analysis function
          const response = await supabase.functions.invoke('upload-call-analysis', {
            body: {
              file: base64,
              originalFilename: file.name,
              fileType: fileType
            }
          });

          setProgress(90);

          console.log('Full response:', response);

          if (response.error) {
            console.error('Edge function error details:', response.error);
            // For debugging - try to extract the actual error from fetch response
            try {
              const fetchResponse = await fetch(`https://akcxkwbqeehxvwhmrqbb.supabase.co/functions/v1/upload-call-analysis`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json',
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3hrd2JxZWVoeHZ3aG1ycWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNTgzMTMsImV4cCI6MjA2OTkzNDMxM30.ix6oVIa0vyWg1R_IoUZyEiadZTvCDa6GitEIqRLoIYk'
                },
                body: JSON.stringify({
                  file: base64,
                  originalFilename: file.name,
                  fileType: fileType
                })
              });
              
              const responseText = await fetchResponse.text();
              console.log('Raw fetch response:', responseText);
              
              if (!fetchResponse.ok) {
                try {
                  const errorData = JSON.parse(responseText);
                  throw new Error(errorData.error || `Server error (${fetchResponse.status})`);
                } catch {
                  throw new Error(`Server error (${fetchResponse.status}): ${responseText.slice(0, 200)}`);
                }
              }
            } catch (fetchError) {
              console.error('Fetch error:', fetchError);
              throw fetchError;
            }
            
            throw new Error('Upload failed - unknown error');
          }

          if (response.data?.error) {
            throw new Error(response.data.error);
          }

          if (!response.data?.success) {
            throw new Error('Upload failed - no success response');
          }

          setProgress(100);
          toast.success('Call analyzed successfully!');
          
          // Navigate to the review page
          navigate(`/call-review/${response.data.uploadId}`);
          
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to analyze call');
        } finally {
          setUploading(false);
          setProgress(0);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploading(false);
        setProgress(0);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <>
      <SEO 
        title="Upload Call for AI Review | Prospector"
        description="Upload your sales calls for AI-powered analysis and feedback. Get insights on objection handling, closing techniques, and more."
        canonicalPath="/call-upload"
      />
      <MobileLayout>
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => goBack()}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Upload Call for Review
                </h1>
                <p className="text-muted-foreground">
                  Get AI-powered analysis of your sales calls (1 credit per review)
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <Badge variant="secondary">
                  {profile?.credits || 0} credits
                </Badge>
              </div>
            </div>
          </div>

          {/* Recent Call Uploads */}
          <RecentCallUploads />

          {/* Voice Memo Help */}
          <VoiceMemoHelp />

          {/* Upload Area */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-4 w-4" />
                Upload Your Call
              </CardTitle>
              <CardDescription className="text-sm">
                Upload audio or video files for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {uploading ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">
                      Analyzing your call... This may take a few minutes.
                    </p>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-3">
                      <FileAudio className="h-8 w-8 text-muted-foreground" />
                      <FileVideo className="h-8 w-8 text-muted-foreground" />
                    </div>
                    
                    <div>
                      <h3 className="text-base font-semibold mb-1">
                        Drag & drop your call file here
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        MP3, WAV, M4A, MP4, MOV (max 100MB)
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild size="sm">
                        <label className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                          <input
                            type="file"
                            className="hidden"
                            accept="audio/*,video/*"
                            onChange={handleFileInput}
                          />
                        </label>
                      </Button>
                      
                      <Button variant="outline" size="sm" onClick={() => navigate('/buy-credits')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Credits
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What You'll Get */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">What You'll Get in Your AI Review</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <h4 className="font-semibold text-primary mb-1 md:mb-2">✅ What You Did Well</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Specific strengths and effective techniques you used
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-destructive mb-1 md:mb-2">❌ Areas for Improvement</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Clear feedback on what could be done better
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-primary mb-1 md:mb-2">🔄 AI-Powered Moment Replay</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Practice challenging moments from your call with AI. Replay specific objections or difficult parts to improve your responses through interactive coaching sessions.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <h4 className="font-semibold text-accent mb-1 md:mb-2">📊 Objection Handling Scores</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Grades for Price, Timing, Trust, and Competitor objections
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-info mb-1 md:mb-2">🧠 Psychological Insights</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Why certain responses were weak and how to improve
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </MobileLayout>
    </>
  );
};

export default CallUpload;