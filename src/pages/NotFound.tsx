import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import SmartBackButton from '@/components/SmartBackButton';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Special handling for /ai-replay without uploadId
    if (location.pathname === '/ai-replay') {
      console.log('404 Error: User attempted to access /ai-replay without uploadId');
      toast.error('Please select a call to replay from your dashboard');
      // Auto-redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      return;
    }

    // Log other 404 errors for debugging
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, navigate]);

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  // Special message for AI replay route
  if (location.pathname === '/ai-replay') {
    return (
      <>
        <SEO title="Select Call to Replay | Prospector" description="Select a call from your dashboard to use AI replay." canonicalPath={location.pathname} />
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Select a Call to Replay
              </h1>
              <p className="text-muted-foreground mb-6">
                To use AI replay, please select a call from your dashboard first.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={handleGoHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="404 Not Found | Prospector" description="The page you are looking for doesn't exist." canonicalPath={location.pathname} />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
          <SmartBackButton />
        </div>
      </div>
    </>
  );
};

export default NotFound;