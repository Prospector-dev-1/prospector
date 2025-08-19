import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';

// Capacitor App import with error handling
let CapacitorApp: any = null;
try {
  // Dynamic import to prevent errors in web environment
  CapacitorApp = require('@capacitor/app').App;
} catch {
  // Capacitor not available in web environment
}

const NAV_STACK_KEY = 'navigation-stack';
const MAX_STACK_SIZE = 20;

interface NavigationEntry {
  pathname: string;
  search: string;
  hash: string;
  timestamp: number;
}

export const useSmartNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const isInitializedRef = useRef(false);
  const lastLocationRef = useRef<string>('');

  // Get navigation stack from session storage
  const getNavigationStack = useCallback((): NavigationEntry[] => {
    try {
      const stored = sessionStorage.getItem(NAV_STACK_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save navigation stack to session storage
  const saveNavigationStack = useCallback((stack: NavigationEntry[]) => {
    try {
      sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
    } catch (error) {
      console.warn('Failed to save navigation stack:', error);
    }
  }, []);

  // Add current location to navigation stack
  const pushToStack = useCallback((entry: NavigationEntry) => {
    const stack = getNavigationStack();
    
    // Don't add duplicate consecutive entries
    const lastEntry = stack[stack.length - 1];
    if (lastEntry && 
        lastEntry.pathname === entry.pathname && 
        lastEntry.search === entry.search && 
        lastEntry.hash === entry.hash) {
      return;
    }

    // Add new entry and trim if needed
    stack.push(entry);
    if (stack.length > MAX_STACK_SIZE) {
      stack.shift();
    }

    saveNavigationStack(stack);
  }, [getNavigationStack, saveNavigationStack]);

  // Smart back navigation
  const goBack = useCallback((fallbackRoute: string = '/') => {
    const stack = getNavigationStack();
    
    // Check if browser history can go back
    const canGoBackInHistory = window.history.state?.idx > 0;
    
    if (canGoBackInHistory && stack.length > 1) {
      // Remove current entry and go back
      stack.pop();
      saveNavigationStack(stack);
      navigate(-1);
    } else if (stack.length > 1) {
      // Use our session stack
      stack.pop(); // Remove current
      const previousEntry = stack.pop(); // Get previous
      if (previousEntry) {
        const targetPath = `${previousEntry.pathname}${previousEntry.search}${previousEntry.hash}`;
        navigate(targetPath, { replace: true });
      } else {
        navigate(fallbackRoute, { replace: true });
      }
    } else {
      // No history available, go to fallback
      navigate(fallbackRoute, { replace: true });
    }
  }, [navigate, getNavigationStack, saveNavigationStack]);

  // Check if we can go back
  const canGoBack = useCallback(() => {
    const stack = getNavigationStack();
    return window.history.state?.idx > 0 || stack.length > 1;
  }, [getNavigationStack]);

  // Get previous page name for display
  const getPreviousPageName = useCallback(() => {
    const stack = getNavigationStack();
    if (stack.length > 1) {
      const previousEntry = stack[stack.length - 2];
      return getPageNameFromPath(previousEntry.pathname);
    }
    return 'Dashboard';
  }, [getNavigationStack]);

  // Track navigation changes
  useEffect(() => {
    const currentLocation = `${location.pathname}${location.search}${location.hash}`;
    
    // Skip initial mount
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastLocationRef.current = currentLocation;
      
      // Add initial entry to stack
      pushToStack({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        timestamp: Date.now()
      });
      return;
    }

    // Only track on actual navigation (not hash-only changes)
    if (lastLocationRef.current !== currentLocation && navigationType === 'PUSH') {
      pushToStack({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        timestamp: Date.now()
      });
    }

    lastLocationRef.current = currentLocation;
  }, [location.pathname, location.search, location.hash, navigationType, pushToStack]);

  // Handle hardware back button (Capacitor)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleBackButton = () => {
      // Throttle to prevent double navigation
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Check if any modals or overlays are open
        const activeModal = document.querySelector('[role="dialog"][data-state="open"]');
        const activeSheet = document.querySelector('[data-vaul-drawer][data-state="open"]');
        const activePopover = document.querySelector('[data-radix-popper-content-wrapper]');
        
        if (activeModal || activeSheet || activePopover) {
          // Close modal/sheet by triggering escape key or clicking backdrop
          const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
          document.dispatchEvent(escEvent);
        } else {
          // Perform normal back navigation
          goBack();
        }
      }, 300);
    };

    // Register hardware back button listener (only if Capacitor is available)
    if (CapacitorApp) {
      CapacitorApp.addListener('backButton', handleBackButton);
    }

    return () => {
      clearTimeout(timeoutId);
      if (CapacitorApp) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, [goBack]);

  return {
    goBack,
    canGoBack,
    getPreviousPageName
  };
};

// Helper function to get page name from pathname
const getPageNameFromPath = (pathname: string): string => {
  const routeNames: Record<string, string> = {
    '/': 'Dashboard',
    '/progress': 'Progress',
    '/challenges': 'Challenges',
    '/profile': 'Profile',
    '/call-upload': 'Call Upload',
    '/call-simulation': 'Practice Call',
    '/call-coaching': 'Call Coaching',
    '/call-results': 'Call Results',
    '/call-review': 'Call Review',
    '/call-analysis': 'Call Analysis',
    '/live-call': 'Live Call',
    '/ai-replay': 'AI Replay',
    '/ai-replay-setup': 'AI Replay Setup',
    '/custom-script': 'Script Generator',
    '/script-analysis': 'Script Analysis',
    '/help': 'Help',
    '/plans': 'Plans',
    '/buy-credits': 'Buy Credits',
    '/leaderboard': 'Leaderboard',
    '/privacy': 'Privacy Policy'
  };

  // Handle dynamic routes by removing UUIDs
  let basePath = pathname
    .replace(/\/[a-f0-9-]{36}$/i, '') // Remove trailing UUIDs
    .replace(/\/[a-f0-9-]{36}\//g, '/') // Remove UUIDs in middle of path
    .replace(/\/$/, ''); // Remove trailing slash
  
  if (!basePath) basePath = '/';
  
  return routeNames[basePath] || routeNames[pathname] || 'Previous Page';
};