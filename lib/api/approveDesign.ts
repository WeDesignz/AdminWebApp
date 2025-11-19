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
  
  // Log for debugging - verify header is set
  console.log('[approveDesign] Starting request:', {
    url,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    authorizationHeader: headers['Authorization'] ? headers['Authorization'].substring(0, 30) + '...' : 'MISSING!',
    allHeaders: Object.keys(headers),
    headerValues: Object.keys(headers).map(k => `${k}: ${headers[k]?.substring(0, 30)}...`),
  });

  // Verify Authorization header is set before making request
  if (!headers['Authorization']) {
    console.error('[approveDesign] CRITICAL: Authorization header is missing!');
    return {
      success: false,
      error: 'Authorization header could not be set. Please login again.',
    };
  }

  // Create AbortController for timeout (10 seconds - fast timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[approveDesign] Request timeout after 10 seconds');
    controller.abort();
  }, 10000); // 10 seconds timeout

  try {
    // CRITICAL: Verify headers one more time before sending
    if (!headers['Authorization']) {
      console.error('[approveDesign] CRITICAL ERROR: Authorization header missing before fetch!');
      return {
        success: false,
        error: 'Authorization header is missing. Please login again.',
      };
    }

    // Log the exact fetch options being sent
    const fetchOptions = {
      method: 'POST',
      headers: headers,
      credentials: 'include' as RequestCredentials,
      body: JSON.stringify(payload),
      signal: controller.signal,
    };
    
    console.log('[approveDesign] Fetch options:', {
      method: fetchOptions.method,
      url: url,
      hasHeaders: !!fetchOptions.headers,
      headerKeys: Object.keys(fetchOptions.headers as Record<string, string>),
      hasAuth: !!(fetchOptions.headers as Record<string, string>)['Authorization'],
      authPreview: (fetchOptions.headers as Record<string, string>)['Authorization']?.substring(0, 30) + '...',
      hasBody: !!fetchOptions.body,
      hasSignal: !!fetchOptions.signal,
    });

    // Make the fetch request
    const response = await fetch(url, fetchOptions);

    // Clear timeout since we got a response
    clearTimeout(timeoutId);

    // Log response
    console.log('[approveDesign] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

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

      console.error('[approveDesign] API error:', {
        status: response.status,
        error: errorMessage,
      });

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
        console.log('[approveDesign] Success with data:', data);
        return {
          success: true,
          data: data,
        };
      }
    } catch {
      // Empty response is fine for approve action
    }

    console.log('[approveDesign] Success (empty response)');
    return {
      success: true,
    };
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[approveDesign] Request aborted (timeout)');
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }

    // Handle network errors
    console.error('[approveDesign] Network error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}
