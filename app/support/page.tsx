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
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

type TabType = 'tickets';

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
  creator_type?: 'customer' | 'designer' | 'admin';
  thread_type?: 'customer' | 'designer';
}


function SupportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  
  // Initialize activeTab - only support tickets now
  const [activeTab] = useState<TabType>('tickets');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creatorTypeFilter, setCreatorTypeFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();
  
  // Refs for scroll containers
  const ticketChatScrollRef = useRef<HTMLDivElement>(null);

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


  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleSendTicketMessage = () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendTicketMessageMutation.mutate(newMessage.trim());
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
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.created_by.email.toLowerCase().includes(query) ||
        (ticket.created_by.first_name && ticket.created_by.first_name.toLowerCase().includes(query)) ||
        (ticket.created_by.last_name && ticket.created_by.last_name.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    // Filter by creator type (prefer thread_type over creator_type)
    if (creatorTypeFilter) {
      const ticketType = ticket.thread_type || ticket.creator_type;
      if (ticketType !== creatorTypeFilter) {
        return false;
      }
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

        {/* Support Tickets Section */}
        <div className="card">

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
              {(
                <>
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
                  <Dropdown
                    options={[
                      { value: '', label: 'All Types' },
                      { value: 'customer', label: 'Customer' },
                      { value: 'designer', label: 'Designer' },
                    ]}
                    value={creatorTypeFilter}
                    onChange={setCreatorTypeFilter}
                    placeholder="Filter by type"
                    className="w-48"
                  />
                </>
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
                            {(() => {
                              // Prefer thread_type over creator_type for accurate display
                              const displayType = ticket.thread_type || ticket.creator_type;
                              if (!displayType) return null;
                              
                              const isDesigner = displayType === 'designer';
                              return (
                                <span className={cn(
                                  'px-2 py-1 rounded-lg text-xs font-medium capitalize',
                                  isDesigner
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                )}>
                                  {isDesigner ? 'Designer' : 'Customer'}
                                </span>
                              );
                            })()}
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

