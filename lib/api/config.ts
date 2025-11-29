/**
 * API Configuration
 * Centralized configuration for API client
 * 
 * API endpoint must be configured via NEXT_PUBLIC_API_BASE_URL environment variable in .env.local
 * 
 * Examples:
 * - Development: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
 * - Production: NEXT_PUBLIC_API_BASE_URL=https://devapi.wedesignz.com
 */

// API base URL - must be set in .env.local
// During build time, we allow it to be undefined to prevent build failures
// The actual API calls will fail gracefully if not set at runtime
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Only throw error at runtime (in browser), not during build
if (typeof window !== 'undefined' && !API_BASE_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is not set. Please configure it in .env.local file.\n' +
    'Example: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000'
  );
}

export const API_CONFIG = {
  // API base URL - from environment variable
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * Get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  // If baseURL is not set (e.g., during build), return a placeholder
  // This prevents build failures while still allowing runtime errors
  if (!API_CONFIG.baseURL) {
    return '/api/placeholder';
  }
  
  // Ensure endpoint is a string
  if (typeof endpoint !== 'string') {
    console.error('getApiUrl: endpoint must be a string, got:', typeof endpoint, endpoint);
    throw new Error(`Invalid endpoint type: expected string, got ${typeof endpoint}`);
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.baseURL}/${cleanEndpoint}`;
}

/**
 * Check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

