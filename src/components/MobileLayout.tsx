import React from 'react';
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
  return (
    <div className="min-h-screen bg-background">
      <main className={cn(
        "flex-1",
        showBottomNav && "pb-20", // Add padding for bottom nav
        className
      )}>
        {children}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;