/**
 * Development page for testing audio teardown and replay functionality
 * Use this to test Start Live, Stop Live, Start Replay scenarios
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeAIChat } from '@/hooks/useRealtimeAIChat';
import { ReplayPlayer } from '@/components/ReplayPlayer';
import { audioLogger, AUDIO_PHASES } from '@/utils/audioLogger';
import { AUDIO_CONFIG } from '@/config/audioConfig';
import { Play, Square, Volume2, Settings, Trash2 } from 'lucide-react';

const AudioTest = () => {
  const { toast } = useToast();
  const [testAudioUrl, setTestAudioUrl] = useState('');
  const [testMode, setTestMode] = useState<'live' | 'replay'>('live');
  const stopCountRef = useRef(0);

  // Live call hook
  const liveChat = useRealtimeAIChat({ 
    useCase: 'live',
    isUploadCallReplay: false
  });

  // Replay hook (separate instance for testing)
  const replayChat = useRealtimeAIChat({ 
    useCase: 'replay',
    isUploadCallReplay: true
  });

  const currentChat = testMode === 'live' ? liveChat : replayChat;

  const testStartLive = async () => {
    try {
      audioLogger.info(AUDIO_PHASES.INIT, 'Test: Starting live call');
      
      toast({
        title: 'Starting Live Call',
        description: 'Testing live audio with Krisp processing',
      });

      await currentChat.startConversation(
        'test-session-' + Date.now(),
        { type: 'test_moment', content: 'Testing live call functionality' },
        'detailed',
        'professional',
        'none'
      );

      audioLogger.info(AUDIO_PHASES.LIVE, 'Test: Live call started successfully');
    } catch (error) {
      audioLogger.error(AUDIO_PHASES.INIT, 'Test: Live call failed', { error: (error as Error).message });
      toast({
        title: 'Live Call Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const testStopLive = async () => {
    try {
      stopCountRef.current++;
      const stopId = stopCountRef.current;
      
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Test: Stopping live call', { stopId });
      
      toast({
        title: 'Stopping Live Call',
        description: `Stop attempt #${stopId} - testing idempotent behavior`,
      });

      await currentChat.endConversation();
      
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Test: Live call stopped successfully', { stopId });
      
      toast({
        title: 'Live Call Stopped',
        description: 'Audio resources cleaned up successfully',
      });
    } catch (error) {
      audioLogger.error(AUDIO_PHASES.TEARDOWN, 'Test: Stop failed', { error: (error as Error).message });
      toast({
        title: 'Stop Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const testStartReplay = () => {
    if (!testAudioUrl) {
      toast({
        title: 'No Audio URL',
        description: 'Please enter a test audio URL first',
        variant: 'destructive',
      });
      return;
    }

    audioLogger.info(AUDIO_PHASES.REPLAY, 'Test: Starting replay', { url: testAudioUrl });
    
    toast({
      title: 'Starting Replay',
      description: 'Testing replay without Krisp processing',
    });
  };

  const clearLogs = () => {
    audioLogger.clear();
    stopCountRef.current = 0;
    toast({
      title: 'Logs Cleared',
      description: 'Audio logs have been reset',
    });
  };

  const downloadLogs = () => {
    const logs = audioLogger.getLogs();
    const logsJson = JSON.stringify(logs, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Logs Downloaded',
      description: 'Audio logs saved to downloads folder',
    });
  };

  const getStatusBadge = () => {
    const state = currentChat.conversationState;
    if (state.status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (state.status === 'connecting') {
      return <Badge className="bg-yellow-500">Connecting</Badge>;
    }
    if (state.status === 'ending') {
      return <Badge className="bg-orange-500">Ending</Badge>;
    }
    return <Badge variant="secondary">Idle</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Audio System Test</h1>
        <p className="text-muted-foreground">
          Test live calls, replay functionality, and teardown behavior
        </p>
      </div>

      {/* Configuration Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Audio Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Live Krisp:</strong> {AUDIO_CONFIG.ENABLE_KRISP_FOR_LIVE ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <strong>Replay Krisp:</strong> {AUDIO_CONFIG.ENABLE_KRISP_FOR_REPLAY ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <strong>Sample Rate:</strong> {AUDIO_CONFIG.SAMPLE_RATE}Hz
            </div>
            <div>
              <strong>Init Timeout:</strong> {AUDIO_CONFIG.KRISP_INIT_TIMEOUT}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={testMode === 'live' ? 'default' : 'outline'}
              onClick={() => setTestMode('live')}
            >
              Live Call Mode
            </Button>
            <Button
              variant={testMode === 'replay' ? 'default' : 'outline'}
              onClick={() => setTestMode('replay')}
            >
              Replay Mode
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium">Current Status:</span>
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>

      {/* Live Call Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Live Call Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testStartLive}
              disabled={currentChat.conversationState.status !== 'idle'}
              className="flex-1"
            >
              Start Live Call
            </Button>
            <Button 
              onClick={testStopLive}
              variant="destructive"
              disabled={currentChat.conversationState.status === 'idle'}
              className="flex-1"
            >
              Stop Live Call
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Stop Count:</strong> {stopCountRef.current} (testing idempotent behavior)</p>
            <p><strong>Exchange Count:</strong> {currentChat.conversationState.exchangeCount}</p>
          </div>
          
          {/* Test multiple stop calls */}
          <div className="pt-2">
            <Button 
              onClick={() => {
                testStopLive();
                setTimeout(testStopLive, 100);
                setTimeout(testStopLive, 200);
              }}
              variant="outline"
              size="sm"
              disabled={currentChat.conversationState.status === 'idle'}
            >
              Test Rapid Stop (3x)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Replay Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Replay Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Audio URL:</label>
            <input
              type="url"
              value={testAudioUrl}
              onChange={(e) => setTestAudioUrl(e.target.value)}
              placeholder="https://example.com/test-audio.mp3"
              className="w-full p-2 border rounded"
            />
          </div>
          
          {testAudioUrl && (
            <div className="mt-4">
              <ReplayPlayer
                src={testAudioUrl}
                onError={(error) => {
                  audioLogger.error(AUDIO_PHASES.REPLAY, 'Test replay failed', { error: error.message });
                  toast({
                    title: 'Replay Failed',
                    description: error.message,
                    variant: 'destructive',
                  });
                }}
                onEnded={() => {
                  audioLogger.info(AUDIO_PHASES.REPLAY, 'Test replay ended');
                  toast({
                    title: 'Replay Ended',
                    description: 'Test audio playback completed',
                  });
                }}
                autoPlay={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logging Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Logging & Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
            <Button onClick={downloadLogs} variant="outline">
              Download Logs
            </Button>
          </div>
          
          <div className="text-sm">
            <p><strong>Log Summary:</strong></p>
            <p>{audioLogger.getSummary()}</p>
          </div>
          
          {/* Recent errors */}
          <div className="text-sm">
            <p><strong>Recent Errors:</strong></p>
            <div className="bg-muted p-2 rounded max-h-32 overflow-y-auto">
              {audioLogger.getLogsByLevel('error').slice(0, 5).map((log, i) => (
                <div key={i} className="text-red-600">
                  [{log.phase}] {log.event}: {log.data?.error || 'No details'}
                </div>
              ))}
              {audioLogger.getLogsByLevel('error').length === 0 && (
                <div className="text-green-600">No errors recorded</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>1. Normal Flow:</strong> Start Live → Stop Live → Start Replay</div>
          <div><strong>2. Rapid Stop:</strong> Start Live → Click "Test Rapid Stop" → Check for errors</div>
          <div><strong>3. Mode Switch:</strong> Start Live → Switch to Replay mode → Start Replay</div>
          <div><strong>4. Error Recovery:</strong> Start with invalid audio URL → Check error handling</div>
          <div><strong>5. Browser Constraints:</strong> Test with autoplay blocked</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioTest;