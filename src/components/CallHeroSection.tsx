import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Clock, Zap } from 'lucide-react';

interface CallHeroSectionProps {
  userName: string;
  credits: number;
  subscriptionType: string;
  recentPerformance?: {
    lastScore?: number;
    streak?: number;
    avgScore?: number;
  };
}

const CallHeroSection: React.FC<CallHeroSectionProps> = ({
  userName,
  credits,
  subscriptionType,
  recentPerformance = {}
}) => {
  const { lastScore, streak = 0, avgScore } = recentPerformance;

  return (
    <Card className="gradient-primary border-0 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      <CardContent className="p-6 relative">
        <div className="space-y-4">
          {/* Welcome Message */}
          <div>
            <h2 className="text-xl font-bold mb-1">Ready for Practice?</h2>
            <p className="text-white/80 text-sm">
              Perfect your cold calling skills with AI-powered simulations
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Credits */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{credits}</p>
                  <p className="text-xs text-white/70">Credits</p>
                </div>
                <Zap className="h-5 w-5 text-white/70" />
              </div>
            </div>

            {/* Recent Performance */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {lastScore ? `${lastScore}%` : '--'}
                  </p>
                  <p className="text-xs text-white/70">Last Score</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/70" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {(streak > 0 || avgScore) && (
            <div className="flex gap-2">
              {streak > 0 && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  🔥 {streak} day streak
                </Badge>
              )}
              {avgScore && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  📊 {avgScore}% avg
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallHeroSection;