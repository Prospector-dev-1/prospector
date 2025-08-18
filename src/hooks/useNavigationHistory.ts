import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Route-to-name mapping for better UX
const ROUTE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/progress': 'Progress',
  '/challenges': 'Challenges',
  '/profile': 'Profile',
  '/call-upload': 'Call Upload',
  '/call-simulation': 'Practice Call',
  '/call-coaching': 'Call Coaching',
  '/call-results': 'Call Results',
  '/call-review': 'Call Review',
  '/ai-replay': 'AI Replay',
  '/custom-script-generator': 'Script Generator',
  '/script-analysis': 'Script Analysis',
  '/help': 'Help',
  '/plans': 'Plans',
  '/buy-credits': 'Buy Credits',
  '/leaderboard': 'Leaderboard',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service'
};

export const useNavigationHistory = () => {
  const location = useLocation();
  const previousRoute = useRef<string | null>(null);
  const currentRoute = useRef<string>(location.pathname);

  useEffect(() => {
    // Store previous route before updating current
    if (currentRoute.current !== location.pathname) {
      previousRoute.current = currentRoute.current;
      currentRoute.current = location.pathname;
    }
  }, [location.pathname]);

  const getPreviousPageName = (): string => {
    if (!previousRoute.current) {
      return 'Dashboard';
    }

    // Handle dynamic routes by removing UUIDs and other dynamic segments
    let basePath = previousRoute.current
      .replace(/\/[a-f0-9-]{36}$/i, '') // Remove trailing UUIDs
      .replace(/\/[a-f0-9-]{36}\//g, '/') // Remove UUIDs in middle of path
      .replace(/\/$/, ''); // Remove trailing slash
    
    // If the path is empty after cleaning, default to root
    if (!basePath) basePath = '/';
    
    return ROUTE_NAMES[basePath] || ROUTE_NAMES[previousRoute.current] || 'Dashboard';
  };

  return {
    getPreviousPageName,
    hasPreviousPage: previousRoute.current !== null && previousRoute.current !== location.pathname
  };
};