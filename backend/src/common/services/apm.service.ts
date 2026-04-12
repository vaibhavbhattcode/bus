import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  name: string;
  error: string;
  stack?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class ApmService {
  private readonly logger = new Logger(ApmService.name);
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly maxErrors = 500;

  trackPerformance(name: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    if (duration > 1000) {
      this.logger.warn(`Slow operation: ${name} took ${duration}ms`, metadata);
    }
  }

  trackError(name: string, error: Error, metadata?: Record<string, any>) {
    const errorMetric: ErrorMetric = {
      name,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
      metadata,
    };

    this.errors.push(errorMetric);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    this.logger.error(`Error in ${name}: ${error.message}`, error.stack);
  }

  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.trackPerformance(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.trackPerformance(name, duration, { ...metadata, failed: true });
      this.trackError(name, error as Error, metadata);
      throw error;
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getErrors(name?: string): ErrorMetric[] {
    if (name) {
      return this.errors.filter(e => e.name === name);
    }
    return [...this.errors];
  }

  getStats(name: string) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: metrics.length,
      avg: Math.round(avg),
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50,
      p95,
      p99,
    };
  }

  clear() {
    this.metrics = [];
    this.errors = [];
  }
}
