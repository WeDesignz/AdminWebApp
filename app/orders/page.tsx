'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockAPI, API } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { KpiCard } from '@/components/common/KpiCard';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { DatePicker } from '@/components/common/DatePicker';
import { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  CubeIcon,
  PhotoIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Order, Transaction, Designer, Customer } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function OrdersAndTransactionsPage() {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [razorpayStatusFilter, setRazorpayStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'>('pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Chat modal state
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<any | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState('');
  const queryClient = useQueryClient();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Redirect moderators away from this page
  useEffect(() => {
    if (!hasRole('Super Admin')) {
      toast.error('Access denied. This page is restricted to Super Admins only.');
      router.replace('/dashboard');
    }
  }, [hasRole, router]);

  // Don't render if not Super Admin
  if (!hasRole('Super Admin')) {
    return null;
  }

  // Unified query for Orders with RazorpayPayment data
  // Using transactions endpoint which includes RazorpayPayment data via TransactionListSerializer
  const { data, isLoading, refetch, error: ordersError } = useQuery({
    queryKey: ['orders', page, pageSize, search, orderTypeFilter, statusFilter, razorpayStatusFilter, dateFrom, dateTo],
    queryFn: () => MockAPI.getTransactions({ 
      page, 
      limit: pageSize,
      type: orderTypeFilter,
      status: statusFilter,
    }),
  });

  // Show error toast for orders query
  useEffect(() => {
    if (ordersError) {
      const errorMessage = ordersError instanceof Error 
        ? ordersError.message 
        : 'Failed to fetch orders. Please check the backend logs for details.';
      toast.error(errorMessage);
      console.error('Orders query error:', ordersError);
    }
  }, [ordersError]);

  const { data: statsData, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => MockAPI.getOrderStats(),
  });

  // Fetch chat data for all orders (batch)
  const { data: ordersChatData, refetch: refetchOrdersChatData } = useQuery({
    queryKey: ['ordersChatData', data?.data?.map((o: any) => o.id).join(',')],
    queryFn: async () => {
      if (!data?.data || data.data.length === 0) return {};
      const chatDataMap: Record<string, { hasChat: boolean; unreadCount: number }> = {};
      
      await Promise.all(
        data.data.map(async (order: any) => {
          try {
            const response = await API.orderComments.getOrderComments(String(order.id));
            if (response.success && response.data?.comments) {
              const comments = response.data.comments;
              const hasChat = comments.length > 0;
              const unreadCount = comments.filter(
                (c: any) => c.comment_type === 'customer' && !c.is_read
              ).length;
              chatDataMap[order.id] = { hasChat, unreadCount };
            }
          } catch (error) {
            console.error(`Error fetching chat for order ${order.id}:`, error);
          }
        })
      );
      return chatDataMap;
    },
    enabled: !!data?.data && data.data.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch chat messages for selected order
  const { data: orderChatMessages, refetch: refetchOrderChatMessages } = useQuery({
    queryKey: ['orderChatMessages', selectedOrderForChat?.id],
    queryFn: async () => {
      if (!selectedOrderForChat) return null;
      const response = await API.orderComments.getOrderComments(String(selectedOrderForChat.id));
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!selectedOrderForChat && isChatModalOpen,
  });

  // Show error toast for stats query
  useEffect(() => {
    if (statsError) {
      const errorMessage = statsError instanceof Error 
        ? statsError.message 
        : 'Failed to fetch order statistics. The financial-reports endpoint may require SuperAdmin privileges.';
      toast.error(errorMessage);
      console.error('Order stats query error:', statsError);
    }
  }, [statsError]);

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  // Chat handlers
  const handleOpenChat = async (order: any) => {
    setSelectedOrderForChat(order);
    setIsChatModalOpen(true);
    // Mark messages as read when opening
    try {
      await API.orderComments.markOrderCommentsAsRead(String(order.id));
      // Immediately refetch chat data to update unread count
      await refetchOrdersChatData();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // Auto-scroll when chat messages load or modal opens
  useEffect(() => {
    if (isChatModalOpen && orderChatMessages) {
      scrollToBottom();
    }
  }, [isChatModalOpen, orderChatMessages]);

  // Send chat message mutation
  const sendChatMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedOrderForChat) throw new Error('No order selected');
      return API.orderComments.addOrderComment(String(selectedOrderForChat.id), message, false);
    },
    onSuccess: () => {
      setNewChatMessage('');
      refetchOrderChatMessages();
      queryClient.invalidateQueries({ queryKey: ['ordersChatData'] });
      toast.success('Message sent successfully');
      setTimeout(() => scrollToBottom(), 200);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedOrder(null);
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
  };

  const handleSubmitStatusUpdate = async () => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    try {
      const response = await MockAPI.updateOrderStatus(selectedOrder.id, newStatus);
      if (response.success) {
        toast.success('Order status updated successfully');
        handleCloseStatusModal();
        refetch();
        refetchStats();
      } else {
        toast.error(response.error || 'Failed to update order status');
      }
    } catch (error) {
      toast.error('An error occurred while updating order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const getOrderTypeLabel = (type: string) => {
    if (!type) return '-';
    const labels: Record<string, string> = {
      cart: 'Cart Order',
      subscription: 'Subscription',
      custom: 'Custom Order',
      // Legacy support
      plan: 'Plan Order',
      bundle: 'Bundle Order',
      design: 'Design Order',
    };
    return labels[type.toLowerCase()] || type;
  };

  const getOrderDetails = (order: Order) => {
    switch (order.orderType) {
      case 'plan':
        return order.planName || 'Plan Purchase';
      case 'bundle':
        const designCount = order.designIds?.length || 0;
        return designCount > 0 ? `Bulk purchase: ${designCount} design${designCount > 1 ? 's' : ''}` : 'Bulk purchase';
      case 'design':
        return 'Single design purchased';
      case 'custom':
        return 'Custom order';
      default:
        return 'Order';
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };


  // Filter options
  const orderTypeFilterOptions = [
    { value: '', label: 'All Order Types' },
    { value: 'cart', label: 'Cart Order' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'custom', label: 'Custom Order' },
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ];

  const razorpayStatusFilterOptions = [
    { value: '', label: 'All Razorpay Status' },
    { value: 'created', label: 'Created' },
    { value: 'authorized', label: 'Authorized' },
    { value: 'captured', label: 'Captured' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' },
  ];

  const newStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders & Transactions</h1>
            <p className="text-muted mt-1">Manage all orders and payments in one place</p>
          </div>
          <Button variant="primary">Export Orders</Button>
        </div>

        <>
            {/* Statistics Tiles */}
            {statsData?.data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard
                  title="Total Orders"
                  value={statsData.data.total}
                  icon={<ShoppingCartIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Pending Orders"
                  value={statsData.data.pending}
                  icon={<ClockIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Completed Orders"
                  value={statsData.data.completed}
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Cancelled Orders"
                  value={statsData.data.cancelled}
                  icon={<XCircleIcon className="w-6 h-6" />}
                />
              </div>
            )}

            {/* Search and Filters */}
            <div className="card">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <Input
                      placeholder="Search by order number, Razorpay Payment ID, Razorpay Order ID, or customer name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Dropdown
                    options={orderTypeFilterOptions}
                    value={orderTypeFilter}
                    onChange={setOrderTypeFilter}
                    placeholder="Filter by order type"
                    className="w-full"
                  />

                  <Dropdown
                    options={statusFilterOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filter by order status"
                    className="w-full"
                  />

                  <Dropdown
                    options={razorpayStatusFilterOptions}
                    value={razorpayStatusFilter}
                    onChange={setRazorpayStatusFilter}
                    placeholder="Filter by Razorpay status"
                    className="w-full"
                  />

                  <DatePicker
                    placeholder="Date From"
                    value={dateFrom}
                    onChange={setDateFrom}
                    maxDate={dateTo || undefined}
                  />

                  <DatePicker
                    placeholder="Date To"
                    value={dateTo}
                    onChange={setDateTo}
                    minDate={dateFrom || undefined}
                  />
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="card overflow-x-auto">
              {/* Pagination - Top */}
              {data?.pagination && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                  <p className="text-sm text-muted">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted whitespace-nowrap">Show:</label>
                    <div className="w-20">
                      <Dropdown
                        options={pageSizeOptions}
                        value={String(pageSize)}
                        onChange={(value) => handlePageSizeChange(Number(value))}
                      />
                    </div>
                    <span className="text-sm text-muted whitespace-nowrap">per page</span>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium whitespace-nowrap w-4"></th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Order Number</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Order Type</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Customer</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Order Status</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Razorpay Payment ID</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Razorpay Order ID</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Razorpay Status</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : !data?.data || data.data.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-muted">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    (data?.data || []).map((order: any) => {
                      // Get RazorpayPayment status from transaction data
                      const razorpayStatus = order.razorpay_status || order.razorpayStatus || '-';
                      const razorpayPaymentId = order.razorpayId || order.razorpay_payment_id || '-';
                      const razorpayOrderId = order.razorpayOrderId || order.razorpay_order_id || '-';
                      const chatData = ordersChatData?.[order.id];
                      return (
                        <tr key={order.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                          {/* Red indicator dot - only show if there are unread messages */}
                          <td className="py-3 px-2 relative">
                            {chatData && ((chatData.unreadCount ?? 0) > 0) && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">{order.order_number || order.orderNumber || order.id}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary">
                              {getOrderTypeLabel(order.orderType || order.order_type || order.order_transaction_type)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">{order.customerName || order.user_name || '-'}</td>
                          <td className="py-3 px-4 font-bold whitespace-nowrap">{formatCurrency(order.amount || order.total_amount)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                              order.status === 'success' || order.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              order.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              order.status === 'failed' 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {order.status || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-muted whitespace-nowrap">
                            {razorpayPaymentId}
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-muted whitespace-nowrap">
                            {razorpayOrderId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {razorpayStatus !== '-' ? (
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                                razorpayStatus === 'captured' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                razorpayStatus === 'authorized' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                razorpayStatus === 'created' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                razorpayStatus === 'refunded' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                razorpayStatus === 'failed' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {razorpayStatus}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(order.createdAt || order.created_at)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* Chat button - show for all orders */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenChat(order);
                                }}
                                className="flex items-center gap-1 relative"
                                title="Open Chat"
                              >
                                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                {chatData && ((chatData.unreadCount ?? 0) > 0) && (
                                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] text-center">
                                    {chatData.unreadCount}
                                  </span>
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewOrder(order)}
                                className="flex items-center gap-1"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                                <span className="text-xs">View</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateStatus(order)}
                                className="flex items-center gap-1"
                                title="Update Status"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                <span className="text-xs">Status</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination - Bottom */}
              {data?.pagination && (
                <div className="flex items-center justify-end mt-6 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      title="Previous"
                    >
                      <ArrowUpIcon className="w-4 h-4 rotate-90" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= data.pagination.totalPages}
                      title="Next"
                    >
                      <ArrowDownIcon className="w-4 h-4 rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Update Status Modal */}
            <Modal
              isOpen={showStatusModal}
              onClose={handleCloseStatusModal}
              title="Update Order Status"
              size="md"
            >
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Order Details</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted">Order ID:</span> {selectedOrder.id}</p>
                      <p><span className="text-muted">Type:</span> {getOrderTypeLabel(selectedOrder.orderType)}</p>
                      <p><span className="text-muted">Customer:</span> {selectedOrder.customerName}</p>
                      <p><span className="text-muted">Amount:</span> {formatCurrency(selectedOrder.amount)}</p>
                      <p><span className="text-muted">Current Status:</span> {selectedOrder.status}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Status</label>
                    <Dropdown
                      options={newStatusOptions}
                      value={newStatus}
                      onChange={(value) => setNewStatus(value as typeof newStatus)}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseStatusModal}
                      className="flex items-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleSubmitStatusUpdate}
                      disabled={isUpdatingStatus || newStatus === selectedOrder.status}
                      isLoading={isUpdatingStatus}
                      className="flex items-center gap-2"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Update Status
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

            {/* View Order Details Modal */}
            <Modal
              isOpen={showViewModal}
              onClose={handleCloseViewModal}
              title="Order Details"
              size="lg"
            >
              {selectedOrder && (
                <div className="space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
                  {/* Order Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Order Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order Number</p>
                        <p className="font-mono text-sm font-medium">{selectedOrder.order_number || selectedOrder.orderNumber || selectedOrder.id}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order ID (Internal)</p>
                        <p className="font-mono text-sm">{selectedOrder.id}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order Type</p>
                        <p className="text-sm font-medium">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary">
                            {getOrderTypeLabel(selectedOrder.orderType || selectedOrder.order_type || selectedOrder.order_transaction_type)}
                          </span>
                        </p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order Status</p>
                        <p className="text-sm font-medium">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                            selectedOrder.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            selectedOrder.status === 'pending' || selectedOrder.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            selectedOrder.status === 'cancelled' || selectedOrder.status === 'refunded'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {selectedOrder.status || '-'}
                          </span>
                        </p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Total Amount</p>
                        <p className="text-sm font-bold">{formatCurrency(selectedOrder.amount || selectedOrder.total_amount || 0)}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Transaction Number</p>
                        <p className="font-mono text-sm">{selectedOrder.order_transaction_number || selectedOrder.transactionNumber || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Transaction Type</p>
                        <p className="text-sm">{selectedOrder.order_transaction_type || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg md:col-span-2">
                        <p className="text-xs text-muted mb-1">Product IDs</p>
                        <p className="font-mono text-sm break-all">
                          {selectedOrder.product_ids 
                            ? (Array.isArray(selectedOrder.product_ids) 
                              ? selectedOrder.product_ids.join(', ') 
                              : selectedOrder.product_ids)
                            : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg md:col-span-2">
                        <p className="text-xs text-muted mb-1">Order Details</p>
                        <p className="text-sm">{getOrderDetails(selectedOrder)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Customer Name</p>
                        <p className="text-sm font-medium">{selectedOrder.customerName || selectedOrder.user_name || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Email</p>
                        <p className="text-sm">{selectedOrder.user_email || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">User ID</p>
                        <p className="font-mono text-sm">
                          {selectedOrder.created_by 
                            ? (typeof selectedOrder.created_by === 'object' && 'id' in selectedOrder.created_by
                              ? selectedOrder.created_by.id
                              : selectedOrder.created_by)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Razorpay Payment Information Section */}
                  {(selectedOrder.razorpay_payment || selectedOrder.razorpayId || selectedOrder.razorpay_payment_id || selectedOrder.razorpay_status) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Razorpay Payment Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/10 rounded-lg">
                          <p className="text-xs text-muted mb-1">Razorpay Payment ID</p>
                          <p className="font-mono text-sm">{selectedOrder.razorpay_payment?.razorpay_payment_id || selectedOrder.razorpay_payment_id || selectedOrder.razorpayId || '-'}</p>
                        </div>
                        <div className="p-3 bg-muted/10 rounded-lg">
                          <p className="text-xs text-muted mb-1">Razorpay Order ID</p>
                          <p className="font-mono text-sm">{selectedOrder.razorpay_payment?.razorpay_order_id || selectedOrder.razorpayOrderId || selectedOrder.razorpay_order_id || '-'}</p>
                        </div>
                        <div className="p-3 bg-muted/10 rounded-lg">
                          <p className="text-xs text-muted mb-1">Payment Status</p>
                          <p className="text-sm">
                            {selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus ? (
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                                (selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus) === 'captured' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                (selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus) === 'authorized' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                (selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus) === 'created' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                (selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus) === 'refunded' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                (selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus) === 'failed' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {selectedOrder.razorpay_payment?.status || selectedOrder.razorpay_status || selectedOrder.razorpayStatus}
                              </span>
                            ) : '-'}
                          </p>
                        </div>
                        {selectedOrder.razorpay_payment?.amount && (
                          <div className="p-3 bg-muted/10 rounded-lg">
                            <p className="text-xs text-muted mb-1">Payment Amount</p>
                            <p className="text-sm font-bold">{formatCurrency(selectedOrder.razorpay_payment.amount)}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.method && (
                          <div className="p-3 bg-muted/10 rounded-lg">
                            <p className="text-xs text-muted mb-1">Payment Method</p>
                            <p className="text-sm">{selectedOrder.razorpay_payment.method}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.currency && (
                          <div className="p-3 bg-muted/10 rounded-lg">
                            <p className="text-xs text-muted mb-1">Currency</p>
                            <p className="text-sm">{selectedOrder.razorpay_payment.currency}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.fee && (
                          <div className="p-3 bg-muted/10 rounded-lg">
                            <p className="text-xs text-muted mb-1">Fee</p>
                            <p className="text-sm">{formatCurrency(selectedOrder.razorpay_payment.fee)}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.tax && (
                          <div className="p-3 bg-muted/10 rounded-lg">
                            <p className="text-xs text-muted mb-1">Tax</p>
                            <p className="text-sm">{formatCurrency(selectedOrder.razorpay_payment.tax)}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.description && (
                          <div className="p-3 bg-muted/10 rounded-lg md:col-span-2">
                            <p className="text-xs text-muted mb-1">Description</p>
                            <p className="text-sm">{selectedOrder.razorpay_payment.description}</p>
                          </div>
                        )}
                        {selectedOrder.razorpay_payment?.error_code && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg md:col-span-2">
                            <p className="text-xs text-red-600 dark:text-red-400 mb-1">Error Code</p>
                            <p className="text-sm font-mono">{selectedOrder.razorpay_payment.error_code}</p>
                            {selectedOrder.razorpay_payment.error_description && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{selectedOrder.razorpay_payment.error_description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Timestamps</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order Created At</p>
                        <p className="text-sm">{formatDate(selectedOrder.createdAt || selectedOrder.created_at)}</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-xs text-muted mb-1">Order Updated At</p>
                        <p className="text-sm">{formatDate(selectedOrder.updatedAt || selectedOrder.updated_at)}</p>
                      </div>
                      {selectedOrder.razorpay_payment?.created_at && (
                        <div className="p-3 bg-muted/10 rounded-lg">
                          <p className="text-xs text-muted mb-1">Payment Created At</p>
                          <p className="text-sm">{formatDate(selectedOrder.razorpay_payment.created_at)}</p>
                        </div>
                      )}
                      {selectedOrder.razorpay_payment?.updated_at && (
                        <div className="p-3 bg-muted/10 rounded-lg">
                          <p className="text-xs text-muted mb-1">Payment Updated At</p>
                          <p className="text-sm">{formatDate(selectedOrder.razorpay_payment.updated_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseViewModal}
                      className="flex items-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Close
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
                setSelectedOrderForChat(null);
                setNewChatMessage('');
              }}
              title={selectedOrderForChat ? `Order ${selectedOrderForChat.order_number || selectedOrderForChat.orderNumber || selectedOrderForChat.id} - Chat` : 'Order Chat'}
              size="lg"
            >
              {selectedOrderForChat && orderChatMessages && (
                <div className="flex flex-col h-[600px]">
                  <div className="mb-4 p-3 bg-muted/10 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">{selectedOrderForChat.customerName || selectedOrderForChat.user_name || 'Unknown'}</p>
                        <p className="text-muted">{selectedOrderForChat.user_email || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(selectedOrderForChat.amount || selectedOrderForChat.total_amount || 0)}</p>
                        <p className="text-muted">{getOrderTypeLabel(selectedOrderForChat.orderType || selectedOrderForChat.order_type || '')}</p>
                      </div>
                    </div>
                  </div>
                  <div 
                    ref={chatScrollRef}
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
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessageMutation.mutate(newChatMessage.trim());
                        }
                      }}
                      className="text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={() => sendChatMessageMutation.mutate(newChatMessage.trim())}
                      disabled={!newChatMessage.trim() || sendChatMessageMutation.isPending}
                      isLoading={sendChatMessageMutation.isPending}
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
        </>
      </div>
    </DashboardLayout>
  );
}
