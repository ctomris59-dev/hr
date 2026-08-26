/**
 * API Client with Error Tracking and Performance Measurement
 */
import ErrorTracker from "./errorTracking";
import PerformanceTracker from "./performance";

interface ApiOptions extends RequestInit {
  timeout?: number;
  trackPerformance?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
  }

  /**
   * Make API request with error tracking and performance measurement
   */
  async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const {
      timeout = 30000,
      trackPerformance = true,
      ...fetchOptions
    } = options;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await (trackPerformance
        ? PerformanceTracker.measure(`API: ${endpoint}`, async () => {
            return fetch(url, {
              ...fetchOptions,
              signal: controller.signal,
            });
          })
        : fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          }));

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Track API error
        const errorData = await response.json().catch(() => ({}));
        ErrorTracker.trackAPIError(
          endpoint,
          response.status,
          errorData,
          fetchOptions.body
        );
        
        // DEVELOPMENT MODE: Don't redirect on 401/403, just log warning
        const isDevelopment = process.env.NODE_ENV === "development";
        if (isDevelopment && (response.status === 401 || response.status === 403)) {
          console.warn(`[DEV] Auth error on ${endpoint}:`, errorData);
          // In development, still throw but don't redirect
        }
        
        throw new Error(
          errorData.error || `API Error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Track network error
      if (error.name === "AbortError") {
        ErrorTracker.trackNetworkError(
          endpoint,
          new Error("Request timeout")
        );
        throw new Error("Request timeout");
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        ErrorTracker.trackNetworkError(endpoint, error);
        throw new Error("Network error");
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient;

