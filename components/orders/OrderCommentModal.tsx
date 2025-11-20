'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

interface OrderComment {
  id: string;
  message: string;
  comment_type: 'customer' | 'admin' | 'system';
  created_by: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  is_admin_response?: boolean;
  media?: any[];
  media_count?: number;
}

interface OrderCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTitle: string;
  orderType: 'cart' | 'subscription' | 'custom';
}

export function OrderCommentModal({ isOpen, onClose, orderId, orderTitle, orderType }: OrderCommentModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: commentsData, isLoading, error } = useQuery({
    queryKey: ['orderComments', orderId],
    queryFn: () => {
      console.log('[OrderCommentModal] Fetching comments for orderId:', orderId);
      return API.orderComments.getOrderComments(orderId);
    },
    enabled: isOpen && !!orderId,
  });
  
  useEffect(() => {
    if (isOpen && orderId) {
      console.log('[OrderCommentModal] Modal opened with orderId:', orderId, 'orderTitle:', orderTitle);
    }
  }, [isOpen, orderId, orderTitle]);

  const addCommentMutation = useMutation({
    mutationFn: (message: string) => API.orderComments.addOrderComment(orderId, message, false),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['orderComments', orderId] });
      toast.success('Comment added successfully!');
    },
    onError: (err: any) => {
      toast.error(`Failed to add comment: ${err.message || 'Unknown error'}`);
    },
  });

  useEffect(() => {
    if (isOpen && commentsData?.data?.comments) {
      scrollToBottom();
    }
  }, [isOpen, commentsData]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && orderId) {
      addCommentMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSenderName = (comment: OrderComment) => {
    if (comment.comment_type === 'admin') {
      return 'You';
    }
    if (comment.created_by?.first_name && comment.created_by?.last_name) {
      return `${comment.created_by.first_name} ${comment.created_by.last_name}`;
    }
    return comment.created_by?.name || comment.created_by?.username || 'Customer';
  };

  const comments = commentsData?.data?.comments || [];
  
  // Debug logging
  useEffect(() => {
    if (commentsData) {
      console.log('[OrderCommentModal] Comments data received:', {
        orderId,
        success: commentsData.success,
        hasData: !!commentsData.data,
        dataKeys: commentsData.data ? Object.keys(commentsData.data) : [],
        comments: commentsData.data?.comments,
        commentsCount: commentsData.data?.comments?.length || 0,
        totalComments: commentsData.data?.total_comments,
        fullData: commentsData.data,
      });
    }
    if (error) {
      console.error('[OrderCommentModal] Error loading comments:', error);
    }
  }, [commentsData, orderId, error]);

  // Show error if orderId is not valid (might be CustomOrderRequest ID instead of Order ID)
  const hasValidOrderId = orderId && orderId !== 'undefined' && orderId !== 'null';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chat for ${orderTitle}`} size="lg">
      <div className="flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {!hasValidOrderId && (
            <div className="text-center py-8">
              <p className="text-error mb-2 font-semibold">Unable to load comments</p>
              <p className="text-sm text-muted mb-2">
                Order ID not found for this custom order request.
              </p>
              <p className="text-xs text-muted">
                Custom Order Request ID: {orderId || 'N/A'}
              </p>
              <p className="text-xs text-muted mt-1">
                Comments are stored against the Order record, not the CustomOrderRequest.
                Please ensure this custom order has an associated Order record.
              </p>
            </div>
          )}
          {hasValidOrderId && isLoading && <p className="text-center text-muted">Loading comments...</p>}
          {hasValidOrderId && error && (
            <p className="text-center text-error">
              Error loading comments: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          )}
          {hasValidOrderId && !isLoading && !error && comments.length === 0 && (
            <div className="text-center py-8 text-muted">
              <p>No comments yet. Start the conversation!</p>
              <p className="text-xs mt-2 opacity-70">Order ID: {orderId}</p>
            </div>
          )}

          {comments.map((comment: OrderComment) => (
            <div
              key={comment.id}
              className={cn(
                'flex items-start gap-3',
                comment.comment_type === 'admin' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] p-3 rounded-lg shadow-sm',
                  comment.comment_type === 'admin'
                    ? 'bg-primary text-white rounded-br-none'
                    : comment.comment_type === 'system'
                    ? 'bg-muted/20 text-muted rounded-bl-none'
                    : 'bg-muted/10 text-text-primary rounded-bl-none'
                )}
              >
                <p className="text-xs font-semibold mb-1">{getSenderName(comment)}</p>
                <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                {(comment.media_count && comment.media_count > 0) ||
                  (comment.media && comment.media.length > 0) ? (
                  <div className="flex items-center gap-1 text-xs text-muted mt-1">
                    <PaperClipIcon className="w-3 h-3" />{' '}
                    {comment.media_count || comment.media?.length || 0} attachment(s)
                  </div>
                ) : null}
                <p className="text-xs text-muted mt-1">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4 flex items-center gap-3">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={addCommentMutation.isPending || !hasValidOrderId}
          />
          <Button
            onClick={handleSendMessage}
            isLoading={addCommentMutation.isPending}
            disabled={!newMessage.trim() || addCommentMutation.isPending || !hasValidOrderId}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}

