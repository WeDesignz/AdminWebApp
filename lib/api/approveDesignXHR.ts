/**
 * Alternative approve design function using XMLHttpRequest
 * This is a fallback if fetch is having issues with headers
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
    console.error('[approveDesignXHR] Error reading token:', error);
  }
  
  return null;
}

/**
 * Approve a design using XMLHttpRequest (more reliable for headers)
 */
export async function approveDesignXHR(designId: string): Promise<ApiResponse<void>> {
  // Get token first
  const token = getTokenFromStorage();
  
  if (!token) {
    console.error('[approveDesignXHR] No token found in localStorage');
    return {
      success: false,
      error: 'Authentication token not found. Please login again.',
    };
  }

  // Build URL
  const url = getApiUrl(`api/coreadmin/designs/${designId}/action/`);
  
  // Build payload
  const payload = { action: 'approve' };
  
  console.log('[approveDesignXHR] Starting request:', {
    url,
    hasToken: !!token,
    tokenPreview: token.substring(0, 20) + '...',
  });

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    
    // Set timeout
    xhr.timeout = 10000; // 10 seconds
    
    // Handle timeout
    xhr.ontimeout = () => {
      console.error('[approveDesignXHR] Request timeout');
      resolve({
        success: false,
        error: 'Request timed out. Please try again.',
      });
    };
    
    // Handle errors
    xhr.onerror = () => {
      console.error('[approveDesignXHR] Network error');
      resolve({
        success: false,
        error: 'Network error occurred',
      });
    };
    
    // Handle success
    xhr.onload = () => {
      console.log('[approveDesignXHR] Response received:', {
        status: xhr.status,
        statusText: xhr.statusText,
      });
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const text = xhr.responseText;
          if (text.trim()) {
            const data = JSON.parse(text);
            console.log('[approveDesignXHR] Success with data:', data);
            resolve({
              success: true,
              data: data,
            });
          } else {
            console.log('[approveDesignXHR] Success (empty response)');
            resolve({
              success: true,
            });
          }
        } catch (error) {
          // Empty response is fine
          resolve({
            success: true,
          });
        }
      } else {
        let errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
        } catch {
          // Use default error message
        }
        
        console.error('[approveDesignXHR] API error:', {
          status: xhr.status,
          error: errorMessage,
        });
        
        resolve({
          success: false,
          error: errorMessage,
        });
      }
    };
    
    // Open request
    xhr.open('POST', url, true);
    
    // Set headers - XMLHttpRequest is more reliable for custom headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    // Set withCredentials for CORS
    xhr.withCredentials = true;
    
    // Log headers being set
    console.log('[approveDesignXHR] Headers set:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.substring(0, 20)}...`,
    });
    
    // Send request
    xhr.send(JSON.stringify(payload));
  });
}

