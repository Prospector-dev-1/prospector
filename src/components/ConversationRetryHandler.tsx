import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConversationRetryHandlerProps {
  error: string;
  retryAvailable?: boolean;
  onRetry?: () => void;
  sessionId?: string;
}

const ConversationRetryHandler: React.FC<ConversationRetryHandlerProps> = ({
  error,
  retryAvailable = false,
  onRetry,
  sessionId
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleRetrySession = () => {
    if (sessionId) {
      // Navigate back to the replay setup or restart the session
      navigate(`/ai-replay/${sessionId.split('_')[2]}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Card className="m-4 p-6 border-destructive/50">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        
        <div>
          <h3 className="text-lg font-semibold text-destructive">
            Connection Failed
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            {error}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {retryAvailable && onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <Button onClick={handleRetrySession} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart Session
          </Button>
          
          <Button onClick={handleGoHome} variant="secondary">
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>

        <div className="text-xs text-muted-foreground max-w-md">
          <p>
            If this problem persists, the AI service may be experiencing high demand. 
            Try again in a few minutes or contact support if the issue continues.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ConversationRetryHandler;