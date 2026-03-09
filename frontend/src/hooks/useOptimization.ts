import { useEffect } from 'react';

// Hook for detecting slow network conditions
export const useNetworkOptimization = () => {
  useEffect(() => {
    // Detect slow connections and reduce quality
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      const handleConnectionChange = () => {
        const isSlowConnection = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g' ||
                                connection.saveData;

        if (isSlowConnection) {
          document.body.classList.add('slow-connection');
          // Reduce animations, image quality, etc.
        } else {
          document.body.classList.remove('slow-connection');
        }
      };

      connection.addEventListener('change', handleConnectionChange);
      handleConnectionChange();

      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);
};

// Hook for prefetching critical resources
export const useResourcePrefetch = () => {
  useEffect(() => {
    // Prefetch critical pages
    const criticalPages = ['/login', '/register', '/search'];
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        criticalPages.forEach(page => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = page;
          document.head.appendChild(link);
        });
      });
    }
  }, []);
};

// Hook for lazy loading images
export const useLazyLoading = () => {
  useEffect(() => {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => imageObserver.observe(img));

    return () => {
      lazyImages.forEach(img => imageObserver.unobserve(img));
    };
  }, []);
};
