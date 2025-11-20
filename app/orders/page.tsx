'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { KpiCard } from '@/components/common/KpiCard';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { DatePicker } from '@/components/common/DatePicker';
import { useState, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';
import { Order, Transaction, Designer, Customer } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

export default function OrdersAndTransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [razorpayStatusFilter, setRazorpayStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'>('pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
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
    const labels: Record<string, string> = {
      plan: 'Plan Order',
      bundle: 'Bundle Order',
      design: 'Design Order',
      custom: 'Custom Order',
    };
    return labels[type] || type;
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
                      placeholder="Search by order ID, customer name, Razorpay ID..."
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
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Order Type</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Customer</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Details</th>
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
                      return (
                        <tr key={order.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                          <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">{order.id}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary uppercase">
                              {getOrderTypeLabel(order.orderType || order.order_type)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">{order.customerName || order.user_name || '-'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <p className="text-sm">{getOrderDetails(order)}</p>
                          </td>
                          <td className="py-3 px-4 font-bold whitespace-nowrap">{formatCurrency(order.amount || order.total_amount)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              order.status === 'success' || order.status === 'completed' ? 'bg-success/20 text-success' :
                              order.status === 'pending' ? 'bg-warning/20 text-warning' :
                              order.status === 'failed' ? 'bg-error/20 text-error' :
                              'bg-muted/20 text-muted'
                            }`}>
                              {order.status}
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
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                razorpayStatus === 'captured' ? 'bg-success/20 text-success' :
                                razorpayStatus === 'authorized' ? 'bg-info/20 text-info' :
                                razorpayStatus === 'created' ? 'bg-warning/20 text-warning' :
                                razorpayStatus === 'refunded' ? 'bg-purple/20 text-purple' :
                                razorpayStatus === 'failed' ? 'bg-error/20 text-error' :
                                'bg-muted/20 text-muted'
                              }`}>
                                {razorpayStatus}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(order.createdAt || order.created_at)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
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

          </>
        )}
      </div>
    </DashboardLayout>
  );
}
