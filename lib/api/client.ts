import { getApiUrl, API_CONFIG, isBrowser } from './config';
import { transformResponse, transformPaginatedResponse, type ApiResponse, type PaginatedResponse, type ApiError } from './types';

/**
 * API Client
 * Centralized API client with authentication, error handling, and token refresh
 */

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      ...API_CONFIG.headers,
    };

    if (isBrowser) {
      // Dynamically import to avoid SSR issues
      const { useAuthStore } = await import('@/store/authStore');
      const state = useAuthStore.getState();
      if (state.accessToken) {
        headers['Authorization'] = `Bearer ${state.accessToken}`;
      }
    }

    return headers;
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh request
   */
  private async performTokenRefresh(): Promise<string | null> {
    if (!isBrowser) return null;
    
    const { useAuthStore } = await import('@/store/authStore');
    const state = useAuthStore.getState();
    if (!state.refreshToken) {
      // No refresh token, logout user
      state.logout();
      window.location.href = '/login';
      return null;
    }

    try {
      const response = await fetch(getApiUrl('api/coreadmin/token/refresh/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: state.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newAccessToken = data.access || data.access_token;

      if (newAccessToken) {
        // Update store with new access token
        state.setTokens(newAccessToken, state.refreshToken);
        return newAccessToken;
      }

      return null;
    } catch (error) {
      // Refresh failed, logout user
      state.logout();
      window.location.href = '/login';
      return null;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown, response?: Response): ApiError {
    if (error instanceof Error) {
      return {
        error: error.message,
        message: error.message,
      };
    }

    if (response) {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: response.statusText,
      };
    }

    return {
      error: 'An unknown error occurred',
      message: 'An unknown error occurred',
    };
  }

  /**
   * Make API request with automatic retry on 401
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOn401) {
        const newToken = await this.refreshToken();
        if (newToken) {
          // Retry request with new token
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...retryHeaders,
              ...(options.headers || {}),
            },
          });

          if (!retryResponse.ok) {
            const error = await this.parseErrorResponse(retryResponse);
            return {
              success: false,
              error: error.error || error.message || 'Request failed',
            };
          }

          const data = await retryResponse.json();
          return transformResponse<T>(data);
        } else {
          return {
            success: false,
            error: 'Authentication failed. Please login again.',
          };
        }
      }

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        return {
          success: false,
          error: error.error || error.message || error.detail || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return transformResponse<T>(data);
    } catch (error) {
      const apiError = this.handleError(error);
      return {
        success: false,
        error: apiError.error || apiError.message || 'Network error occurred',
      };
    }
  }

  /**
   * Parse error response from backend
   */
  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return {
        error: data.error || data.message || data.detail,
        message: data.message,
        detail: data.detail,
        errors: data.errors,
      };
    } catch {
      return {
        error: response.statusText,
        message: response.statusText,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.request<T>(url, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * GET request with pagination support
   */
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    params?: Record<string, string | number | boolean>
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    const allParams = {
      page,
      limit,
      ...params,
    };

    const url = endpoint;
    const searchParams = new URLSearchParams();
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const fullUrl = `${url}?${searchParams.toString()}`;

    try {
      const response = await this.get<{ count: number; next: string | null; previous: string | null; results: T[] }>(
        fullUrl
      );

      if (!response.success || !response.data) {
        return response as ApiResponse<PaginatedResponse<T>>;
      }

      return {
        success: true,
        data: {
          data: response.data.results,
          pagination: {
            page,
            limit,
            total: response.data.count,
            totalPages: Math.ceil(response.data.count / limit),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch paginated data',
      };
    }
  }

  /**
   * Upload file(s) using FormData
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    const headers: HeadersInit = {};

    if (isBrowser) {
      const { useAuthStore } = await import('@/store/authStore');
      const state = useAuthStore.getState();
      if (state.accessToken) {
        headers['Authorization'] = `Bearer ${state.accessToken}`;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        const newToken = await this.refreshToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!retryResponse.ok) {
            const error = await this.parseErrorResponse(retryResponse);
            return {
              success: false,
              error: error.error || error.message || 'Upload failed',
            };
          }

          const data = await retryResponse.json();
          return transformResponse<T>(data);
        } else {
          return {
            success: false,
            error: 'Authentication failed. Please login again.',
          };
        }
      }

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        return {
          success: false,
          error: error.error || error.message || error.detail || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return transformResponse<T>(data);
    } catch (error) {
      const apiError = this.handleError(error);
      return {
        success: false,
        error: apiError.error || apiError.message || 'Upload failed',
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

