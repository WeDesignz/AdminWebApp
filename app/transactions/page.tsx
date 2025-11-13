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
import { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  UserIcon,
  ShoppingCartIcon,
  CalendarIcon,
  CreditCardIcon,
  CubeIcon,
  PhotoIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Transaction, Order, Designer, Customer } from '@/types';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTransactionTypeFilter, setOrderTransactionTypeFilter] = useState('');
  const [razorpayIdFilter, setRazorpayIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'designer' | 'customer' | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transactions', page, pageSize, search, categoryFilter, typeFilter, statusFilter, orderTransactionTypeFilter, razorpayIdFilter, dateFrom, dateTo, userIdFilter],
    queryFn: () => MockAPI.getTransactions({ 
      page, 
      limit: pageSize,
      search,
      category: categoryFilter,
      type: typeFilter,
      status: statusFilter,
      orderTransactionType: orderTransactionTypeFilter,
      razorpayId: razorpayIdFilter,
      dateFrom,
      dateTo,
      userId: userIdFilter,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['transactionStats'],
    queryFn: () => MockAPI.getTransactionStats(),
  });

  const { data: orderData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => MockAPI.getOrder(selectedOrderId!),
    enabled: !!selectedOrderId && showOrderModal,
  });

  const { data: designerData, isLoading: isLoadingDesigner } = useQuery({
    queryKey: ['designer', selectedUserId],
    queryFn: () => MockAPI.getDesigner(selectedUserId!),
    enabled: !!selectedUserId && showUserModal && selectedUserType === 'designer',
  });

  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', selectedUserId],
    queryFn: () => MockAPI.getCustomer(selectedUserId!),
    enabled: !!selectedUserId && showUserModal && selectedUserType === 'customer',
  });

  const handleRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowRefundModal(true);
  };

  const handleViewOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrderId(null);
  };

  const handleViewUser = (transaction: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDesigner = transaction.type === 'designer_withdrawal' || transaction.type === 'payout';
    setSelectedUserId(transaction.userId);
    setSelectedUserType(isDesigner ? 'designer' : 'customer');
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setSelectedUserId(null);
    setSelectedUserType(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    setRefundReason('');
    setSelectedTransaction(null);
  };

  const handleSubmitRefund = async () => {
    if (!selectedTransaction) return;
    setIsProcessingRefund(true);
    try {
      const response = await MockAPI.initiateRefund(selectedTransaction.id, refundReason);
      if (response.success) {
        toast.success('Refund initiated successfully');
        handleCloseRefundModal();
        refetch();
      } else {
        toast.error(response.error || 'Failed to initiate refund');
      }
    } catch (error) {
      toast.error('An error occurred while processing refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Filter options
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

  const statusFilterOptions = [
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

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  const getTypeLabel = (type: string) => {
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

  const handleExportTransactions = async () => {
    setIsExporting(true);
    try {
      // Fetch all filtered transactions without pagination
      const allTransactions = await MockAPI.getTransactions({ 
        limit: 10000, // Large limit to get all
        search,
        category: categoryFilter,
        type: typeFilter,
        status: statusFilter,
        orderTransactionType: orderTransactionTypeFilter,
        razorpayId: razorpayIdFilter,
        dateFrom,
        dateTo,
        userId: userIdFilter,
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
        getTypeLabel(tx.type),
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
        {statsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <KpiCard
              title="Total Transactions"
              value={statsData.data.totalTransactions}
              icon={<CurrencyDollarIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(statsData.data.totalRevenue)}
              icon={<BanknotesIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Monthly Revenue"
              value={formatCurrency(statsData.data.monthlyRevenue)}
              icon={<CurrencyDollarIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Total Refunds"
              value={formatCurrency(statsData.data.totalRefunds)}
              icon={<ArrowPathIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Pending Transactions"
              value={statsData.data.pendingTransactions}
              icon={<ClockIcon className="w-6 h-6" />}
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Dropdown
                options={categoryFilterOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
              />
              <Dropdown
                options={typeFilterOptions}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Filter by type"
              />
              <Dropdown
                options={statusFilterOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
              <Dropdown
                options={orderTransactionTypeFilterOptions}
                value={orderTransactionTypeFilter}
                onChange={setOrderTransactionTypeFilter}
                placeholder="Filter by document type"
              />

              <Input
                type="text"
                placeholder="Razorpay ID"
                value={razorpayIdFilter}
                onChange={(e) => setRazorpayIdFilter(e.target.value)}
                className="input-field"
              />

              <Input
                type="text"
                placeholder="User/Designer ID"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
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
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted">
                    No transactions found
                  </td>
                </tr>
              ) : (
                data?.data.map((transaction) => (
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
                          {getTypeLabel(transaction.type)}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-muted mt-0.5">{transaction.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {transaction.relatedOrderId ? (
                        <button
                          onClick={(e) => handleViewOrder(transaction.relatedOrderId!, e)}
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
                        onClick={(e) => handleViewUser(transaction, e)}
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
                          onClick={() => handleRefund(transaction)}
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
      </div>

      {/* Refund Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={handleCloseRefundModal}
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
                onClick={handleCloseRefundModal}
                className="flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleSubmitRefund}
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
        onClose={handleCloseOrderModal}
        title="Order Details"
        size="lg"
      >
        {isLoadingOrder ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : orderData?.success && orderData.data ? (
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
                    <p className="font-mono text-lg font-bold">{orderData.data.id}</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                  orderData.data.status === 'completed' ? 'bg-success/20 text-success border border-success/30' :
                  orderData.data.status === 'pending' ? 'bg-warning/20 text-warning border border-warning/30' :
                  orderData.data.status === 'processing' ? 'bg-primary/20 text-primary border border-primary/30' :
                  orderData.data.status === 'cancelled' ? 'bg-error/20 text-error border border-error/30' :
                  'bg-muted/20 text-muted border border-muted/30'
                }`}>
                  {orderData.data.status}
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
                <p className="text-base font-medium mb-1">{orderData.data.customerName}</p>
                <p className="text-xs text-muted font-mono">ID: {orderData.data.customerId}</p>
              </div>

              {/* Order Type Card */}
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Order Type</h3>
                </div>
                <p className="text-base font-medium capitalize">{orderData.data.orderType}</p>
              </div>
            </div>

            {/* Order Details Based on Type */}
            {orderData.data.orderType === 'plan' && orderData.data.planName && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <CubeIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Plan Details</h3>
                </div>
                <p className="text-base font-medium mb-1">{orderData.data.planName}</p>
                {orderData.data.planId && (
                  <p className="text-xs text-muted font-mono">Plan ID: {orderData.data.planId}</p>
                )}
              </div>
            )}

            {orderData.data.orderType === 'bundle' && orderData.data.bundleName && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <CubeIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Bundle Details</h3>
                </div>
                <p className="text-base font-medium mb-1">{orderData.data.bundleName}</p>
                {orderData.data.bundleId && (
                  <p className="text-xs text-muted font-mono mb-2">Bundle ID: {orderData.data.bundleId}</p>
                )}
                {orderData.data.designIds && orderData.data.designIds.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <PhotoIcon className="w-4 h-4 text-muted" />
                    <p className="text-sm text-muted">
                      {orderData.data.designIds.length} design{orderData.data.designIds.length !== 1 ? 's' : ''} included
                    </p>
                  </div>
                )}
              </div>
            )}

            {orderData.data.orderType === 'design' && orderData.data.designName && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <PhotoIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Design Details</h3>
                </div>
                <p className="text-base font-medium mb-1">{orderData.data.designName}</p>
                {orderData.data.designId && (
                  <p className="text-xs text-muted font-mono">Design ID: {orderData.data.designId}</p>
                )}
              </div>
            )}

            {orderData.data.orderType === 'custom' && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Custom Order Details</h3>
                </div>
                {orderData.data.customOrderId && (
                  <p className="text-xs text-muted font-mono mb-3">Custom Order ID: {orderData.data.customOrderId}</p>
                )}
                {orderData.data.designerName && (
                  <div className="mb-2">
                    <p className="text-xs text-muted mb-1">Designer</p>
                    <p className="text-sm font-medium">{orderData.data.designerName}</p>
                  </div>
                )}
                {orderData.data.description && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted mb-1">Description</p>
                    <p className="text-sm text-muted">{orderData.data.description}</p>
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
                  {formatCurrency(orderData.data.amount)}
                </span>
              </div>
            </div>

            {/* Payment Information Card */}
            {(orderData.data.razorpayId || orderData.data.razorpayOrderId) && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCardIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Payment Information</h3>
                </div>
                <div className="space-y-2">
                  {orderData.data.razorpayId && (
                    <div>
                      <p className="text-xs text-muted mb-1">Razorpay ID</p>
                      <p className="text-sm font-mono font-medium">{orderData.data.razorpayId}</p>
                    </div>
                  )}
                  {orderData.data.razorpayOrderId && (
                    <div>
                      <p className="text-xs text-muted mb-1">Razorpay Order ID</p>
                      <p className="text-sm font-mono font-medium">{orderData.data.razorpayOrderId}</p>
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
                    <p className="text-sm font-medium">{formatDate(orderData.data.createdAt)}</p>
                  </div>
                </div>
                {orderData.data.completedAt && (
                  <div>
                    <p className="text-xs text-muted mb-1">Completed At</p>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-success" />
                      <p className="text-sm font-medium">{formatDate(orderData.data.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={handleCloseOrderModal}
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
        onClose={handleCloseUserModal}
        title={selectedUserType === 'designer' ? 'Designer Details' : 'Customer Details'}
        size="xl"
      >
        {selectedUserType === 'designer' ? (
          isLoadingDesigner ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : designerData?.success && designerData.data ? (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Designer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <p className="text-muted">{designerData.data.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <p className="text-muted">{designerData.data.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Joined Date</label>
                    <p className="text-muted">{formatDate(designerData.data.joinedAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      designerData.data.status === 'active' ? 'bg-success/20 text-success' :
                      designerData.data.status === 'pending' ? 'bg-warning/20 text-warning' :
                      designerData.data.status === 'suspended' ? 'bg-error/20 text-error' :
                      'bg-muted/20 text-muted'
                    }`}>
                      {designerData.data.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Onboarding Status</label>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      designerData.data.onboardingStatus === 'admin_approved' ? 'bg-success/20 text-success' :
                      designerData.data.onboardingStatus === 'moderator_approved' ? 'bg-warning/20 text-warning' :
                      designerData.data.onboardingStatus === 'rejected' ? 'bg-error/20 text-error' :
                      'bg-muted/20 text-muted'
                    }`}>
                      {designerData.data.onboardingStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lifetime Earnings</label>
                    <p className="text-muted font-medium">{formatCurrency(designerData.data.lifetimeEarnings)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pending Payout</label>
                    <p className="text-muted font-medium">{formatCurrency(designerData.data.pendingPayout)}</p>
                  </div>
                  {designerData.data.razorpayId && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Razorpay ID</label>
                      <p className="text-muted font-mono text-sm">{designerData.data.razorpayId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handleCloseUserModal}
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
          isLoadingCustomer ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : customerData?.success && customerData.data ? (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
              {/* Customer Header Card */}
              <div className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <UserIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">Customer</p>
                    <p className="text-lg font-bold mb-2">{customerData.data.name}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                        customerData.data.status === 'active' ? 'bg-success/20 text-success border border-success/30' :
                        customerData.data.status === 'inactive' ? 'bg-muted/20 text-muted border border-muted/30' :
                        customerData.data.status === 'suspended' ? 'bg-warning/20 text-warning border border-warning/30' :
                        'bg-error/20 text-error border border-error/30'
                      }`}>
                        {customerData.data.status}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                        customerData.data.planStatus === 'active' ? 'bg-success/20 text-success border border-success/30' :
                        customerData.data.planStatus === 'expired' ? 'bg-warning/20 text-warning border border-warning/30' :
                        'bg-muted/20 text-muted border border-muted/30'
                      }`}>
                        Plan: {customerData.data.planStatus}
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
                      <p className="text-sm font-medium">{customerData.data.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-muted" />
                      <p className="text-sm font-medium">{customerData.data.phoneNumber || 'N/A'}</p>
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
                      <p className="text-sm font-medium">{formatDate(customerData.data.joinedAt)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Customer ID</p>
                    <p className="text-sm font-mono font-medium">{customerData.data.id}</p>
                  </div>
                </div>
              </div>

              {/* Address Card */}
              {customerData.data.address && (
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPinIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-semibold">Address</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{customerData.data.address.street}</p>
                    <p className="text-sm text-muted">
                      {customerData.data.city}, {customerData.data.state} {customerData.data.pincode}
                    </p>
                    <p className="text-sm text-muted">{customerData.data.address.country}</p>
                  </div>
                </div>
              )}

              {/* Active Subscription Plan */}
              {customerData.data.plan ? (
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <CubeIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-semibold">Active Subscription Plan</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted mb-1">Plan Name</p>
                      <p className="text-sm font-medium">{customerData.data.plan.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Plan Type</p>
                      <p className="text-sm font-medium capitalize">{customerData.data.plan.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold capitalize ${
                        customerData.data.plan.status === 'active' ? 'bg-success/20 text-success border border-success/30' :
                        customerData.data.plan.status === 'expired' ? 'bg-warning/20 text-warning border border-warning/30' :
                        'bg-muted/20 text-muted border border-muted/30'
                      }`}>
                        {customerData.data.plan.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Start Date</p>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-muted" />
                        <p className="text-sm font-medium">{formatDate(customerData.data.plan.startDate)}</p>
                      </div>
                    </div>
                    {customerData.data.plan.expiryDate && (
                      <div>
                        <p className="text-xs text-muted mb-1">Expiry Date</p>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted" />
                          <p className="text-sm font-medium">{formatDate(customerData.data.plan.expiryDate)}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted mb-1">Available Downloads</p>
                      <p className="text-sm font-medium">{customerData.data.plan.availableDownloads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Total Downloads</p>
                      <p className="text-sm font-medium">{customerData.data.plan.totalDownloads}</p>
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
                  onClick={handleCloseUserModal}
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
    </DashboardLayout>
  );
}
