'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getApiUrl } from '../api/config';

/**
 * Hook to proactively refresh access tokens before they expire
 * Checks token expiration every 2 minutes and refreshes if needed
 */
export function useTokenRefresh() {
  const { setTokens } = useAuthStore();
  const isRefreshingRef = useRef(false); // Prevent concurrent refresh attempts
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      try {
        // Get fresh tokens from store (don't rely on closure)
        const state = useAuthStore.getState();
        const currentAccessToken = state.accessToken;
        const currentRefreshToken = state.refreshToken;

        if (!currentAccessToken || !currentRefreshToken) {
          // Clear interval if tokens are missing
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Decode JWT to check expiration
        const tokenParts = currentAccessToken.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            
            // If token expires in less than 5 minutes, refresh it proactively
            if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
              isRefreshingRef.current = true;
              
              try {
                const response = await fetch(getApiUrl('api/coreadmin/token/refresh/'), {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    refresh: currentRefreshToken,
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  const newAccessToken = data.access || data.access_token;
                  const newRefreshToken = data.refresh || data.refresh_token;

                  if (newAccessToken) {
                    // Update store with new tokens
                    state.setTokens(newAccessToken, newRefreshToken || currentRefreshToken);
                  }
                } else {
                  // Silently fail - let normal 401 handling deal with it
                  // Don't log to reduce console noise
                }
              } catch (error) {
                // Don't log errors - let normal flow handle it
              } finally {
                isRefreshingRef.current = false;
              }
            }
          } catch (parseError) {
            // If we can't parse the token, it might be malformed
            // Don't do anything, let the normal 401 handling deal with it
          }
        }
      } catch (error) {
        // Don't log errors - let normal flow handle it
      }
    };

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check every 2 minutes
    intervalRef.current = setInterval(checkAndRefreshToken, 2 * 60 * 1000);
    
    // Initial check after 1 second
    const initialTimeout = setTimeout(checkAndRefreshToken, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearTimeout(initialTimeout);
    };
  }, []); // Empty dependency array - only run once on mount
}

