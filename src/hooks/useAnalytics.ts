import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView } from '@/lib/analytics';

/**
 * Custom hook to initialize GA and track page views
 * Use this in your main App component
 */
export const useAnalytics = () => {
  const location = useLocation();

  // Initialize GA on mount
  useEffect(() => {
    initGA();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
};

export default useAnalytics;
