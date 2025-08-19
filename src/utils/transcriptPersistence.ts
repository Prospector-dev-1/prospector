import { supabase } from '@/integrations/supabase/client';

interface TranscriptPersistenceData {
  callSessionId: string;
  finalTranscript: string;
  wordCount: number;
  checksum: string;
  timeline?: Array<{ time: number; event: string }>;
}

export const persistTranscript = async (data: TranscriptPersistenceData): Promise<boolean> => {
  try {
    console.log(`💾 Persisting transcript for session ${data.callSessionId}`);
    
    // Update the calls table with the final transcript only (avoid optional columns that may not exist)
    const { error } = await supabase
      .from('calls')
      .update({
        transcript: data.finalTranscript
      })
      .eq('id', data.callSessionId);

    if (error) {
      console.error('Failed to persist transcript:', error);
      return false;
    }

    console.log(`✅ Successfully persisted transcript (${data.wordCount} words, checksum: ${data.checksum})`);
    return true;
  } catch (error) {
    console.error('Error persisting transcript:', error);
    return false;
  }
};

export const generateTranscriptChecksum = (transcript: string): string => {
  // Simple checksum for transcript integrity
  let hash = 0;
  for (let i = 0; i < transcript.length; i++) {
    const char = transcript.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};