/**
 * Error Tracking Utility
 * MVP: Console logging
 * Enterprise: Sentry integration
 */

interface ErrorContext {
  [key: string]: any;
}

class ErrorTracker {
  /**
   * Track an error with context
   */
  static trackError(error: Error, context?: ErrorContext): void {
    // MVP: Console logging
    console.error("[ErrorTracker] Error:", error, context);

    // Enterprise: Sentry integration
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: context,
      });
    }
  }

  /**
   * Track API error
   */
  static trackAPIError(
    url: string,
    status: number,
    response?: any,
    requestData?: any
  ): void {
    const error = new Error(`API Error: ${status} - ${url}`);
    this.trackError(error, {
      url,
      status,
      response,
      requestData,
      errorType: "API_ERROR",
    });
  }

  /**
   * Track network error
   */
  static trackNetworkError(url: string, error: Error): void {
    this.trackError(error, {
      url,
      errorType: "NETWORK_ERROR",
    });
  }

  /**
   * Track validation error
   */
  static trackValidationError(
    field: string,
    value: any,
    message: string
  ): void {
    const error = new Error(`Validation Error: ${message}`);
    this.trackError(error, {
      field,
      value,
      message,
      errorType: "VALIDATION_ERROR",
    });
  }
}

export default ErrorTracker;

