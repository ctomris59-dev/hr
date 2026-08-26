/**
 * Performance Measurement Utility
 * MVP: Console logging
 * Enterprise: Analytics integration
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceTracker {
  private static metrics: PerformanceMetric[] = [];

  /**
   * Measure async operation duration
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, true);
      throw error;
    }
  }

  /**
   * Measure sync operation duration
   */
  static measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, true);
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  private static recordMetric(
    name: string,
    duration: number,
    isError: boolean = false
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    // MVP: Console logging
    const level = duration > 1000 ? "warn" : "log";
    const emoji = isError ? "❌" : duration > 1000 ? "⚠️" : "✅";
    console[level](
      `${emoji} [Performance] ${name}: ${duration.toFixed(2)}ms`
    );

    // Store metric
    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Enterprise: Send to analytics if slow
    if (duration > 1000 && typeof window !== "undefined") {
      // Send to analytics service
      this.sendToAnalytics(metric);
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric
   */
  static getAverageDuration(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get slow operations (> threshold)
   */
  static getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
    return this.metrics.filter((m) => m.duration > thresholdMs);
  }

  /**
   * Send metric to analytics (Enterprise)
   */
  private static sendToAnalytics(metric: PerformanceMetric): void {
    // MVP: No-op
    // Enterprise: Send to analytics service
    if (typeof window !== "undefined" && (window as any).analytics) {
      (window as any).analytics.track("slow_operation", {
        name: metric.name,
        duration: metric.duration,
      });
    }
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics = [];
  }
}

export default PerformanceTracker;

