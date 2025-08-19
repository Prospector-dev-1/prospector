import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_STORAGE_KEY = 'scroll-positions';

interface ScrollPosition {
  [pathname: string]: number;
}

const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastPathnameRef = useRef<string>('');
  const isFirstLoadRef = useRef(true);

  // Save current scroll position before leaving a route
  const saveScrollPosition = (pathname: string) => {
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      const positions: ScrollPosition = stored ? JSON.parse(stored) : {};
      positions[pathname] = window.scrollY;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
    } catch (error) {
      console.warn('Failed to save scroll position:', error);
    }
  };

  // Get stored scroll position for a route
  const getStoredScrollPosition = (pathname: string): number => {
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (!stored) return 0;
      const positions: ScrollPosition = JSON.parse(stored);
      return positions[pathname] || 0;
    } catch (error) {
      console.warn('Failed to get scroll position:', error);
      return 0;
    }
  };

  // Reset internal scroll containers
  const resetInternalScrollContainers = () => {
    const selectors = [
      '.scroll-area',
      '.panel-scroll',
      '[data-scroll-container]',
      '.overflow-y-auto',
      '.overflow-auto'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });
    });
  };

  // Handle scroll to hash anchor
  const scrollToHash = (hash: string) => {
    if (!hash) return;
    
    requestAnimationFrame(() => {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'auto', 
          block: 'start' 
        });
      }
    });
  };

  // Main scroll handling logic
  useEffect(() => {
    const currentPathname = location.pathname + location.search;
    const lastPathname = lastPathnameRef.current;
    
    // Don't handle on first load
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      lastPathnameRef.current = currentPathname;
      
      // Handle hash on initial load
      if (location.hash) {
        scrollToHash(location.hash);
      } else {
        // Ensure we start at top on initial load
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        resetInternalScrollContainers();
      }
      return;
    }

    // Save scroll position of previous route
    if (lastPathname && lastPathname !== currentPathname) {
      saveScrollPosition(lastPathname);
    }

    // Handle scroll based on navigation type
    if (location.hash) {
      // Hash navigation - scroll to anchor
      scrollToHash(location.hash);
    } else if (navigationType === 'POP') {
      // Back/forward navigation - restore scroll position
      const savedPosition = getStoredScrollPosition(currentPathname);
      requestAnimationFrame(() => {
        window.scrollTo({ 
          top: savedPosition, 
          left: 0, 
          behavior: 'auto' 
        });
      });
    } else {
      // New navigation (PUSH/REPLACE) - scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      resetInternalScrollContainers();
    }

    lastPathnameRef.current = currentPathname;
  }, [location.pathname, location.search, location.hash, navigationType]);

  // Handle page unload to save current position
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentPathname = location.pathname + location.search;
      saveScrollPosition(currentPathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname, location.search]);

  // Prevent layout shifts by ensuring scroll is at top after content loads
  useEffect(() => {
    if (location.hash) return; // Don't interfere with hash navigation

    const handleLoad = () => {
      if (navigationType !== 'POP') {
        // Additional scroll to top after images/fonts load to counter layout shifts
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }, 100);
      }
    };

    // Listen for various load events
    if (document.readyState === 'loading') {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [location.pathname, location.hash, navigationType]);

  return null;
};

export default ScrollManager;