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
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { Order } from '@/types';
import toast from 'react-hot-toast';

export default function OrdersPage() {
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', page, pageSize, search, orderTypeFilter, statusFilter, userIdFilter, dateFrom, dateTo],
    queryFn: () => MockAPI.getOrders({ 
      page, 
      limit: pageSize,
      type: orderTypeFilter,
      status: statusFilter,
    }),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => MockAPI.getOrderStats(),
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
    </DashboardLayout>
  );
}

