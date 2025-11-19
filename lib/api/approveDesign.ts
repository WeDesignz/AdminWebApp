/**
 * Direct approve design function - completely rewritten from scratch
 * This is a minimal, reliable implementation that ensures headers are sent correctly
 */

import { getApiUrl } from './config';
import type { ApiResponse } from './types';

/**
 * Get authentication token synchronously from localStorage
 */
function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    
    const parsed = JSON.parse(authStorage);
    const state = parsed?.state;
    
    if (state?.accessToken && typeof state.accessToken === 'string') {
      return state.accessToken;
    }
  } catch (error) {
    console.error('[approveDesign] Error reading token:', error);
  }
  
  return null;
}

/**
 * Approve a design - completely rewritten from scratch
 */
export async function approveDesignDirect(designId: string): Promise<ApiResponse<void>> {
  // Get token first
  const token = getTokenFromStorage();
  
  if (!token) {
    console.error('[approveDesign] No token found in localStorage');
    return {
      success: false,
      error: 'Authentication token not found. Please login again.',
    };
  }

  // Build URL
  const url = getApiUrl(`api/coreadmin/designs/${designId}/action/`);
  
  // Build payload
  const payload = { action: 'approve' };
  
  // Create headers as plain object - ensure Authorization is explicitly set
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Explicitly set Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Verify Authorization header is set before making request
  if (!headers['Authorization']) {
    return {
      success: false,
      error: 'Authorization header could not be set. Please login again.',
    };
  }

  // Create AbortController for timeout (10 seconds - fast timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 seconds timeout

  try {
    // Verify headers one more time before sending
    if (!headers['Authorization']) {
      return {
        success: false,
        error: 'Authorization header is missing. Please login again.',
      };
    }

    // Make the fetch request
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      credentials: 'include' as RequestCredentials,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Clear timeout since we got a response
    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
      } catch {
        // If response is not JSON, try text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          // Use default error message
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Handle successful response
    // Try to parse JSON, but empty response is also OK
    try {
      const text = await response.text();
      if (text.trim()) {
        const data = JSON.parse(text);
        return {
          success: true,
          data: data,
        };
      }
    } catch {
      // Empty response is fine for approve action
    }

    return {
      success: true,
    };
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }

    // Handle network errors
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}
