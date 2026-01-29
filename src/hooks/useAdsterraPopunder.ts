import { useEffect, useCallback } from 'react';
import { adsterraPopunder } from '@/services/adsterraPopunder';

interface UseAdsterraPopunderOptions {
  minInterval?: number;
  autoInitialize?: boolean;
}

export const useAdsterraPopunder = (options: UseAdsterraPopunderOptions = {}) => {
  const {
    minInterval = 30000, // 30 seconds default
    autoInitialize = true
  } = options;

  useEffect(() => {
    if (autoInitialize) {
      // Set custom interval if provided
      if (minInterval !== 30000) {
        adsterraPopunder.setMinInterval(minInterval);
      }

      // Initialize the popunder service
      adsterraPopunder.initialize();
    }
  }, [autoInitialize, minInterval]);

  const triggerPopunder = useCallback(() => {
    return adsterraPopunder.triggerPopunder();
  }, []);

  const forceTriggerPopunder = useCallback(() => {
    return adsterraPopunder.forceTrigger();
  }, []);

  const canTriggerPopunder = useCallback(() => {
    return adsterraPopunder.canTrigger();
  }, []);

  const getTimeUntilNext = useCallback(() => {
    return adsterraPopunder.getTimeUntilNext();
  }, []);

  return {
    triggerPopunder,
    forceTriggerPopunder,
    canTriggerPopunder,
    getTimeUntilNext
  };
};