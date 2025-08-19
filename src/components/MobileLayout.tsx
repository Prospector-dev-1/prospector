import React from 'react';
import { useLocation } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children, 
  className,
  showBottomNav = true 
}) => {
  const location = useLocation();
  
  // Hide navigation on call-related routes
  const isCallPage = location.pathname.includes('/live-call') || location.pathname.includes('/call-simulation-live');
  const shouldShowNav = showBottomNav && !isCallPage;
  
  return (
    <div className="min-h-screen bg-background">
      <main className={cn(
        "flex-1",
        shouldShowNav && "pb-20", // Add padding for bottom nav
        className
      )}>
        {children}
      </main>
      {shouldShowNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;