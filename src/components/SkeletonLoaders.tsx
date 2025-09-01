import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const HeroCardSkeleton = () => (
  <div className="glass-card p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-12 w-24" />
    </div>
    <div className="flex items-center space-x-4">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const StatsCardSkeleton = () => (
  <div className="glass-card p-4 space-y-2">
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-8 w-12" />
  </div>
);

export const FeatureCardSkeleton = () => (
  <div className="glass-card p-4 space-y-3">
    <div className="flex items-start space-x-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <Skeleton className="h-10 w-full" />
  </div>
);

export const LeaderboardSkeleton = () => (
  <div className="glass-card p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-16" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
);

export const RecentCallsSkeleton = () => (
  <div className="glass-card p-4 space-y-3">
    <Skeleton className="h-6 w-40" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  </div>
);