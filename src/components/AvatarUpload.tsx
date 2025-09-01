import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, X } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userInitials: string;
  userId: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  userInitials,
  userId,
  onAvatarUpdate,
  size = 'md'
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;
    
    setUploading(true);
    
    try {
      // Delete from storage
      const oldPath = currentAvatarUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('avatars').remove([oldPath]);
      
      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);
        
      if (updateError) throw updateError;
      
      onAvatarUpdate('');
      
      toast({
        title: 'Success',
        description: 'Profile picture removed successfully'
      });
      
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Remove failed',
        description: error.message || 'Failed to remove profile picture',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete existing avatar if present
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(publicUrl);
      
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully'
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload profile picture',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClasses[size]} border-2 border-primary/20`}>
        <AvatarImage src={currentAvatarUrl || undefined} alt="Profile picture" />
        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      
      
      {currentAvatarUrl && (
        <Button
          onClick={handleRemoveAvatar}
          disabled={uploading}
          size="sm"
          className="absolute -top-2 -right-2 rounded-full h-6 w-6 p-0 border-2 border-background"
          variant="destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <Button
        onClick={handleFileSelect}
        disabled={uploading}
        size="sm"
        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 border-2 border-background"
        variant="default"
      >
        {uploading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Camera className={iconSizes[size]} />
        )}
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;