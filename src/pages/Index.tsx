import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from './Dashboard';
import { Navigate } from 'react-router-dom';
import SEO from '@/components/SEO';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (<>
    <SEO title="Prospector Dashboard | AI Cold Call Training" description="Your AI sales training dashboard: credits, calls, insights." canonicalPath="/" />
    <Dashboard />
  </>);
};

export default Index;
