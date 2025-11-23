'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import {
  ChatBubbleLeftRightIcon,
  TicketIcon,
  ShoppingCartIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

type TabType = 'tickets' | 'cart-chats' | 'subscription-chats';

interface SupportTicket {
  id: number;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  assigned_to?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: string;
}

interface OrderChat {
  id: string;
  order_number: string;
  order_type: 'cart' | 'subscription';
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
}

function SupportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  
  // Initialize activeTab from URL or default to 'tickets'
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabFromUrl && ['tickets', 'cart-chats', 'subscription-chats'].includes(tabFromUrl))
      ? tabFromUrl
      : 'tickets'
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedOrderChat, setSelectedOrderChat] = useState<OrderChat | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();
  
  // Refs for scroll containers
  const ticketChatScrollRef = useRef<HTMLDivElement>(null);
  const orderChatScrollRef = useRef<HTMLDivElement>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/support?${params.toString()}`, { scroll: false });
  };

  // Sync activeTab with URL on mount (in case URL changed externally)
  useEffect(() => {
    if (tabFromUrl && ['tickets', 'cart-chats', 'subscription-chats'].includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  // Fetch Support Tickets
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['supportTickets', statusFilter],
    queryFn: async () => {
      const response = await API.supportTickets.getSupportThreads({
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return { threads: [], total_threads: 0, open_threads: 0, closed_threads: 0 };
    },
  });

  // Fetch Cart Orders with chat activity
  const { data: cartOrdersData, isLoading: isLoadingCartOrders } = useQuery({
    queryKey: ['cartOrderChats', searchQuery],
    queryFn: async () => {
      const response = await API.orders.getOrders({
        type: 'cart',
        page: 1,
        limit: 100,
      });
      if (response.success && response.data) {
        // Filter orders that have comments/chats
        const ordersWithChats = await Promise.all(
          response.data.data.map(async (order: any) => {
            try {
              const commentsResponse = await API.orderComments.getOrderComments(String(order.id));
              if (commentsResponse.success && commentsResponse.data) {
                const comments = commentsResponse.data.comments || [];
                if (comments.length > 0) {
                  const unreadCount = comments.filter((c: any) => !c.is_read && c.comment_type === 'customer').length;
                  const lastComment = comments[comments.length - 1];
                  return {
                    id: String(order.id),
                    order_number: order.order_number || order.orderNumber || `#${order.id}`,
                    order_type: 'cart' as 'cart' | 'subscription',
                    customer_name: order.customerName || order.user_name || 'Unknown',
                    customer_email: order.user_email || '',
                    total_amount: order.amount || order.total_amount || 0,
                    status: order.status || 'pending',
                    created_at: order.createdAt || order.created_at,
                    unread_count: unreadCount,
                    last_message: lastComment?.message || '',
                    last_message_at: lastComment?.created_at || order.createdAt || order.created_at,
                  } as OrderChat;
                }
              }
            } catch (error) {
              console.error(`Error fetching comments for order ${order.id}:`, error);
            }
            return null;
          })
        );
        return ordersWithChats.filter((order): order is OrderChat => order !== null);
      }
      return [];
    },
  });

  // Fetch Subscription Orders with chat activity
  const { data: subscriptionOrdersData, isLoading: isLoadingSubscriptionOrders } = useQuery({
    queryKey: ['subscriptionOrderChats', searchQuery],
    queryFn: async () => {
      const response = await API.orders.getOrders({
        type: 'subscription',
        page: 1,
        limit: 100,
      });
      if (response.success && response.data) {
        // Filter orders that have comments/chats
        const ordersWithChats = await Promise.all(
          response.data.data.map(async (order: any) => {
            try {
              const commentsResponse = await API.orderComments.getOrderComments(String(order.id));
              if (commentsResponse.success && commentsResponse.data) {
                const comments = commentsResponse.data.comments || [];
                if (comments.length > 0) {
                  const unreadCount = comments.filter((c: any) => !c.is_read && c.comment_type === 'customer').length;
                  const lastComment = comments[comments.length - 1];
                  return {
                    id: String(order.id),
                    order_number: order.order_number || order.orderNumber || `#${order.id}`,
                    order_type: 'subscription' as 'cart' | 'subscription',
                    customer_name: order.customerName || order.user_name || 'Unknown',
                    customer_email: order.user_email || '',
                    total_amount: order.amount || order.total_amount || 0,
                    status: order.status || 'pending',
                    created_at: order.createdAt || order.created_at,
                    unread_count: unreadCount,
                    last_message: lastComment?.message || '',
                    last_message_at: lastComment?.created_at || order.createdAt || order.created_at,
                  } as OrderChat;
                }
              }
            } catch (error) {
              console.error(`Error fetching comments for order ${order.id}:`, error);
            }
            return null;
          })
        );
        return ordersWithChats.filter((order): order is OrderChat => order !== null);
      }
      return [];
    },
  });

  // Fetch selected ticket messages
  const { data: ticketMessages, refetch: refetchTicketMessages } = useQuery({
    queryKey: ['supportTicketMessages', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const response = await API.supportTickets.getSupportThread(String(selectedTicket.id));
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!selectedTicket && isTicketModalOpen,
  });

  // Fetch selected order chat messages
  const { data: orderChatMessages, refetch: refetchOrderChatMessages } = useQuery({
    queryKey: ['orderChatMessages', selectedOrderChat?.id],
    queryFn: async () => {
      if (!selectedOrderChat) return null;
      const response = await API.orderComments.getOrderComments(selectedOrderChat.id);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!selectedOrderChat && isChatModalOpen,
  });

  // Scroll to bottom helper function
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    }, 100);
  };

  // Auto-scroll when ticket messages load or modal opens
  useEffect(() => {
    if (isTicketModalOpen && ticketMessages) {
      scrollToBottom(ticketChatScrollRef);
    }
  }, [isTicketModalOpen, ticketMessages]);

  // Auto-scroll when order chat messages load or modal opens
  useEffect(() => {
    if (isChatModalOpen && orderChatMessages) {
      scrollToBottom(orderChatScrollRef);
    }
  }, [isChatModalOpen, orderChatMessages]);

  // Send message to support ticket
  const sendTicketMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedTicket) throw new Error('No ticket selected');
      return API.supportTickets.addSupportMessage(String(selectedTicket.id), message);
    },
    onSuccess: () => {
      setNewMessage('');
      refetchTicketMessages();
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      toast.success('Message sent successfully');
      // Scroll to bottom after sending message
      setTimeout(() => scrollToBottom(ticketChatScrollRef), 200);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  // Send message to order chat
  const sendOrderChatMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedOrderChat) throw new Error('No order selected');
      return API.orderComments.addOrderComment(selectedOrderChat.id, message, false);
    },
    onSuccess: () => {
      setNewMessage('');
      refetchOrderChatMessages();
      queryClient.invalidateQueries({ queryKey: ['cartOrderChats', 'subscriptionOrderChats'] });
      toast.success('Message sent successfully');
      // Scroll to bottom after sending message
      setTimeout(() => scrollToBottom(orderChatScrollRef), 200);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleOpenOrderChat = (order: OrderChat) => {
    setSelectedOrderChat(order);
    setIsChatModalOpen(true);
    // Mark messages as read when opening chat
    API.orderComments.markOrderCommentsAsRead(order.id).catch(console.error);
  };

  const handleSendTicketMessage = () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendTicketMessageMutation.mutate(newMessage.trim());
  };

  const handleSendOrderChatMessage = () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendOrderChatMessageMutation.mutate(newMessage.trim());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved':
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed':
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const filteredTickets = ticketsData?.threads?.filter((ticket: SupportTicket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.created_by.email.toLowerCase().includes(query) ||
        (ticket.created_by.first_name && ticket.created_by.first_name.toLowerCase().includes(query)) ||
        (ticket.created_by.last_name && ticket.created_by.last_name.toLowerCase().includes(query))
      );
    }
    return true;
  }) || [];

  const filteredCartChats = cartOrdersData?.filter((order: OrderChat) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  const filteredSubscriptionChats = subscriptionOrdersData?.filter((order: OrderChat) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="text-muted mt-1">Manage support tickets and customer chats</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => handleTabChange('tickets')}
              className={cn(
                'px-4 py-3 font-medium transition-colors border-b-2 -mb-px',
                activeTab === 'tickets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <TicketIcon className="w-5 h-5" />
                <span>Support Tickets</span>
                {ticketsData && ticketsData.open_threads > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                    {ticketsData.open_threads}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => handleTabChange('cart-chats')}
              className={cn(
                'px-4 py-3 font-medium transition-colors border-b-2 -mb-px',
                activeTab === 'cart-chats'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="w-5 h-5" />
                <span>Cart Order Chats</span>
                {(() => {
                  const unreadCount = cartOrdersData?.filter((o: OrderChat) => o.unread_count && o.unread_count > 0).length || 0;
                  return unreadCount > 0 ? (
                    <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                      {unreadCount}
                    </span>
                  ) : null;
                })()}
              </div>
            </button>
            <button
              onClick={() => handleTabChange('subscription-chats')}
              className={cn(
                'px-4 py-3 font-medium transition-colors border-b-2 -mb-px',
                activeTab === 'subscription-chats'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <CubeIcon className="w-5 h-5" />
                <span>Subscription Chats</span>
                {(() => {
                  const unreadCount = subscriptionOrdersData?.filter((o: OrderChat) => o.unread_count && o.unread_count > 0).length || 0;
                  return unreadCount > 0 ? (
                    <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                      {unreadCount}
                    </span>
                  ) : null;
                })()}
              </div>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <Input
                  placeholder="Search by subject, customer name, email, or order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeTab === 'tickets' && (
                <Dropdown
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter by status"
                  className="w-48"
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'tickets' && (
              <div className="space-y-3">
                {isLoadingTickets ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No support tickets found</p>
                  </div>
                ) : (
                  filteredTickets.map((ticket: SupportTicket) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-border rounded-lg hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => handleOpenTicket(ticket)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{ticket.subject}</h3>
                            <span className={cn('px-2 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(ticket.status))}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={cn('px-2 py-1 rounded-lg text-xs font-medium capitalize', getPriorityColor(ticket.priority))}>
                              {ticket.priority}
                            </span>
                            {((ticket.unread_count ?? 0) > 0) && (
                              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {ticket.unread_count} unread
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              {ticket.created_by.first_name && ticket.created_by.last_name
                                ? `${ticket.created_by.first_name} ${ticket.created_by.last_name}`
                                : ticket.created_by.email}
                            </span>
                            <span>{ticket.category}</span>
                            <span>{formatDate(ticket.updated_at)}</span>
                          </div>
                          {ticket.last_message && (
                            <p className="mt-2 text-sm text-muted line-clamp-1">
                              {typeof ticket.last_message === 'string' 
                                ? ticket.last_message 
                                : (ticket.last_message as any)?.content || JSON.stringify(ticket.last_message)}
                            </p>
                          )}
                        </div>
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-muted flex-shrink-0 ml-4" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'cart-chats' && (
              <div className="space-y-3">
                {isLoadingCartOrders ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredCartChats.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No cart order chats found</p>
                  </div>
                ) : (
                  filteredCartChats.map((order: OrderChat) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-border rounded-lg hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => handleOpenOrderChat(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">Order {order.order_number}</h3>
                            <span className={cn('px-2 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(order.status))}>
                              {order.status}
                            </span>
                            {((order.unread_count ?? 0) > 0) && (
                              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {order.unread_count} unread
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              {order.customer_name}
                            </span>
                            <span>{formatCurrency(order.total_amount)}</span>
                            <span>{formatDate(order.last_message_at || order.created_at)}</span>
                          </div>
                          {order.last_message && (
                            <p className="mt-2 text-sm text-muted line-clamp-1">
                              {typeof order.last_message === 'string' 
                                ? order.last_message 
                                : (order.last_message as any)?.content || JSON.stringify(order.last_message)}
                            </p>
                          )}
                        </div>
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-muted flex-shrink-0 ml-4" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'subscription-chats' && (
              <div className="space-y-3">
                {isLoadingSubscriptionOrders ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredSubscriptionChats.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <CubeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No subscription chats found</p>
                  </div>
                ) : (
                  filteredSubscriptionChats.map((order: OrderChat) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-border rounded-lg hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => handleOpenOrderChat(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">Order {order.order_number}</h3>
                            <span className={cn('px-2 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(order.status))}>
                              {order.status}
                            </span>
                            {((order.unread_count ?? 0) > 0) && (
                              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {order.unread_count} unread
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              {order.customer_name}
                            </span>
                            <span>{formatCurrency(order.total_amount)}</span>
                            <span>{formatDate(order.last_message_at || order.created_at)}</span>
                          </div>
                          {order.last_message && (
                            <p className="mt-2 text-sm text-muted line-clamp-1">
                              {typeof order.last_message === 'string' 
                                ? order.last_message 
                                : (order.last_message as any)?.content || JSON.stringify(order.last_message)}
                            </p>
                          )}
                        </div>
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-muted flex-shrink-0 ml-4" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Support Ticket Chat Modal */}
        <Modal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setSelectedTicket(null);
            setNewMessage('');
          }}
          title={selectedTicket?.subject || 'Support Ticket'}
          size="lg"
        >
          {selectedTicket && ticketMessages && (
            <div className="flex flex-col h-[600px]">
              <div 
                ref={ticketChatScrollRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border border-border rounded-lg"
              >
                {ticketMessages.messages && ticketMessages.messages.length > 0 ? (
                  ticketMessages.messages.map((message: any) => {
                    // Check if message is from admin (support) or customer (user)
                    // sender_type can be 'support' (admin) or 'user' (customer)
                    const isAdmin = message.sender_type === 'support' || message.sender_type === 'admin';
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3 w-full',
                          isAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'flex flex-col gap-1 max-w-[70%]',
                            isAdmin ? 'items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg px-4 py-2',
                              isAdmin
                                ? 'bg-primary text-white'
                                : 'bg-muted/20 text-foreground'
                            )}
                          >
                            <p className="text-sm">
                              {typeof message.message === 'string' 
                                ? message.message 
                                : message.content || JSON.stringify(message.message)}
                            </p>
                          </div>
                          <span className={cn(
                            'text-xs text-muted px-1',
                            isAdmin ? 'text-right' : 'text-left'
                          )}>
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted">
                    <p>No messages yet</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendTicketMessage();
                    }
                  }}
                  className="text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleSendTicketMessage}
                  disabled={!newMessage.trim() || sendTicketMessageMutation.isPending}
                  isLoading={sendTicketMessageMutation.isPending}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Order Chat Modal */}
        <Modal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setSelectedOrderChat(null);
            setNewMessage('');
          }}
          title={selectedOrderChat ? `Order ${selectedOrderChat.order_number} - Chat` : 'Order Chat'}
          size="lg"
        >
          {selectedOrderChat && orderChatMessages && (
            <div className="flex flex-col h-[600px]">
              <div className="mb-4 p-3 bg-muted/10 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold">{selectedOrderChat.customer_name}</p>
                    <p className="text-muted">{selectedOrderChat.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(selectedOrderChat.total_amount)}</p>
                    <p className="text-muted">{selectedOrderChat.order_type}</p>
                  </div>
                </div>
              </div>
              <div 
                ref={orderChatScrollRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border border-border rounded-lg"
              >
                {orderChatMessages.comments && orderChatMessages.comments.length > 0 ? (
                  orderChatMessages.comments.map((comment: any) => {
                    const isAdmin = comment.comment_type === 'admin';
                    return (
                      <div
                        key={comment.id}
                        className={cn(
                          'flex gap-3 w-full',
                          isAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'flex flex-col gap-1 max-w-[70%]',
                            isAdmin ? 'items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg px-4 py-2',
                              isAdmin
                                ? 'bg-primary text-white'
                                : 'bg-muted/20 text-foreground'
                            )}
                          >
                            <p className="text-sm">
                              {typeof comment.message === 'string' 
                                ? comment.message 
                                : comment.content || JSON.stringify(comment.message)}
                            </p>
                          </div>
                          <span className={cn(
                            'text-xs text-muted px-1',
                            isAdmin ? 'text-right' : 'text-left'
                          )}>
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted">
                    <p>No messages yet</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendOrderChatMessage();
                    }
                  }}
                  className="text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleSendOrderChatMessage}
                  disabled={!newMessage.trim() || sendOrderChatMessageMutation.isPending}
                  isLoading={sendOrderChatMessageMutation.isPending}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Support</h1>
              <p className="text-muted mt-1">Manage support tickets and customer chats</p>
            </div>
          </div>
          <div className="card">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    }>
      <SupportPageContent />
    </Suspense>
  );
}

