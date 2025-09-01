import React, { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    isRefreshing,
    pullDistance,
    shouldShowIndicator,
    isThresholdReached,
    bindEvents,
  } = usePullToRefresh({ onRefresh, threshold: 80 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const cleanup = bindEvents(element);
    return cleanup;
  }, [bindEvents]);

  const indicatorOpacity = Math.min(pullDistance / 80, 1);
  const indicatorScale = Math.min(0.5 + (pullDistance / 160), 1);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull to refresh indicator */}
      <div 
        className={cn(
          "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full",
          "flex items-center justify-center w-12 h-12",
          "transition-all duration-200 ease-out",
          shouldShowIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translateX(-50%) translateY(${Math.max(-48 + pullDistance * 0.5, -48)}px) scale(${indicatorScale})`,
          opacity: indicatorOpacity,
        }}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          "bg-primary/20 backdrop-blur-sm border border-primary/30",
          isThresholdReached && "bg-primary text-primary-foreground",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw className="w-4 h-4" />
        </div>
      </div>

      {/* Content with pull distance transform */}
      <div 
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.3, 24)}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;