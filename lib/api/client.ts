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
      try {
        // Dynamically import to avoid SSR issues
        const { useAuthStore } = await import('@/store/authStore');
        const state = useAuthStore.getState();
        if (state.accessToken) {
          headers['Authorization'] = `Bearer ${state.accessToken}`;
        }
        // Don't warn if no token - this is normal during login/2FA flow
      } catch (error) {
        console.error('Error getting auth headers:', error);
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
   * Make API request with automatic retry on 401 and timeout handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true,
    timeout = 30000 // 30 seconds default timeout
  ): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    const headers = await this.getAuthHeaders();

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

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
            signal: controller.signal, // Use same signal for timeout
            headers: {
              ...retryHeaders,
              ...(options.headers || {}),
            },
          });

          if (!retryResponse.ok) {
            const error = await this.parseErrorResponse(retryResponse);
            // If still 401 after refresh, logout and redirect
            if (retryResponse.status === 401) {
              if (isBrowser) {
                const { useAuthStore } = await import('@/store/authStore');
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }
            }
            return {
              success: false,
              error: error.error || error.message || 'Request failed',
            };
          }

          // Handle retry response body
          const contentType = retryResponse.headers.get('content-type');
          let retryData;
          
          if (contentType && contentType.includes('application/json')) {
            try {
              const text = await retryResponse.text();
              if (text.trim()) {
                retryData = JSON.parse(text);
              } else {
                retryData = { message: 'Success', detail: 'Success' };
              }
            } catch (parseError) {
              retryData = { message: 'Success', detail: 'Success' };
            }
          } else {
            retryData = { message: 'Success', detail: 'Success' };
          }
          
          return transformResponse<T>(retryData);
        } else {
          // Token refresh failed, logout and redirect
          if (isBrowser) {
            const { useAuthStore } = await import('@/store/authStore');
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
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

      // Handle response body - check if it's empty or non-JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text();
          if (text.trim()) {
            data = JSON.parse(text);
          } else {
            // Empty JSON body, create success response
            data = { message: 'Success', detail: 'Success' };
          }
        } catch (parseError) {
          // If JSON parsing fails, treat as success with default message
          data = { message: 'Success', detail: 'Success' };
        }
      } else {
        // Non-JSON response or no content-type, create success response
        data = { message: 'Success', detail: 'Success' };
      }
      
      return transformResponse<T>(data);
    } catch (error) {
      // Handle timeout and abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please try again.',
        };
      }
      
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
      
      // Handle Django REST Framework serializer errors (field-level errors)
      if (data.email || data.password || data.non_field_errors) {
        const fieldErrors: string[] = [];
        if (data.email) {
          fieldErrors.push(Array.isArray(data.email) ? data.email.join(', ') : data.email);
        }
        if (data.password) {
          fieldErrors.push(Array.isArray(data.password) ? data.password.join(', ') : data.password);
        }
        if (data.non_field_errors) {
          fieldErrors.push(Array.isArray(data.non_field_errors) ? data.non_field_errors.join(', ') : data.non_field_errors);
        }
        return {
          error: fieldErrors.join(' ') || 'Validation error',
          message: fieldErrors.join(' ') || 'Validation error',
          detail: data,
          errors: data,
        };
      }
      
      return {
        error: data.error || data.message || data.detail || 'Request failed',
        message: data.message || data.detail || 'Request failed',
        detail: data.detail,
        errors: data.errors || data,
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
      headers: {
        'Content-Type': 'application/json',
      },
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
   * Handles both Django REST Framework format and custom backend format
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

    // Build query string
    const searchParams = new URLSearchParams();
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    try {
      // Use request method directly to ensure auth headers are included
      const response = await this.request<any>(fullEndpoint, {
        method: 'GET',
      });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch paginated data',
        } as ApiResponse<PaginatedResponse<T>>;
      }

      // Handle custom backend format: { message, data, pagination }
      if (response.data.data && response.data.pagination) {
        return {
          success: true,
          data: {
            data: response.data.data as T[],
            pagination: {
              page: response.data.pagination.page || page,
              limit: response.data.pagination.page_size || response.data.pagination.limit || limit,
              total: response.data.pagination.total_count || response.data.pagination.total || 0,
              totalPages: response.data.pagination.total_pages || Math.ceil((response.data.pagination.total_count || response.data.pagination.total || 0) / (response.data.pagination.page_size || response.data.pagination.limit || limit)),
            },
          },
        };
      }

      // Handle Django REST Framework format: { count, next, previous, results }
      if (response.data.results && typeof response.data.count === 'number') {
        return {
          success: true,
          data: {
            data: response.data.results as T[],
            pagination: {
              page,
              limit,
              total: response.data.count,
              totalPages: Math.ceil(response.data.count / limit),
            },
          },
        };
      }

      // Fallback: assume the data itself is the array
      return {
        success: true,
        data: {
          data: Array.isArray(response.data) ? response.data as T[] : [],
          pagination: {
            page,
            limit,
            total: Array.isArray(response.data) ? response.data.length : 0,
            totalPages: Math.ceil((Array.isArray(response.data) ? response.data.length : 0) / limit),
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

