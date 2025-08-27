import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SEO from '@/components/SEO';
import SmartBackButton from '@/components/SmartBackButton';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEO title="404 Not Found | Prospector" description="The page you are looking for doesn’t exist." canonicalPath={location.pathname} />
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
