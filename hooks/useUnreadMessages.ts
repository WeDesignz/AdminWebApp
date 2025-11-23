import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useEffect, useState } from 'react';

const STORAGE_KEY_PREFIX = 'order_last_viewed_';

/**
 * Get the last viewed timestamp for an order from localStorage
 */
export function getLastViewedTimestamp(orderId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${orderId}`);
}

/**
 * Set the last viewed timestamp for an order in localStorage
 */
export function setLastViewedTimestamp(orderId: string, timestamp: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${orderId}`, timestamp);
}

/**
 * Clear the last viewed timestamp for an order
 */
export function clearLastViewedTimestamp(orderId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${orderId}`);
}

/**
 * Hook to get unread message count for an order
 */
export function useUnreadMessages(orderId: string | null, currentUserId?: string | number) {
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: commentsData } = useQuery({
    queryKey: ['orderComments', orderId, 'unread'],
    queryFn: async () => {
      if (!orderId) return null;
      const response = await API.orderComments.getOrderComments(orderId);
      if (!response.success || !response.data) {
        return null;
      }
      return response.data;
    },
    enabled: !!orderId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10 * 1000, // 10 seconds
  });

  useEffect(() => {
    if (!orderId || !commentsData?.comments) {
      setUnreadCount(0);
      return;
    }

    // For admin: count unread customer messages (messages from customers that haven't been read)
    // Use the is_read field from the API response
    const unreadMessages = commentsData.comments.filter((comment: any) => {
      // Count customer messages that haven't been read
      const isUnread = comment.comment_type === 'customer' && !comment.is_read;
      return isUnread;
    });

    const count = unreadMessages.length;
    setUnreadCount(count);
  }, [orderId, commentsData, currentUserId]);

  return unreadCount;
}

