/**
 * API Configuration
 * Centralized configuration for API client
 * 
 * API endpoint is configured via NEXT_PUBLIC_API_BASE environment variable.
 * Set it in .env.local file (see .env.local.example for template)
 */

export const API_CONFIG = {
  // API base URL - can be overridden via NEXT_PUBLIC_API_BASE in .env.local
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'https://devapi.wedesignz.com',
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

