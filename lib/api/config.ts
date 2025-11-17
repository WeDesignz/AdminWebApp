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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
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
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.baseURL}/${cleanEndpoint}`;
}

/**
 * Check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

