import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design breakpoints
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    isLargeDesktop: windowSize.width >= 1440,
  };
}

/**
 * Custom hook for detecting online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Custom hook for lazy loading images
 */
export function useLazyLoad(ref: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
}

/**
 * Custom hook for infinite scroll
 */
export function useInfiniteScroll(callback: () => void, hasMore: boolean) {
  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (hasMore) {
          callback();
        }
      }
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, hasMore]);
}

/**
 * Custom hook for local storage with sync
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * Custom hook for network speed detection
 */
export function useNetworkSpeed() {
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      const updateSpeed = () => {
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setSpeed('slow');
        } else if (effectiveType === '3g') {
          setSpeed('medium');
        } else {
          setSpeed('fast');
        }
      };

      updateSpeed();
      connection.addEventListener('change', updateSpeed);

      return () => {
        connection.removeEventListener('change', updateSpeed);
      };
    }
  }, []);

  return speed;
}

/**
 * Custom hook for prefetching data
 */
export function usePrefetch<T>(
  fetchFn: () => Promise<T>,
  shouldPrefetch: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shouldPrefetch) return;

    let cancelled = false;

    const prefetch = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // Prefetch after a short delay
    const timer = setTimeout(prefetch, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchFn, shouldPrefetch]);

  return { data, isLoading, error };
}
