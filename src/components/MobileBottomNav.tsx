import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Target, TrendingUp, Trophy, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnclaimedChallenges } from '@/hooks/useUnclaimedChallenges';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { unclaimedCount, loading } = useUnclaimedChallenges();
  const { buttonFeedback } = useHapticFeedback();

  const navItems = [
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

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    buttonFeedback();
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      {/* Background with enhanced glass effect */}
      <div className="glass-card border-t backdrop-blur-xl">
        {/* Active tab indicator */}
        <div className="relative">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-[60px] relative group mobile-tap-highlight",
                    "hover:scale-105 active:scale-95",
                    active 
                      ? "text-primary bg-primary/10 shadow-glow" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {/* Active indicator dot */}
                  {active && (
                    <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full animate-pulse" />
                  )}
                  
                  <div className="relative">
                    <Icon className={cn(
                      "h-5 w-5 mb-1 transition-all duration-300",
                      active && "scale-110 text-primary",
                      "group-hover:scale-105"
                    )} />
                    {item.badge && item.badge > 0 && (
                      <div className={cn(
                        "notification-badge",
                        item.id === 'challenges' && "animate-pulse bg-red-500 shadow-lg"
                      )}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300",
                    active ? "text-primary font-semibold" : "text-muted-foreground",
                    "group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>

                  {/* Ripple effect on tap */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;