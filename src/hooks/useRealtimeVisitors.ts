import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  visitorId: string;
  page: string;
  timestamp: string;
}

/**
 * Hook to track real-time visitors using Supabase Presence
 * This creates a shared channel where all visitors are tracked
 */
export const useRealtimeVisitors = () => {
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Generate a unique visitor ID for this session
    const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a channel for presence tracking
    const channel = supabase.channel('online-visitors', {
      config: {
        presence: {
          key: visitorId,
        },
      },
    });

    // Track presence state changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setActiveVisitors(count);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Visitor joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Visitor left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track this visitor's presence
          const presenceData: PresenceState = {
            visitorId,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
          };
          await channel.track(presenceData);
        }
      });

    // Update page on navigation
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await channel.track({
          visitorId,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, []);

  return { activeVisitors, isConnected };
};

export default useRealtimeVisitors;
