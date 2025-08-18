import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileAudio, FileVideo, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CallUploadRecord {
  id: string;
  original_filename: string;
  file_type: string;
  status: string;
  created_at: string;
}

const RecentCallUploads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentUploads, setRecentUploads] = useState<CallUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentUploads();
  }, [user]);

  const fetchRecentUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('call_uploads')
        .select('id, original_filename, file_type, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching call uploads:', error);
        return;
      }

      setRecentUploads(data || []);
    } catch (error) {
      console.error('Error fetching call uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (uploadId: string) => {
    navigate(`/call-review/${uploadId}`);
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-foreground mb-3">Recent Call Uploads</h3>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentUploads.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-foreground mb-3">Recent Call Uploads</h3>
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/20 flex items-center justify-center">
              <FileAudio className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No uploaded calls yet</p>
            <p className="text-xs text-muted-foreground">
              Upload your first call to see it here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-foreground mb-3">Recent Call Uploads</h3>
        <div className="space-y-2">
          {recentUploads.map(upload => (
            <div 
              key={upload.id} 
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleUploadClick(upload.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full gradient-primary p-0.5">
                  <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                    {upload.file_type === 'video' ? (
                      <FileVideo className="h-4 w-4 text-foreground" />
                    ) : (
                      <FileAudio className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">
                      {upload.original_filename}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {upload.file_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(upload.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 flex-shrink-0">
                View
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentCallUploads;