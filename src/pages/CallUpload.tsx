import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileAudio, FileVideo, CreditCard, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

const CallUpload = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
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
          const { data, error } = await supabase.functions.invoke('upload-call-analysis', {
            body: {
              file: base64,
              originalFilename: file.name,
              fileType: fileType
            }
          });

          setProgress(90);

          if (error) {
            throw new Error(error.message);
          }

          setProgress(100);
          toast.success('Call analyzed successfully!');
          
          // Navigate to the review page
          navigate(`/call-review/${data.uploadId}`);
          
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
      
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
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

          {/* Upload Area */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your Call
              </CardTitle>
              <CardDescription>
                Upload audio or video files of your sales calls for detailed AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-4">
                      <FileAudio className="h-12 w-12 text-muted-foreground" />
                      <FileVideo className="h-12 w-12 text-muted-foreground" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Drag & drop your call file here
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Supported formats: MP3, WAV, M4A, MP4, MOV (max 100MB)
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button asChild>
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
                      
                      <Button variant="outline" onClick={() => navigate('/buy-credits')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy More Credits
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What You'll Get */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Get in Your AI Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">✅ What You Did Well</h4>
                    <p className="text-sm text-muted-foreground">
                      Specific strengths and effective techniques you used
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-destructive mb-2">❌ Areas for Improvement</h4>
                    <p className="text-sm text-muted-foreground">
                      Clear feedback on what could be done better
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-accent mb-2">📊 Objection Handling Scores</h4>
                    <p className="text-sm text-muted-foreground">
                      Grades for Price, Timing, Trust, and Competitor objections
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-info mb-2">🧠 Psychological Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Why certain responses were weak and how to improve
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CallUpload;