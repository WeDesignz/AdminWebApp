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
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  ArrowPathIcon,
  BanknotesIcon,
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

type TabType = 'orders' | 'transactions';

export default function OrdersAndTransactionsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Initialize tab from URL parameter or default to 'orders'
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam === 'transactions' ? 'transactions' : 'orders') as TabType
  );

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam === 'transactions') {
      setActiveTab('transactions');
    } else if (tabParam === 'orders' || !tabParam) {
      setActiveTab('orders');
    }
  }, [tabParam]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'>('pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);

  // Transactions state variables
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txSearch, setTxSearch] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('');
  const [txOrderTransactionTypeFilter, setTxOrderTransactionTypeFilter] = useState('');
  const [txRazorpayIdFilter, setTxRazorpayIdFilter] = useState('');
  const [txUserIdFilter, setTxUserIdFilter] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'designer' | 'customer' | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, refetch, error: ordersError } = useQuery({
    queryKey: ['orders', page, pageSize, search, orderTypeFilter, statusFilter, userIdFilter, dateFrom, dateTo],
    queryFn: () => MockAPI.getOrders({ 
      page, 
      limit: pageSize,
      type: orderTypeFilter,
      status: statusFilter,
    }),
  });

  // Show error toast for orders query
  useEffect(() => {
    if (ordersError && activeTab === 'orders') {
      const errorMessage = ordersError instanceof Error 
        ? ordersError.message 
        : 'Failed to fetch orders. Please check the backend logs for details.';
      toast.error(errorMessage);
      console.error('Orders query error:', ordersError);
    }
  }, [ordersError, activeTab]);

  const { data: statsData, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => MockAPI.getOrderStats(),
  });

  // Show error toast for stats query
  useEffect(() => {
    if (statsError && activeTab === 'orders') {
      const errorMessage = statsError instanceof Error 
        ? statsError.message 
        : 'Failed to fetch order statistics. The financial-reports endpoint may require SuperAdmin privileges.';
      toast.error(errorMessage);
      console.error('Order stats query error:', statsError);
    }
  }, [statsError, activeTab]);

  // Transactions queries
  const { data: txData, isLoading: isLoadingTx, refetch: refetchTx, error: txError } = useQuery({
    queryKey: ['transactions', txPage, txPageSize, txSearch, txCategoryFilter, txTypeFilter, txStatusFilter, txOrderTransactionTypeFilter, txRazorpayIdFilter, txDateFrom, txDateTo, txUserIdFilter],
    queryFn: () => MockAPI.getTransactions({ 
      page: txPage, 
      limit: txPageSize,
      type: txTypeFilter,
      status: txStatusFilter,
    }),
    enabled: activeTab === 'transactions',
  });

  // Show error toast for transactions query
  useEffect(() => {
    if (txError && activeTab === 'transactions') {
      const errorMessage = txError instanceof Error 
        ? txError.message 
        : 'Failed to fetch transactions. Please check the backend logs for details.';
      toast.error(errorMessage);
      console.error('Transactions query error:', txError);
    }
  }, [txError, activeTab]);

  const { data: txStatsData, error: txStatsError } = useQuery({
    queryKey: ['transactionStats'],
    queryFn: () => MockAPI.getTransactionStats(),
    enabled: activeTab === 'transactions',
  });

  // Show error toast for transaction stats query
  useEffect(() => {
    if (txStatsError && activeTab === 'transactions') {
      const errorMessage = txStatsError instanceof Error 
        ? txStatsError.message 
        : 'Failed to fetch transaction statistics. Please check the backend logs for details.';
      toast.error(errorMessage);
      console.error('Transaction stats query error:', txStatsError);
    }
  }, [txStatsError, activeTab]);

  const { data: txOrderData, isLoading: isLoadingTxOrder } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => MockAPI.getOrder(selectedOrderId!),
    enabled: !!selectedOrderId && showOrderModal && activeTab === 'transactions',
  });

  const { data: txDesignerData, isLoading: isLoadingTxDesigner } = useQuery({
    queryKey: ['designer', selectedUserId],
    queryFn: () => MockAPI.getDesigner(selectedUserId!),
    enabled: !!selectedUserId && showUserModal && selectedUserType === 'designer' && activeTab === 'transactions',
  });

  const { data: txCustomerData, isLoading: isLoadingTxCustomer } = useQuery({
    queryKey: ['customer', selectedUserId],
    queryFn: () => MockAPI.getCustomer(selectedUserId!),
    enabled: !!selectedUserId && showUserModal && selectedUserType === 'customer' && activeTab === 'transactions',
  });

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

  const handleReconcile = async (order: Order) => {
    setSelectedOrder(order);
    setIsReconciling(true);
    try {
      const response = await MockAPI.reconcileOrder(order.id);
      setReconcileResult(response);
      setShowReconcileModal(true);
    } catch (error) {
      toast.error('An error occurred while reconciling order');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCloseReconcileModal = () => {
    setShowReconcileModal(false);
    setSelectedOrder(null);
    setReconcileResult(null);
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

  // Transactions helper functions
  const getTxTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      plan_purchase: 'Plan Purchase',
      bulk_sale: 'Bulk Sale',
      individual_design: 'Individual Design',
      custom_order: 'Custom Order',
      designer_withdrawal: 'Designer Withdrawal',
      payout: 'Payout',
      refund: 'Refund',
    };
    return labels[type] || type;
  };

  const handleTxPageSizeChange = (newPageSize: number) => {
    setTxPageSize(newPageSize);
    setTxPage(1); // Reset to first page when page size changes
  };

  const handleTxRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowRefundModal(true);
  };

  const handleTxCloseRefundModal = () => {
    setShowRefundModal(false);
    setRefundReason('');
    setSelectedTransaction(null);
  };

  const handleTxSubmitRefund = async () => {
    if (!selectedTransaction) return;
    setIsProcessingRefund(true);
    try {
      const response = await MockAPI.initiateRefund(selectedTransaction.id, refundReason);
      if (response.success) {
        toast.success('Refund initiated successfully');
        handleTxCloseRefundModal();
        refetchTx();
      } else {
        toast.error(response.error || 'Failed to initiate refund');
      }
    } catch (error) {
      toast.error('An error occurred while processing refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleTxViewOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  const handleTxCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrderId(null);
  };

  const handleTxViewUser = (transaction: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDesigner = transaction.type === 'designer_withdrawal' || transaction.type === 'payout';
    setSelectedUserId(transaction.userId);
    setSelectedUserType(isDesigner ? 'designer' : 'customer');
    setShowUserModal(true);
  };

  const handleTxCloseUserModal = () => {
    setShowUserModal(false);
    setSelectedUserId(null);
    setSelectedUserType(null);
  };

  const handleExportTransactions = async () => {
    setIsExporting(true);
    try {
      // Fetch all filtered transactions without pagination
      const allTransactions = await MockAPI.getTransactions({ 
        limit: 10000, // Large limit to get all
        type: txTypeFilter,
        status: txStatusFilter,
      });

      if (!allTransactions.data || allTransactions.data.length === 0) {
        toast.error('No transactions to export');
        setIsExporting(false);
        return;
      }

      // Create CSV content
      const headers = [
        'Transaction #',
        'Type',
        'Category',
        'User/Designer',
        'Amount',
        'Status',
        'Document Type',
        'Razorpay ID',
        'Order Transaction Number',
        'Description',
        'Date',
      ];

      const rows = allTransactions.data.map((tx) => [
        tx.orderTransactionNumber || tx.id,
        getTxTypeLabel(tx.type),
        tx.category === 'order' ? 'Order' : 'Wallet',
        tx.userName,
        tx.amount < 0 ? `-${formatCurrency(Math.abs(tx.amount))}` : formatCurrency(tx.amount),
        tx.status,
        tx.orderTransactionType || '-',
        tx.razorpayId || '-',
        tx.orderTransactionNumber || '-',
        tx.description || '-',
        formatDate(tx.createdAt),
      ]);

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Create BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${allTransactions.data.length} transactions successfully`);
    } catch (error) {
      toast.error('Failed to export transactions');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter options
  const orderTypeFilterOptions = [
    { value: '', label: 'All Order Types' },
    { value: 'plan', label: 'Plan Orders' },
    { value: 'bundle', label: 'Bundle Orders' },
    { value: 'design', label: 'Design Orders' },
    { value: 'custom', label: 'Custom Orders' },
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const newStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  // Transactions filter options
  const categoryFilterOptions = [
    { value: '', label: 'All Categories' },
    { value: 'order', label: 'Order Transactions' },
    { value: 'wallet', label: 'Wallet Transactions' },
  ];

  const typeFilterOptions = [
    { value: '', label: 'All Types' },
    { value: 'plan_purchase', label: 'Plan Purchase' },
    { value: 'bulk_sale', label: 'Bulk Sale' },
    { value: 'individual_design', label: 'Individual Design' },
    { value: 'custom_order', label: 'Custom Order' },
    { value: 'designer_withdrawal', label: 'Designer Withdrawal' },
    { value: 'payout', label: 'Payout' },
    { value: 'refund', label: 'Refund' },
  ];

  const txStatusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const orderTransactionTypeFilterOptions = [
    { value: '', label: 'All Document Types' },
    { value: 'Invoice', label: 'Invoice' },
    { value: 'Bill', label: 'Bill' },
    { value: 'Receipt', label: 'Receipt' },
  ];

  const txPageSizeOptions = [
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
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted mt-1">Manage all order types in one place</p>
          </div>
          <Button variant="primary">Export Orders</Button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-primary hover:border-primary/50'
              )}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'transactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-primary hover:border-primary/50'
              )}
            >
              Transactions
            </button>
          </nav>
        </div>

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <>
            {/* Statistics Tiles */}
            {statsData?.data && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Dropdown
                    options={orderTypeFilterOptions}
                    value={orderTypeFilter}
                    onChange={setOrderTypeFilter}
                    placeholder="Filter by order type"
                  />

                  <Dropdown
                    options={statusFilterOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filter by status"
                  />

                  <Input
                    type="text"
                    placeholder="Customer ID"
                    value={userIdFilter}
                    onChange={(e) => setUserIdFilter(e.target.value)}
                    className="input-field"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      placeholder="Date From"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="input-field"
                    />
                    <Input
                      type="date"
                      placeholder="Date To"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="input-field"
                    />
                  </div>
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
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Type</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Customer</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Details</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Razorpay ID</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : !data?.data || data.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    (data?.data || []).map((order) => (
                      <tr key={order.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">{order.id}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary uppercase">
                            {getOrderTypeLabel(order.orderType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{order.customerName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-sm">{getOrderDetails(order)}</p>
                        </td>
                        <td className="py-3 px-4 font-bold whitespace-nowrap">{formatCurrency(order.amount)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            order.status === 'completed' ? 'bg-success/20 text-success' :
                            order.status === 'processing' ? 'bg-info/20 text-info' :
                            order.status === 'pending' ? 'bg-warning/20 text-warning' :
                            order.status === 'cancelled' ? 'bg-error/20 text-error' :
                            'bg-muted/20 text-muted'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-muted whitespace-nowrap">
                          {order.razorpayId || '-'}
                        </td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleReconcile(order)}
                              disabled={isReconciling}
                              className="flex items-center gap-1"
                              title="Reconcile"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                              <span className="text-xs">Reconcile</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
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

            {/* Reconcile Order Modal */}
            <Modal
              isOpen={showReconcileModal}
              onClose={handleCloseReconcileModal}
              title="Reconcile Order with Transaction"
              size="lg"
            >
              {selectedOrder && reconcileResult && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Order Details</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted">Order ID:</span> {selectedOrder.id}</p>
                      <p><span className="text-muted">Amount:</span> {formatCurrency(selectedOrder.amount)}</p>
                      <p><span className="text-muted">Razorpay Order ID:</span> {selectedOrder.razorpayOrderId || '-'}</p>
                      <p><span className="text-muted">Razorpay Payment ID:</span> {selectedOrder.razorpayId || '-'}</p>
                    </div>
                  </div>

                  {reconcileResult.success && reconcileResult.data.matched ? (
                    <>
                      <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircleIcon className="w-5 h-5 text-success" />
                          <p className="text-sm font-medium text-success">Transaction Found</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted">Transaction ID:</span> {reconcileResult.data.transaction.id}</p>
                          <p><span className="text-muted">Transaction Amount:</span> {formatCurrency(reconcileResult.data.transaction.amount)}</p>
                          <p><span className="text-muted">Transaction Status:</span> {reconcileResult.data.transaction.status}</p>
                          <p><span className="text-muted">Razorpay ID:</span> {reconcileResult.data.transaction.razorpayId || '-'}</p>
                        </div>
                      </div>

                      {reconcileResult.data.amountsMatch ? (
                        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-sm font-medium text-success">✓ Amounts match perfectly</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                          <p className="text-sm font-medium text-warning">⚠ Amount mismatch detected</p>
                          <p className="text-sm text-muted mt-1">
                            Difference: {formatCurrency(reconcileResult.data.amountDifference)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-error/10 rounded-lg border border-error/20">
                      <p className="text-sm font-medium text-error">No matching transaction found</p>
                      <p className="text-sm text-muted mt-1">
                        Could not find a corresponding Razorpay transaction for this order.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseReconcileModal}
                      className="flex items-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
          </>
        )}

        {/* Transactions Tab Content */}
        {activeTab === 'transactions' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Transactions</h1>
                <p className="text-muted mt-1">Monitor all financial transactions</p>
              </div>
              <Button 
                variant="primary"
                onClick={handleExportTransactions}
                disabled={isExporting}
                isLoading={isExporting}
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export Transactions
              </Button>
            </div>

            {/* Statistics Tiles */}
            {txStatsData?.data && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <KpiCard
                  title="Total Transactions"
                  value={txStatsData.data.total}
                  icon={<CurrencyDollarIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Pending Transactions"
                  value={txStatsData.data.pending}
                  icon={<ClockIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Completed Transactions"
                  value={txStatsData.data.completed}
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                />
                <KpiCard
                  title="Failed Transactions"
                  value={txStatsData.data.failed}
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
                      placeholder="Search by Order/Transaction Number..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Dropdown
                    options={categoryFilterOptions}
                    value={txCategoryFilter}
                    onChange={setTxCategoryFilter}
                    placeholder="Filter by category"
                  />
                  <Dropdown
                    options={typeFilterOptions}
                    value={txTypeFilter}
                    onChange={setTxTypeFilter}
                    placeholder="Filter by type"
                  />
                  <Dropdown
                    options={txStatusFilterOptions}
                    value={txStatusFilter}
                    onChange={setTxStatusFilter}
                    placeholder="Filter by status"
                  />
                  <Dropdown
                    options={orderTransactionTypeFilterOptions}
                    value={txOrderTransactionTypeFilter}
                    onChange={setTxOrderTransactionTypeFilter}
                    placeholder="Filter by document type"
                  />

                  <Input
                    type="text"
                    placeholder="Razorpay ID"
                    value={txRazorpayIdFilter}
                    onChange={(e) => setTxRazorpayIdFilter(e.target.value)}
                    className="input-field"
                  />

                  <Input
                    type="text"
                    placeholder="User/Designer ID"
                    value={txUserIdFilter}
                    onChange={(e) => setTxUserIdFilter(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Date Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date From</label>
                    <Input
                      type="date"
                      value={txDateFrom}
                      onChange={(e) => setTxDateFrom(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date To</label>
                    <Input
                      type="date"
                      value={txDateTo}
                      onChange={(e) => setTxDateTo(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="card overflow-x-auto">
              {/* Pagination - Top */}
              {txData?.pagination && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                  <p className="text-sm text-muted">
                    Showing {((txPage - 1) * txPageSize) + 1} to {Math.min(txPage * txPageSize, txData.pagination.total)} of {txData.pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted whitespace-nowrap">Show:</label>
                    <div className="w-20">
                      <Dropdown
                        options={txPageSizeOptions}
                        value={String(txPageSize)}
                        onChange={(value) => handleTxPageSizeChange(Number(value))}
                      />
                    </div>
                    <span className="text-sm text-muted whitespace-nowrap">per page</span>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Transaction #</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Category</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Action</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Related Order</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">User/Designer</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Razorpay ID</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTx ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : !txData?.data || txData.data.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-muted">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    (txData?.data || []).map((transaction) => (
                      <tr key={transaction.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">
                          {transaction.category === 'order' 
                            ? (transaction.orderTransactionNumber || transaction.id)
                            : transaction.id}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium uppercase ${
                            transaction.category === 'order' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-accent/20 text-accent'
                          }`}>
                            {transaction.category === 'order' ? 'Order' : 'Wallet'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium">
                              {getTxTypeLabel(transaction.type)}
                            </p>
                            {transaction.description && (
                              <p className="text-xs text-muted mt-0.5">{transaction.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {transaction.relatedOrderId ? (
                            <button
                              onClick={(e) => handleTxViewOrder(transaction.relatedOrderId!, e)}
                              className="font-mono text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                            >
                              {transaction.relatedOrderId}
                            </button>
                          ) : (
                            <span className="text-muted text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={(e) => handleTxViewUser(transaction, e)}
                            className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            {transaction.userName}
                          </button>
                        </td>
                        <td className={`py-3 px-4 font-bold whitespace-nowrap ${
                          transaction.amount < 0 ? 'text-error' : 'text-success'
                        }`}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' :
                            transaction.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' :
                            transaction.status === 'failed' 
                              ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' :
                            transaction.status === 'refunded' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700' :
                              'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-muted whitespace-nowrap">
                          {transaction.razorpayId || '-'}
                        </td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(transaction.createdAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {transaction.refundEligible && transaction.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleTxRefund(transaction)}
                            >
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination - Bottom */}
              {txData?.pagination && (
                <div className="flex items-center justify-end mt-6 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage(p => Math.max(1, p - 1))}
                      disabled={txPage === 1}
                      title="Previous"
                    >
                      <ArrowUpIcon className="w-4 h-4 rotate-90" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage(p => p + 1)}
                      disabled={txPage >= txData.pagination.totalPages}
                      title="Next"
                    >
                      <ArrowDownIcon className="w-4 h-4 rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Refund Modal */}
            <Modal
              isOpen={showRefundModal}
              onClose={handleTxCloseRefundModal}
              title="Initiate Refund"
              size="md"
            >
              {selectedTransaction && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Transaction Details</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted">Transaction #:</span> {selectedTransaction.orderTransactionNumber || selectedTransaction.id}</p>
                      <p><span className="text-muted">Amount:</span> {formatCurrency(selectedTransaction.amount)}</p>
                      <p><span className="text-muted">User:</span> {selectedTransaction.userName}</p>
                      <p><span className="text-muted">Description:</span> {selectedTransaction.description || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Refund Reason (Optional)</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="input-field w-full min-h-[100px] resize-none"
                      placeholder="Enter reason for refund..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleTxCloseRefundModal}
                      className="flex items-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={handleTxSubmitRefund}
                      disabled={isProcessingRefund}
                      isLoading={isProcessingRefund}
                      className="flex items-center gap-2"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Initiate Refund
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

            {/* Order Details Modal */}
            <Modal
              isOpen={showOrderModal}
              onClose={handleTxCloseOrderModal}
              title="Order Details"
              size="lg"
            >
              {isLoadingTxOrder ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : txOrderData?.success && txOrderData.data ? (
                <div className="space-y-6">
                  {/* Order Header Card */}
                  <div className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ShoppingCartIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wide mb-1">Order ID</p>
                          <p className="font-mono text-lg font-bold">{txOrderData.data.id}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                        txOrderData.data.status === 'completed' ? 'bg-success/20 text-success border border-success/30' :
                        txOrderData.data.status === 'pending' ? 'bg-warning/20 text-warning border border-warning/30' :
                        txOrderData.data.status === 'processing' ? 'bg-primary/20 text-primary border border-primary/30' :
                        txOrderData.data.status === 'cancelled' ? 'bg-error/20 text-error border border-error/30' :
                        'bg-muted/20 text-muted border border-muted/30'
                      }`}>
                        {txOrderData.data.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Information Card */}
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Customer</h3>
                      </div>
                      <p className="text-base font-medium mb-1">{txOrderData.data.customerName}</p>
                      <p className="text-xs text-muted font-mono">ID: {txOrderData.data.customerId}</p>
                    </div>

                    {/* Order Type Card */}
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentTextIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Order Type</h3>
                      </div>
                      <p className="text-base font-medium capitalize">{txOrderData.data.orderType}</p>
                    </div>
                  </div>

                  {/* Order Details Based on Type */}
                  {txOrderData.data.orderType === 'plan' && txOrderData.data.planName && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CubeIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Plan Details</h3>
                      </div>
                      <p className="text-base font-medium mb-1">{txOrderData.data.planName}</p>
                      {txOrderData.data.planId && (
                        <p className="text-xs text-muted font-mono">Plan ID: {txOrderData.data.planId}</p>
                      )}
                    </div>
                  )}

                  {txOrderData.data.orderType === 'bundle' && txOrderData.data.bundleName && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CubeIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Bundle Details</h3>
                      </div>
                      <p className="text-base font-medium mb-1">{txOrderData.data.bundleName}</p>
                      {txOrderData.data.bundleId && (
                        <p className="text-xs text-muted font-mono mb-2">Bundle ID: {txOrderData.data.bundleId}</p>
                      )}
                      {txOrderData.data.designIds && txOrderData.data.designIds.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <PhotoIcon className="w-4 h-4 text-muted" />
                          <p className="text-sm text-muted">
                            {txOrderData.data.designIds.length} design{txOrderData.data.designIds.length !== 1 ? 's' : ''} included
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {txOrderData.data.orderType === 'design' && txOrderData.data.designName && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <PhotoIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Design Details</h3>
                      </div>
                      <p className="text-base font-medium mb-1">{txOrderData.data.designName}</p>
                      {txOrderData.data.designId && (
                        <p className="text-xs text-muted font-mono">Design ID: {txOrderData.data.designId}</p>
                      )}
                    </div>
                  )}

                  {txOrderData.data.orderType === 'custom' && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentTextIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Custom Order Details</h3>
                      </div>
                      {txOrderData.data.customOrderId && (
                        <p className="text-xs text-muted font-mono mb-3">Custom Order ID: {txOrderData.data.customOrderId}</p>
                      )}
                      {txOrderData.data.designerName && (
                        <div className="mb-2">
                          <p className="text-xs text-muted mb-1">Designer</p>
                          <p className="text-sm font-medium">{txOrderData.data.designerName}</p>
                        </div>
                      )}
                      {txOrderData.data.description && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted mb-1">Description</p>
                          <p className="text-sm text-muted">{txOrderData.data.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount Card */}
                  <div className="p-5 bg-gradient-to-r from-success/10 to-success/5 rounded-xl border border-success/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CurrencyDollarIcon className="w-6 h-6 text-success" />
                        <span className="text-sm font-semibold">Total Amount</span>
                      </div>
                      <span className="text-2xl font-bold text-success">
                        {formatCurrency(txOrderData.data.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Information Card */}
                  {(txOrderData.data.razorpayId || txOrderData.data.razorpayOrderId) && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCardIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Payment Information</h3>
                      </div>
                      <div className="space-y-2">
                        {txOrderData.data.razorpayId && (
                          <div>
                            <p className="text-xs text-muted mb-1">Razorpay ID</p>
                            <p className="text-sm font-mono font-medium">{txOrderData.data.razorpayId}</p>
                          </div>
                        )}
                        {txOrderData.data.razorpayOrderId && (
                          <div>
                            <p className="text-xs text-muted mb-1">Razorpay Order ID</p>
                            <p className="text-sm font-mono font-medium">{txOrderData.data.razorpayOrderId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates Card */}
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-semibold">Timeline</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted mb-1">Created At</p>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-muted" />
                          <p className="text-sm font-medium">{formatDate(txOrderData.data.createdAt)}</p>
                        </div>
                      </div>
                      {txOrderData.data.completedAt && (
                        <div>
                          <p className="text-xs text-muted mb-1">Completed At</p>
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-success" />
                            <p className="text-sm font-medium">{formatDate(txOrderData.data.completedAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleTxCloseOrderModal}
                      className="flex items-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <p>Order not found</p>
                </div>
              )}
            </Modal>

            {/* User/Designer Details Modal */}
            <Modal
              isOpen={showUserModal}
              onClose={handleTxCloseUserModal}
              title={selectedUserType === 'designer' ? 'Designer Details' : 'Customer Details'}
              size="xl"
            >
              {selectedUserType === 'designer' ? (
                isLoadingTxDesigner ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : txDesignerData?.success && txDesignerData.data ? (
                  <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold border-b border-border pb-2">Designer Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Name</label>
                          <p className="text-muted">{txDesignerData.data.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email</label>
                          <p className="text-muted">{txDesignerData.data.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Joined Date</label>
                          <p className="text-muted">{formatDate(txDesignerData.data.joinedAt)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Status</label>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            txDesignerData.data.status === 'active' ? 'bg-success/20 text-success' :
                            txDesignerData.data.status === 'pending' ? 'bg-warning/20 text-warning' :
                            txDesignerData.data.status === 'suspended' ? 'bg-error/20 text-error' :
                            'bg-muted/20 text-muted'
                          }`}>
                            {txDesignerData.data.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Onboarding Status</label>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            txDesignerData.data.onboardingStatus === 'admin_approved' ? 'bg-success/20 text-success' :
                            txDesignerData.data.onboardingStatus === 'moderator_approved' ? 'bg-warning/20 text-warning' :
                            txDesignerData.data.onboardingStatus === 'rejected' ? 'bg-error/20 text-error' :
                            'bg-muted/20 text-muted'
                          }`}>
                            {txDesignerData.data.onboardingStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Lifetime Earnings</label>
                          <p className="text-muted font-medium">{formatCurrency(txDesignerData.data.lifetimeEarnings)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Pending Payout</label>
                          <p className="text-muted font-medium">{formatCurrency(txDesignerData.data.pendingPayout)}</p>
                        </div>
                        {txDesignerData.data.razorpayId && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Razorpay ID</label>
                            <p className="text-muted font-mono text-sm">{txDesignerData.data.razorpayId}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Close Button */}
                    <div className="flex justify-end pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        onClick={handleTxCloseUserModal}
                        className="flex items-center gap-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted">
                    <p>Designer not found</p>
                  </div>
                )
              ) : (
                isLoadingTxCustomer ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : txCustomerData?.success && txCustomerData.data ? (
                  <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                    {/* Customer Header Card */}
                    <div className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <UserIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted uppercase tracking-wide mb-1">Customer</p>
                          <p className="text-lg font-bold mb-2">{txCustomerData.data.name}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                              txCustomerData.data.status === 'active' ? 'bg-success/20 text-success border border-success/30' :
                              txCustomerData.data.status === 'inactive' ? 'bg-muted/20 text-muted border border-muted/30' :
                              txCustomerData.data.status === 'suspended' ? 'bg-warning/20 text-warning border border-warning/30' :
                              'bg-error/20 text-error border border-error/30'
                            }`}>
                              {txCustomerData.data.status}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                              txCustomerData.data.planStatus === 'active' ? 'bg-success/20 text-success border border-success/30' :
                              txCustomerData.data.planStatus === 'expired' ? 'bg-warning/20 text-warning border border-warning/30' :
                              'bg-muted/20 text-muted border border-muted/30'
                            }`}>
                              Plan: {txCustomerData.data.planStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Card */}
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <EnvelopeIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Contact Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted mb-1">Email</p>
                          <div className="flex items-center gap-2">
                            <EnvelopeIcon className="w-4 h-4 text-muted" />
                            <p className="text-sm font-medium">{txCustomerData.data.email}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Phone Number</p>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-muted" />
                            <p className="text-sm font-medium">{txCustomerData.data.phoneNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Information Card */}
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold">Account Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted mb-1">Joined Date</p>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-muted" />
                            <p className="text-sm font-medium">{formatDate(txCustomerData.data.joinedAt)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Customer ID</p>
                          <p className="text-sm font-mono font-medium">{txCustomerData.data.id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address Card */}
                    {txCustomerData.data.address && (
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-4">
                          <MapPinIcon className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-semibold">Address</h3>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{txCustomerData.data.address?.street || 'N/A'}</p>
                          <p className="text-sm text-muted">
                            {txCustomerData.data.address ? `${txCustomerData.data.address.city || ''}, ${txCustomerData.data.address.state || ''} ${txCustomerData.data.address.pincode || ''}` : 'N/A'}
                          </p>
                          <p className="text-sm text-muted">{txCustomerData.data.address?.country || 'N/A'}</p>
                        </div>
                      </div>
                    )}

                    {/* Active Subscription Plan */}
                    {txCustomerData.data.plan ? (
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-4">
                          <CubeIcon className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-semibold">Active Subscription Plan</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted mb-1">Plan Name</p>
                            <p className="text-sm font-medium">{txCustomerData.data.plan.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted mb-1">Plan Type</p>
                            <p className="text-sm font-medium capitalize">{txCustomerData.data.plan.type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted mb-1">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold capitalize ${
                              txCustomerData.data.plan.status === 'active' ? 'bg-success/20 text-success border border-success/30' :
                              txCustomerData.data.plan.status === 'expired' ? 'bg-warning/20 text-warning border border-warning/30' :
                              'bg-muted/20 text-muted border border-muted/30'
                            }`}>
                              {txCustomerData.data.plan.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-muted mb-1">Start Date</p>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-muted" />
                              <p className="text-sm font-medium">{formatDate(txCustomerData.data.plan.startDate)}</p>
                            </div>
                          </div>
                          {txCustomerData.data.plan.expiryDate && (
                            <div>
                              <p className="text-xs text-muted mb-1">Expiry Date</p>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-muted" />
                                <p className="text-sm font-medium">{formatDate(txCustomerData.data.plan.expiryDate)}</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted mb-1">Available Downloads</p>
                            <p className="text-sm font-medium">{txCustomerData.data.plan.availableDownloads}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted mb-1">Total Downloads</p>
                            <p className="text-sm font-medium">{txCustomerData.data.plan.totalDownloads}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-4">
                          <CubeIcon className="w-5 h-5 text-muted" />
                          <h3 className="text-sm font-semibold">Active Subscription Plan</h3>
                        </div>
                        <p className="text-sm text-muted">No active subscription plan</p>
                      </div>
                    )}

                    {/* Close Button */}
                    <div className="flex justify-end pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        onClick={handleTxCloseUserModal}
                        className="flex items-center gap-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted">
                    <p>Customer not found</p>
                  </div>
                )
              )}
            </Modal>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

