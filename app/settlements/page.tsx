'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
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
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

interface Settlement {
  id: number;
  designer_id: number;
  designer_name: string;
  designer_email: string;
  designer_phone: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  settlement_period_start: string;
  settlement_period_end: string;
  settlement_period: string;
  settlement_amount: number;
  status: 'pending' | 'opted_in' | 'processing' | 'completed' | 'failed' | 'expired';
  opted_in: boolean;
  opted_in_at: string | null;
  settlement_date: string | null;
  failure_reason: string | null;
  created_at: string;
}

export default function SettlementsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<number[]>([]);
  const [newStatus, setNewStatus] = useState<'processing' | 'completed' | 'failed'>('completed');
  const [failureReason, setFailureReason] = useState('');
  const [manualReferenceId, setManualReferenceId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // Helper function to convert month/year to period_start date
  const getPeriodStartFromMonthYear = (month: number | '', year: number | ''): string | undefined => {
    if (!month || !year) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  };

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Fetch settlements
  const periodStart = getPeriodStartFromMonthYear(monthFilter, yearFilter);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settlements', page, pageSize, statusFilter, monthFilter, yearFilter],
    queryFn: () => API.settlement.listSettlements({
      page,
      page_size: pageSize,
      status: statusFilter || undefined,
      period_start: periodStart || undefined,
    }),
  });

  const settlements = data?.data?.data || [];
  const totalCount = data?.data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Check if current month settlements are pending
  const isCurrentMonthPending = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // If today is before Day 6, current month settlements are pending
    if (currentDay < 6) {
      return true;
    }
    
    // Check if viewing current month
    if (monthFilter && yearFilter && monthFilter === currentMonth && yearFilter === currentYear) {
      return true;
    }
    
    // If no filter is set, check if we're viewing current month data
    if (!monthFilter && !yearFilter) {
      // Check if any settlement in the list is from current month
      const hasCurrentMonthSettlement = settlements.some((s: Settlement) => {
        const settlementDate = new Date(s.settlement_period_start);
        return settlementDate.getMonth() + 1 === currentMonth && settlementDate.getFullYear() === currentYear;
      });
      return hasCurrentMonthSettlement && currentDay < 6;
    }
    
    return false;
  };

  // Disable download button for current month
  const canDownloadSheet = !isCurrentMonthPending();

  // Calculate stats
  const stats = {
    total: totalCount,
    pending: settlements.filter((s: Settlement) => s.status === 'pending').length,
    optedIn: settlements.filter((s: Settlement) => s.status === 'opted_in').length,
    processing: settlements.filter((s: Settlement) => s.status === 'processing').length,
    completed: settlements.filter((s: Settlement) => s.status === 'completed').length,
    failed: settlements.filter((s: Settlement) => s.status === 'failed').length,
  };

  // Download settlement sheet mutation
  const downloadSheetMutation = useMutation({
    mutationFn: async () => {
      const periodStartForDownload = getPeriodStartFromMonthYear(monthFilter, yearFilter);
      const blob = await API.settlement.downloadSettlementSheet({
        format: downloadFormat,
        status: statusFilter || undefined,
        period_start: periodStartForDownload || undefined,
        search: search || undefined,
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement_sheet_${new Date().toISOString().split('T')[0]}.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Settlement sheet downloaded successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to download settlement sheet');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      status: 'processing' | 'completed' | 'failed';
      failure_reason?: string;
      manual_reference_id?: string;
      admin_notes?: string;
    }) => {
      if (!selectedSettlement) throw new Error('No settlement selected');
      return API.settlement.updateSettlementStatus(selectedSettlement.id, data);
    },
    onSuccess: () => {
      toast.success('Settlement status updated successfully');
      setShowStatusModal(false);
      setSelectedSettlement(null);
      setFailureReason('');
      setManualReferenceId('');
      setAdminNotes('');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update settlement status');
    },
  });

  // Bulk update status mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: {
      settlement_ids: number[];
      status: 'processing' | 'completed' | 'failed';
      failure_reason?: string;
      manual_reference_ids?: Record<string, string>;
      admin_notes?: string;
    }) => {
      return API.settlement.bulkUpdateSettlementStatus(data);
    },
    onSuccess: () => {
      toast.success('Settlements updated successfully');
      setShowBulkStatusModal(false);
      setSelectedSettlements([]);
      setFailureReason('');
      setManualReferenceId('');
      setAdminNotes('');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update settlements');
    },
  });

  const handleUpdateStatus = () => {
    if (!selectedSettlement) return;
    
    if (newStatus === 'failed' && !failureReason.trim()) {
      toast.error('Failure reason is required when status is failed');
      return;
    }

    setIsUpdating(true);
    updateStatusMutation.mutate({
      status: newStatus,
      failure_reason: failureReason || undefined,
      manual_reference_id: manualReferenceId || undefined,
      admin_notes: adminNotes || undefined,
    });
    setIsUpdating(false);
  };

  const handleBulkUpdate = () => {
    if (selectedSettlements.length === 0) {
      toast.error('Please select at least one settlement');
      return;
    }

    if (newStatus === 'failed' && !failureReason.trim()) {
      toast.error('Failure reason is required when status is failed');
      return;
    }

    setIsUpdating(true);
    bulkUpdateMutation.mutate({
      settlement_ids: selectedSettlements,
      status: newStatus,
      failure_reason: failureReason || undefined,
      admin_notes: adminNotes || undefined,
    });
    setIsUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      opted_in: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', styles[status as keyof typeof styles] || styles.pending)}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const toggleSettlementSelection = (id: number) => {
    setSelectedSettlements(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectAllSettlements = () => {
    if (selectedSettlements.length === settlements.length) {
      setSelectedSettlements([]);
    } else {
      setSelectedSettlements(settlements.map((s: Settlement) => s.id));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settlement Management</h1>
            <p className="text-muted mt-1">Manage designer settlements and payouts</p>
          </div>
          <div className="flex gap-3">
            <Dropdown
              value={downloadFormat}
              onChange={(value) => setDownloadFormat(value as 'xlsx' | 'csv')}
              options={[
                { value: 'xlsx', label: 'Excel (.xlsx)' },
                { value: 'csv', label: 'CSV (.csv)' },
              ]}
            />
            <div className="relative group">
              <Button
                variant="primary"
                onClick={() => downloadSheetMutation.mutate()}
                disabled={downloadSheetMutation.isPending || !canDownloadSheet}
                isLoading={downloadSheetMutation.isPending}
                className="flex items-center gap-2"
                title={!canDownloadSheet ? 'Current month settlements are pending. Download will be available after Day 6.' : ''}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download Sheet
              </Button>
              {!canDownloadSheet && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Current month settlements are pending. Download will be available after Day 6.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
            {selectedSettlements.length > 0 && (
              <Button
                variant="primary"
                onClick={() => setShowBulkStatusModal(true)}
                className="flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                Bulk Update ({selectedSettlements.length})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4">
          <KpiCard title="Total" value={stats.total} />
          <KpiCard title="Pending" value={stats.pending} />
          <KpiCard title="Opted In" value={stats.optedIn} />
          <KpiCard title="Processing" value={stats.processing} />
          <KpiCard title="Completed" value={stats.completed} />
          <KpiCard title="Failed" value={stats.failed} />
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by designer name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'opted_in', label: 'Opted In' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'expired', label: 'Expired' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Dropdown
                value={monthFilter === '' ? '' : String(monthFilter)}
                onChange={(value) => setMonthFilter(value === '' ? '' : Number(value))}
                options={monthOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Dropdown
                value={yearFilter === '' ? '' : String(yearFilter)}
                onChange={(value) => setYearFilter(value === '' ? '' : Number(value))}
                options={[
                  { value: '', label: 'All Years' },
                  ...yearOptions.map(year => ({ value: String(year), label: String(year) })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Settlements Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      checked={selectedSettlements.length === settlements.length && settlements.length > 0}
                      onChange={selectAllSettlements}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-4">Settlement ID</th>
                  <th className="text-left p-4">Designer</th>
                  <th className="text-left p-4">Period</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Settlement Date</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : settlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted">
                      No settlements found
                    </td>
                  </tr>
                ) : (
                  settlements
                    .filter((s: Settlement) => {
                      if (!search) return true;
                      const searchLower = search.toLowerCase();
                      return (
                        s.designer_name?.toLowerCase().includes(searchLower) ||
                        s.designer_email?.toLowerCase().includes(searchLower) ||
                        s.id.toString().includes(searchLower)
                      );
                    })
                    .map((settlement: Settlement) => (
                      <tr key={settlement.id} className="border-b border-border hover:bg-muted/5">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedSettlements.includes(settlement.id)}
                            onChange={() => toggleSettlementSelection(settlement.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 font-medium">#{settlement.id}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{settlement.designer_name}</p>
                            <p className="text-sm text-muted">{settlement.designer_email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {settlement.settlement_period || `${formatDate(settlement.settlement_period_start)} - ${formatDate(settlement.settlement_period_end)}`}
                        </td>
                        <td className="p-4 font-medium">{formatCurrency(settlement.settlement_amount)}</td>
                        <td className="p-4">{getStatusBadge(settlement.status)}</td>
                        <td className="p-4 text-sm">
                          {settlement.settlement_date ? formatDate(settlement.settlement_date) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setShowDetailsModal(true);
                              }}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                            {settlement.status === 'processing' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedSettlement(settlement);
                                  setNewStatus('completed');
                                  setShowStatusModal(true);
                                }}
                              >
                                Update Status
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSettlement(null);
        }}
        title="Settlement Details"
        size="xl"
      >
        {selectedSettlement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Settlement ID</label>
                <p className="text-muted">#{selectedSettlement.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                {getStatusBadge(selectedSettlement.status)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designer Name</label>
                <p className="text-muted">{selectedSettlement.designer_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designer Email</label>
                <p className="text-muted">{selectedSettlement.designer_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Settlement Period</label>
                <p className="text-muted">
                  {formatDate(selectedSettlement.settlement_period_start)} - {formatDate(selectedSettlement.settlement_period_end)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Settlement Amount</label>
                <p className="text-muted font-medium">{formatCurrency(selectedSettlement.settlement_amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <p className="text-muted">{selectedSettlement.account_holder_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <p className="text-muted">{selectedSettlement.account_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IFSC Code</label>
                <p className="text-muted">{selectedSettlement.ifsc_code || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opted In</label>
                <p className="text-muted">{selectedSettlement.opted_in ? 'Yes' : 'No'}</p>
              </div>
              {selectedSettlement.opted_in_at && (
                <div>
                  <label className="block text-sm font-medium mb-1">Opted In At</label>
                  <p className="text-muted">{formatDate(selectedSettlement.opted_in_at)}</p>
                </div>
              )}
              {selectedSettlement.settlement_date && (
                <div>
                  <label className="block text-sm font-medium mb-1">Settlement Date</label>
                  <p className="text-muted">{formatDate(selectedSettlement.settlement_date)}</p>
                </div>
              )}
              {selectedSettlement.failure_reason && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Failure Reason</label>
                  <p className="text-muted">{selectedSettlement.failure_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedSettlement(null);
          setFailureReason('');
          setManualReferenceId('');
          setAdminNotes('');
        }}
        title="Update Settlement Status"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Dropdown
              value={newStatus}
              onChange={(value) => setNewStatus(value as 'processing' | 'completed' | 'failed')}
              options={[
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          {newStatus === 'failed' && (
            <div>
              <label className="block text-sm font-medium mb-2">Failure Reason *</label>
              <Input
                type="text"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Enter failure reason..."
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Manual Reference ID (Optional)</label>
            <Input
              type="text"
              value={manualReferenceId}
              onChange={(e) => setManualReferenceId(e.target.value)}
              placeholder="e.g., UTR123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="input-field w-full min-h-[100px] resize-none"
              placeholder="Add any notes about this settlement..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusModal(false);
                setSelectedSettlement(null);
                setFailureReason('');
                setManualReferenceId('');
                setAdminNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateStatus}
              disabled={isUpdating || (newStatus === 'failed' && !failureReason.trim())}
              isLoading={isUpdating}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Update Status Modal */}
      <Modal
        isOpen={showBulkStatusModal}
        onClose={() => {
          setShowBulkStatusModal(false);
          setFailureReason('');
          setAdminNotes('');
        }}
        title={`Bulk Update Status (${selectedSettlements.length} settlements)`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Dropdown
              value={newStatus}
              onChange={(value) => setNewStatus(value as 'processing' | 'completed' | 'failed')}
              options={[
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          {newStatus === 'failed' && (
            <div>
              <label className="block text-sm font-medium mb-2">Failure Reason *</label>
              <Input
                type="text"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Enter failure reason..."
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="input-field w-full min-h-[100px] resize-none"
              placeholder="Add any notes about this bulk update..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkStatusModal(false);
                setFailureReason('');
                setAdminNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkUpdate}
              disabled={isUpdating || (newStatus === 'failed' && !failureReason.trim())}
              isLoading={isUpdating}
            >
              Update All
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

