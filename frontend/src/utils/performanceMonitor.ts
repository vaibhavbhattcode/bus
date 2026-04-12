import React from 'react';

/**
 * Frontend Performance Monitoring
 * Tracks and reports performance metrics
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Monitor page load
    window.addEventListener('load', () => {
      this.measurePageLoad();
    });

    // Monitor Web Vitals
    this.observeWebVitals();

    // Monitor long tasks
    this.observeLongTasks();
  }

  private measurePageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      this.metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
    }
  }

  private observeWebVitals() {
    // First Contentful Paint (FCP)
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
      }
    });
    paintObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any;
        this.metrics.firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      this.metrics.cumulativeLayoutShift = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Report metrics to analytics
   */
  report() {
    const metrics = this.getMetrics();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metrics);
    }
  }

  private sendToAnalytics(metrics: Partial<PerformanceMetrics>) {
    // Implement analytics reporting
    // Example: Google Analytics, Sentry, etc.
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        type: 'performance',
        metrics,
        timestamp: Date.now(),
        url: window.location.href,
      });
      
      navigator.sendBeacon('/api/analytics/performance', data);
    }
  }

  /**
   * Mark custom performance points
   */
  mark(name: string) {
    performance.mark(name);
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark: string) {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name}: ${measure.duration}ms`);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.mark(`${componentName}-mount`);

    return () => {
      performanceMonitor.mark(`${componentName}-unmount`);
      performanceMonitor.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount`,
        `${componentName}-unmount`
      );
    };
  }, [componentName]);
}
