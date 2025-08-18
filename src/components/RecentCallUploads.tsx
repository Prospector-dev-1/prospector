import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileAudio, FileVideo, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const handleEditName = (upload: CallUploadRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(upload.id);
    setEditingName(upload.original_filename);
  };

  const handleSaveName = async (uploadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('call_uploads')
        .update({ original_filename: editingName })
        .eq('id', uploadId);

      if (error) {
        toast.error('Failed to update call name');
        return;
      }

      setRecentUploads(prev => 
        prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, original_filename: editingName }
            : upload
        )
      );
      
      setEditingId(null);
      toast.success('Call name updated');
    } catch (error) {
      toast.error('Failed to update call name');
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };

  if (recentUploads.length === 0 && !loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-bold text-foreground">Recent Call Uploads</h3>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {isExpanded && (
            <div className="text-center py-6 mt-3">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/20 flex items-center justify-center">
                <FileAudio className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">No uploaded calls yet</p>
              <p className="text-xs text-muted-foreground">
                Upload your first call to see it here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-bold text-foreground">Recent Call Uploads</h3>
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )
          )}
        </button>
        
        {isExpanded && !loading && (
          <div className="space-y-2 mt-3">
            {recentUploads.map(upload => (
              <div 
                key={upload.id} 
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleUploadClick(upload.id)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full gradient-primary p-0.5 flex-shrink-0">
                    <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                      {upload.file_type === 'video' ? (
                        <FileVideo className="h-4 w-4 text-foreground" />
                      ) : (
                        <FileAudio className="h-4 w-4 text-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {editingId === upload.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm h-6 px-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveName(upload.id, e as any);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit(e as any);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {upload.original_filename}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {upload.file_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {editingId === upload.id ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleSaveName(upload.id, e)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleEditName(upload, e)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentCallUploads;