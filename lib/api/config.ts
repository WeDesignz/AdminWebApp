/**
 * API Configuration
 * Centralized configuration for API client
 */

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000',
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

