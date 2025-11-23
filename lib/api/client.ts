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
   * Get authentication token synchronously from localStorage (Zustand persist)
   */
  private getAuthTokenSync(): string | null {
    if (!isBrowser) return null;
    
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const state = parsed?.state;
        if (state?.accessToken) {
          return state.accessToken;
        }
      }
    } catch (error) {
      // Silently fail - will fallback to async method
    }
    
    return null;
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      ...API_CONFIG.headers,
    };

    if (isBrowser) {
      // First try synchronous method for immediate access (Zustand persist stores in localStorage)
      const syncToken = this.getAuthTokenSync();
      if (syncToken) {
        headers['Authorization'] = `Bearer ${syncToken}`;
        // Only log in development mode
        if (process.env.NODE_ENV === 'development' && false) { // Set to true for debugging
          console.log('[apiClient] Token found (sync):', syncToken.substring(0, 20) + '...');
        }
        return headers;
      }

      // Fallback to async store access
      try {
        // Dynamically import to avoid SSR issues
        const { useAuthStore } = await import('@/store/authStore');
        const state = useAuthStore.getState();
        if (state.accessToken) {
          headers['Authorization'] = `Bearer ${state.accessToken}`;
          // Only log in development mode
          if (process.env.NODE_ENV === 'development' && false) { // Set to true for debugging
            console.log('[apiClient] Token found (async):', state.accessToken.substring(0, 20) + '...');
          }
        } else {
          // No token found - this is expected for public endpoints like login/2FA
          // Don't log warning here as we can't determine if endpoint is public
        }
      } catch (error) {
        console.error('[apiClient] Error getting auth headers:', error);
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
        credentials: 'include', // Include credentials for CORS
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
      const newRefreshToken = data.refresh || data.refresh_token;

      if (newAccessToken) {
        // Update store with new access token and refresh token (if provided)
        // If refresh token is rotated, use the new one; otherwise keep the old one
        state.setTokens(newAccessToken, newRefreshToken || state.refreshToken);
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
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      // Merge headers - ensure Authorization is always included if available
      // Use Headers object to ensure proper header handling
      const mergedHeaders = new Headers();
      
      // Add default headers first
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          mergedHeaders.set(key, value as string);
        }
      });
      
      // Add/override with options headers
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            mergedHeaders.set(key, value);
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([key, value]) => {
            mergedHeaders.set(key, value);
          });
        } else {
          Object.entries(options.headers).forEach(([key, value]) => {
            if (value) {
              mergedHeaders.set(key, value as string);
            }
          });
        }
      }

      // Only log in development mode for debugging
      if (process.env.NODE_ENV === 'development' && false) { // Set to true for debugging
        const authHeader = mergedHeaders.get('Authorization');
        console.log(`[apiClient.request] ${options.method || 'GET'} ${endpoint}`, {
          hasAuthHeader: !!authHeader,
          authHeaderPreview: authHeader ? authHeader.substring(0, 30) + '...' : 'none',
          allHeaders: Array.from(mergedHeaders.keys())
        });
      }

      // Build fetch options - ensure headers are set correctly
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        signal: controller.signal,
        credentials: 'include', // CRITICAL: Include credentials for CORS requests
        headers: mergedHeaders, // Headers object is compatible with fetch
      };
      
      // Only include body if it exists
      if (options.body !== undefined) {
        fetchOptions.body = options.body;
      }
      
      // Don't spread options to avoid overriding our carefully set headers
      // Only copy non-conflicting properties
      if (options.cache !== undefined) fetchOptions.cache = options.cache;
      if (options.redirect !== undefined) fetchOptions.redirect = options.redirect;
      if (options.referrer !== undefined) fetchOptions.referrer = options.referrer;
      if (options.referrerPolicy !== undefined) fetchOptions.referrerPolicy = options.referrerPolicy;
      if (options.integrity !== undefined) fetchOptions.integrity = options.integrity;
      if (options.keepalive !== undefined) fetchOptions.keepalive = options.keepalive;
      if (options.mode !== undefined) fetchOptions.mode = options.mode;

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOn401) {
        const newToken = await this.refreshToken();
        if (newToken) {
          // Create new abort controller for retry (don't reuse the aborted one)
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => {
            retryController.abort();
          }, timeout);

          // Retry request with new token - use Headers object
          const retryHeaders = new Headers();
          
          // Add original headers
          Object.entries(headers).forEach(([key, value]) => {
            if (value) {
              retryHeaders.set(key, value as string);
            }
          });
          
          // Override with new token
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          
          // Add/override with options headers
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                retryHeaders.set(key, value);
              });
            } else if (Array.isArray(options.headers)) {
              options.headers.forEach(([key, value]) => {
                retryHeaders.set(key, value);
              });
            } else {
              Object.entries(options.headers).forEach(([key, value]) => {
                if (value) {
                  retryHeaders.set(key, value as string);
                }
              });
            }
          }

          // Build retry fetch options with proper headers
          const retryFetchOptions: RequestInit = {
            method: options.method || 'GET',
            signal: retryController.signal,
            credentials: 'include',
            headers: retryHeaders,
          };
          
          if (options.body !== undefined) {
            retryFetchOptions.body = options.body;
          }
          
          // Copy other non-conflicting options
          if (options.cache !== undefined) retryFetchOptions.cache = options.cache;
          if (options.redirect !== undefined) retryFetchOptions.redirect = options.redirect;
          if (options.referrer !== undefined) retryFetchOptions.referrer = options.referrer;
          if (options.referrerPolicy !== undefined) retryFetchOptions.referrerPolicy = options.referrerPolicy;
          if (options.integrity !== undefined) retryFetchOptions.integrity = options.integrity;
          if (options.keepalive !== undefined) retryFetchOptions.keepalive = options.keepalive;
          if (options.mode !== undefined) retryFetchOptions.mode = options.mode;

          const retryResponse = await fetch(url, retryFetchOptions);

          clearTimeout(retryTimeoutId);

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
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please try again.',
        };
        }
        // Handle network errors (including canceled requests)
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            success: false,
            error: 'Network error. Please check your connection and try again.',
          };
        }
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
      
      // Handle validation errors from details field (Django REST Framework format)
      const errorDetails = data.details || data;
      const fieldErrors: string[] = [];
      
      // Collect all field-level errors
      if (errorDetails && typeof errorDetails === 'object') {
        Object.keys(errorDetails).forEach((key) => {
          const value = errorDetails[key];
          if (Array.isArray(value)) {
            // Handle array of errors
            value.forEach((error: string) => {
              if (key === 'non_field_errors') {
                // Make error messages more user-friendly
                let friendlyError = error;
                // Handle unique constraint errors
                if (error.includes('must make a unique set')) {
                  friendlyError = 'A plan with this name and duration already exists. Please choose a different combination.';
                } else if (error.includes('already exists')) {
                  friendlyError = error.replace(/already exists/i, 'already exists. Please choose a different value.');
                }
                fieldErrors.push(friendlyError);
              } else {
                // Format field errors: "Field name: error message"
                const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                fieldErrors.push(`${fieldName}: ${error}`);
              }
            });
          } else if (typeof value === 'string') {
            // Handle single string error
            if (key === 'non_field_errors') {
              // Make error messages more user-friendly
              let friendlyError = value;
              // Handle unique constraint errors
              if (value.includes('must make a unique set')) {
                friendlyError = 'A plan with this name and duration already exists. Please choose a different combination.';
              } else if (value.includes('already exists')) {
                friendlyError = value.replace(/already exists/i, 'already exists. Please choose a different value.');
              }
              fieldErrors.push(friendlyError);
            } else {
              const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              fieldErrors.push(`${fieldName}: ${value}`);
            }
          }
        });
      }
      
      // If we found field errors, return them
      if (fieldErrors.length > 0) {
        return {
          error: fieldErrors.join('. ') || 'Validation error',
          message: fieldErrors.join('. ') || 'Validation error',
          detail: data.detail || data.error,
          errors: errorDetails,
        };
      }
      
      // Fallback to standard error fields
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
    // Only log in development mode for debugging
    if (process.env.NODE_ENV === 'development' && false) { // Set to true for debugging
      const token = this.getAuthTokenSync();
      console.log(`[apiClient.post] ${endpoint}`, { 
        hasToken: !!token, 
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none' 
      });
    }
    
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
      // Make the raw request to get the unprocessed response
      const url = getApiUrl(fullEndpoint);
      const headers = await this.getAuthHeaders();
      
      const fetchResponse = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!fetchResponse.ok) {
        const error = await this.parseErrorResponse(fetchResponse);
        return {
          success: false,
          error: error.error || error.message || `HTTP ${fetchResponse.status}`,
        } as ApiResponse<PaginatedResponse<T>>;
      }

      // Parse the raw JSON response
      const rawData = await fetchResponse.json();
      console.log('[getPaginated] Raw backend response:', rawData);

      // Handle custom backend format: { message, data: [...], pagination: {...} }
      if (rawData.data && rawData.pagination) {
        return {
          success: true,
          data: {
            data: Array.isArray(rawData.data) ? rawData.data as T[] : [],
            pagination: {
              page: rawData.pagination.page || page,
              limit: rawData.pagination.page_size || rawData.pagination.limit || limit,
              total: rawData.pagination.total_count || rawData.pagination.total || 0,
              totalPages: rawData.pagination.total_pages || Math.ceil((rawData.pagination.total_count || rawData.pagination.total || 0) / (rawData.pagination.page_size || rawData.pagination.limit || limit)),
            },
          },
        };
      }

      // Handle Django REST Framework format: { count, next, previous, results }
      if (rawData.results && typeof rawData.count === 'number') {
        return {
          success: true,
          data: {
            data: rawData.results as T[],
            pagination: {
              page,
              limit,
              total: rawData.count,
              totalPages: Math.ceil(rawData.count / limit),
            },
          },
        };
      }

      // Fallback: assume the data itself is the array
      return {
        success: true,
        data: {
          data: Array.isArray(rawData) ? rawData as T[] : [],
          pagination: {
            page,
            limit,
            total: Array.isArray(rawData) ? rawData.length : 0,
            totalPages: Math.ceil((Array.isArray(rawData) ? rawData.length : 0) / limit),
          },
        },
      };

      // Handle Django REST Framework format: { count, next, previous, results }
      if (rawData.results && typeof rawData.count === 'number') {
        return {
          success: true,
          data: {
            data: rawData.results as T[],
            pagination: {
              page,
              limit,
              total: rawData.count,
              totalPages: Math.ceil(rawData.count / limit),
            },
          },
        };
      }

      // Fallback: assume the data itself is the array
      return {
        success: true,
        data: {
          data: Array.isArray(rawData) ? rawData as T[] : [],
          pagination: {
            page,
            limit,
            total: Array.isArray(rawData) ? rawData.length : 0,
            totalPages: Math.ceil((Array.isArray(rawData) ? rawData.length : 0) / limit),
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
        credentials: 'include', // Include credentials for CORS
        headers,
        body: formData,
      });

      if (response.status === 401) {
        const newToken = await this.refreshToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            method: 'POST',
            credentials: 'include', // Include credentials for CORS
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

