import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Target, TrendingUp, Trophy, User, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnclaimedChallenges } from '@/hooks/useUnclaimedChallenges';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { unclaimedCount, loading } = useUnclaimedChallenges();
  const { isAdmin } = useIsAdmin();

  const baseNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/',
      badge: null,
    },
    {
      id: 'challenges',
      label: 'Challenges',
      icon: Target,
      path: '/challenges',
      badge: !loading && unclaimedCount > 0 ? unclaimedCount : null,
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      path: '/leaderboard',
      badge: null,
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: TrendingUp,
      path: '/progress',
      badge: null,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      badge: null,
    },
  ];

  const adminNavItems = isAdmin ? [
    {
      id: 'admin',
      label: 'Admin',
      icon: Settings,
      path: '/admin/users',
      badge: null,
    },
  ] : [];

  const navItems = [...baseNavItems, ...adminNavItems];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      <div className="glass-card border-t">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px] relative",
                  active 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5 mb-1", active && "scale-110")} />
                  {item.badge && item.badge > 0 && (
                    <div className={cn(
                      "notification-badge",
                      item.id === 'challenges' && "animate-pulse"
                    )}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  active && "text-primary"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;