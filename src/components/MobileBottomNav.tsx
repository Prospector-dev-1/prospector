import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Target, TrendingUp, Trophy, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnclaimedChallenges } from '@/hooks/useUnclaimedChallenges';
import { cn } from '@/lib/utils';
const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile
  } = useAuth();
  const {
    unclaimedCount,
    loading
  } = useUnclaimedChallenges();
  const navItems = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/',
    badge: null
  }, {
    id: 'challenges',
    label: 'Challenges',
    icon: Target,
    path: '/challenges',
    badge: !loading && unclaimedCount > 0 ? unclaimedCount : null
  }, {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    path: '/leaderboard',
    badge: null
  }, {
    id: 'progress',
    label: 'Progress',
    icon: TrendingUp,
    path: '/progress',
    badge: null
  }, {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/profile',
    badge: null
  }];
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  return <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      <div className="glass-card border-t">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return;
        })}
        </div>
      </div>
    </div>;
};
export default MobileBottomNav;