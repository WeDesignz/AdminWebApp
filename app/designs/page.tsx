'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
import { approveDesignDirect } from '@/lib/api/approveDesign';
import { approveDesignXHR } from '@/lib/api/approveDesignXHR';
import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon, PhotoIcon, CheckCircleIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon, EyeIcon, XMarkIcon, CheckIcon, XCircleIcon, FlagIcon, ShieldCheckIcon, ChartBarIcon, StarIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { KpiCard } from '@/components/common/KpiCard';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { Design } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/lib/hooks/usePermission';
import { PermissionButton } from '@/components/common/PermissionButton';
import toast from 'react-hot-toast';

export default function DesignsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [fullPreviewImage, setFullPreviewImage] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [allDesignImages, setAllDesignImages] = useState<string[]>([]);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [isResolvingFlag, setIsResolvingFlag] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityDesign, setSelectedActivityDesign] = useState<Design | null>(null);
  const [approvingDesignId, setApprovingDesignId] = useState<string | null>(null);
  
  // Wait for auth store to hydrate
  const { isAuthenticated, accessToken } = useAuthStore();
  const { hasPermission } = usePermission();
  const [isHydrated, setIsHydrated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Only enable queries when authenticated and hydrated
  const isReady = isHydrated && isAuthenticated && !!accessToken;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['designs', statusFilter, search, page, pageSize, sortOrder],
    queryFn: () => API.getDesigns({ 
      status: statusFilter, 
      search, 
      page, 
      limit: pageSize
    }),
    enabled: isReady, // Only fetch when authenticated
  });

  const { data: statsData } = useQuery({
    queryKey: ['designStats'],
    queryFn: () => API.getDesignStats(),
    enabled: isReady, // Only fetch when authenticated
  });

  const { data: designDetail, refetch: refetchDesignDetail } = useQuery({
    queryKey: ['design', selectedDesign?.id],
    queryFn: () => API.getDesign(selectedDesign!.id),
    enabled: !!selectedDesign && showDetailModal,
  });

  const { data: pinterestStatus } = useQuery({
    queryKey: ['pinterest-status'],
    queryFn: () => API.getPinterestStatus(),
    enabled: isReady,
    refetchInterval: 60000, // Refetch every minute
  });

  // Simplified approve design handler - just send request, show toast, and refresh page
  const handleApproveDesign = async (design: Design) => {
    // Check permission before proceeding
    if (!hasPermission('designs.approve')) {
      toast.error('You do not have permission to approve designs');
      return;
    }
    
    // Prevent multiple clicks
    if (approvingDesignId === design.id) {
      return;
    }

    // Set loading state
    setApprovingDesignId(design.id);

    // Create a timeout promise to ensure we always clear loading state
    const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          error: 'Request timed out. Please try again or refresh the page.',
        });
      }, 15000); // 15 second timeout
    });

    try {
      // Try XMLHttpRequest first (more reliable for headers), fallback to fetch
      const result = await Promise.race([
        approveDesignXHR(design.id), // Use XHR instead of fetch - more reliable for headers
        timeoutPromise,
      ]);

      // Clear loading state immediately (ALWAYS clear, no matter what)
      setApprovingDesignId(null);

      if (result.success) {
        // Show success message
        toast.success('Design approved successfully');
        
        // Refresh the data without full page reload using React Query
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['designs'] }),
          queryClient.refetchQueries({ queryKey: ['designStats'] }),
          queryClient.refetchQueries({ queryKey: ['design', design.id] }),
        ]);
      } else {
        // Show error message
        const errorMsg = result.error || 'Failed to approve design';
        toast.error(errorMsg);
      }
    } catch (error) {
      // Clear loading state on error (ALWAYS clear)
      setApprovingDesignId(null);
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while approving the design';
      toast.error(errorMessage);
    } finally {
      // Double-check: ALWAYS clear loading state in finally block
      // This ensures it's cleared even if something unexpected happens
      setApprovingDesignId(null);
    }
  };

  const handleViewDesign = async (design: Design) => {
    setSelectedDesign(design);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDesign(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };


  const handleRejectDesign = (design: Design) => {
    // Check permission before proceeding
    if (!hasPermission('designs.reject')) {
      toast.error('You do not have permission to reject designs');
      return;
    }
    setSelectedDesign(design);
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const handleSubmitRejection = async () => {
    if (!selectedDesign || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const rejectedDesignId = selectedDesign.id;
    const rejectedDesignTitle = selectedDesign.title;

    try {
      const response = await API.approveDesign(selectedDesign.id, { approved: false, reason: rejectionReason });

      if (response.success) {
        toast.success(`Design "${rejectedDesignTitle}" rejected successfully`);
        
        // Close the modal immediately - do this first before any async operations
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedDesign(null);
        
        // Then invalidate and refetch all related queries (non-blocking)
        Promise.all([
          queryClient.refetchQueries({ queryKey: ['designs'] }),
          queryClient.refetchQueries({ queryKey: ['designStats'] }),
          queryClient.refetchQueries({ queryKey: ['design', rejectedDesignId] }),
        ]).catch((error) => {
          console.error('Error refetching queries:', error);
          // Don't show error to user - refetch is non-critical
        });
      } else {
        toast.error(response.error || 'Failed to reject design');
      }
    } catch (error) {
      toast.error('An error occurred while rejecting the design');
      console.error(error);
    }
  };

  const handleFlagDesign = (design: Design) => {
    // Check permission before proceeding
    if (!hasPermission('designs.flag')) {
      toast.error('You do not have permission to flag designs');
      return;
    }
    setSelectedDesign(design);
    setShowFlagModal(true);
  };

  const handleCloseFlagModal = () => {
    setShowFlagModal(false);
    setFlagReason('');
  };

  const handleSubmitFlag = async () => {
    if (!selectedDesign || !flagReason.trim()) {
      toast.error('Please provide a reason for flagging');
      return;
    }
    setIsFlagging(true);
    const flaggedDesignId = selectedDesign.id;
    try {
      const response = await API.flagDesign(selectedDesign.id, flagReason);
      if (response.success) {
        toast.success(`Design "${selectedDesign.title}" flagged successfully`);
        setShowFlagModal(false);
        setFlagReason('');
        
        // Invalidate and refetch all related queries
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['designs'] }),
          queryClient.refetchQueries({ queryKey: ['design', flaggedDesignId] }),
        ]);
        
        setIsFlagging(false);
      } else {
        toast.error(response.error || 'Failed to flag design');
        console.error('Failed to flag design:', response.error);
        setIsFlagging(false);
      }
    } catch (error) {
      toast.error('An error occurred while flagging the design');
      console.error('Error flagging design:', error);
      setIsFlagging(false);
    }
  };

  const handleResolveFlag = async (design: Design) => {
    setIsResolvingFlag(true);
    try {
      const response = await API.resolveFlag(design.id);
      if (response.success) {
        toast.success(`Flag resolved for design "${design.title}"`);
        
        // Invalidate and refetch all related queries
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['designs'] }),
          queryClient.refetchQueries({ queryKey: ['design', design.id] }),
        ]);
        
        setIsResolvingFlag(false);
      } else {
        toast.error(response.error || 'Failed to resolve flag');
        console.error('Failed to resolve flag:', response.error);
        setIsResolvingFlag(false);
      }
    } catch (error) {
      toast.error('An error occurred while resolving the flag');
      console.error('Error resolving flag:', error);
      setIsResolvingFlag(false);
    }
  };

  const handleViewActivity = (design: Design) => {
    setSelectedActivityDesign(design);
    setShowActivityModal(true);
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivityDesign(null);
  };

  // Filter options
  const statusFilterOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'flagged', label: 'Flagged' },
  ];

  const pageSizeOptions = [
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '500', label: '500' },
  ];

  // Show loading while waiting for auth to hydrate
  if (!isHydrated || !isReady) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Designs</h1>
            <p className="text-muted mt-1">Moderate and manage design submissions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-muted/20'
              }`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-muted/20'
              }`}
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistics Tiles */}
        {statsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total Designs"
              value={statsData.data.total}
              icon={<PhotoIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Approved Designs"
              value={statsData.data.approved}
              icon={<CheckCircleIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Pending Approval"
              value={statsData.data.pending}
              icon={<ClockIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Rejected Designs"
              value={statsData.data.rejected}
              icon={<XCircleIcon className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Pinterest Status Banner */}
        {pinterestStatus?.data && (
          <div className={`p-4 rounded-lg border ${
            pinterestStatus.data.is_configured && pinterestStatus.data.is_token_valid
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-warning/10 border-warning/20 text-warning'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pinterestStatus.data.is_configured && pinterestStatus.data.is_token_valid ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Pinterest Connected</p>
                      <p className="text-sm opacity-80">
                        Designs will automatically post to Pinterest when approved
                        {pinterestStatus.data.board_name && ` (${pinterestStatus.data.board_name})`}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Pinterest Not Configured</p>
                      <p className="text-sm opacity-80">
                        {!pinterestStatus.data.is_configured 
                          ? 'Please configure Pinterest integration in Settings to enable automatic posting.'
                          : 'Pinterest token expired. Please re-authorize in Settings.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {(!pinterestStatus.data.is_configured || !pinterestStatus.data.is_token_valid) && (
                <Button
                  onClick={() => window.location.href = '/settings?tab=pinterest'}
                  size="sm"
                  variant="outline"
                >
                  Configure Pinterest
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <Input
                placeholder="Search by design title or designer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-48">
              <Dropdown
                options={statusFilterOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort by upload date (${sortOrder === 'asc' ? 'Oldest first' : 'Newest first'})`}
              className="whitespace-nowrap flex items-center gap-2"
            >
              {sortOrder === 'asc' ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
              )}
              Sort by Date
            </Button>
          </div>

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
          {viewMode === 'grid' ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                </div>
                ) : !data?.data || data.data.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted">
                    No designs found
                </div>
              ) : (
                data.data.map((design) => (
                  <div key={design.id} className="card-hover group">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                      <img
                        src={design.thumbnailUrl}
                        alt={design.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                        {design.flagged && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-warning/90 text-white shadow-lg backdrop-blur-sm">
                            <FlagIcon className="w-3 h-3" />
                            <span>FLAGGED</span>
                          </div>
                        )}
                        <span className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase shadow-lg backdrop-blur-sm ${
                          design.status === 'approved' ? 'bg-success/90 text-white' :
                          design.status === 'pending' ? 'bg-warning/90 text-white' :
                          'bg-error/90 text-white'
                      }`}>
                        {design.status}
                      </span>
                    </div>
                    <h3 className="font-medium truncate">{design.title}</h3>
                    <p className="text-sm text-muted">{design.designerName}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold">{formatCurrency(design.price)}</span>
                      <span className="text-sm text-muted">{design.downloads} downloads</span>
                    </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewDesign(design)}
                          title="Review"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewActivity(design)}
                          title="Activity"
                        >
                          <ChartBarIcon className="w-4 h-4" />
                        </Button>
                        {design.status !== 'approved' && (
                          <PermissionButton
                            requiredPermission="designs.approve"
                            size="sm"
                            variant="primary"
                            className="flex-1"
                            onClick={() => handleApproveDesign(design)}
                            isLoading={approvingDesignId === design.id}
                            disabled={approvingDesignId === design.id}
                            title="Approve"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </PermissionButton>
                        )}
                        {design.status !== 'rejected' && design.status !== 'approved' && (
                          <PermissionButton
                            requiredPermission="designs.reject"
                            size="sm"
                            variant="danger"
                            className="flex-1"
                            onClick={() => handleRejectDesign(design)}
                            title="Reject"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </PermissionButton>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
            </>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">SR No</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Design</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Designer</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Category</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Price</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Downloads</th>
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Uploaded</th>
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
                          No designs found
                        </td>
                      </tr>
                    ) : (
                      data.data.map((design, index) => {
                        // Calculate serial number based on current page and index
                        const serialNumber = ((page - 1) * pageSize) + index + 1;
                        return (
                    <tr key={design.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{serialNumber}</td>
                          <td className="py-3 px-4 font-medium whitespace-nowrap">{design.title}</td>
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{design.designerName}</td>
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{design.category}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          design.status === 'approved' ? 'bg-success/20 text-success' :
                          design.status === 'pending' ? 'bg-warning/20 text-warning' :
                          'bg-error/20 text-error'
                        }`}>
                          {design.status}
                        </span>
                      </td>
                          <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(design.price)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">{design.downloads}</td>
                          <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(design.uploadedAt)}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDesign(design)}
                                title="Review"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewActivity(design)}
                                title="Activity"
                              >
                                <ChartBarIcon className="w-4 h-4" />
                              </Button>
                              {design.status !== 'approved' && (
                                <PermissionButton
                                  requiredPermission="designs.approve"
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleApproveDesign(design)}
                                  isLoading={approvingDesignId === design.id}
                                  disabled={approvingDesignId === design.id}
                                  title="Approve"
                                >
                                  <CheckIcon className="w-4 h-4" />
                                </PermissionButton>
                              )}
                              {design.status !== 'rejected' && design.status !== 'approved' && (
                                <PermissionButton
                                  requiredPermission="designs.reject"
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleRejectDesign(design)}
                                  title="Reject"
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                </PermissionButton>
                              )}
                            </div>
                      </td>
                    </tr>
                        );
                      })
                    )}
                </tbody>
              </table>
            </div>
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
            </>
          )}
        </div>
      </div>

      {/* Design Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        title="Design Details"
        size="xl"
      >
        {designDetail?.data && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* Flag/Resolve Flag Action Buttons at Top */}
            <div className="space-y-3 pb-4 border-b border-border">
              {designDetail.data.flagged && designDetail.data.flagReason && (
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-start gap-2">
                    <FlagIcon className="w-5 h-5 text-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning mb-1">Design Flagged</p>
                      <p className="text-sm text-muted italic">&quot;{designDetail.data.flagReason}&quot;</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                {designDetail.data.flagged ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolveFlag(designDetail.data!)}
                    className="flex items-center gap-2"
                    title="Conflict Resolved"
                    disabled={isResolvingFlag}
                    isLoading={isResolvingFlag}
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Conflict Resolved
                  </Button>
                ) : (
                  <PermissionButton
                    requiredPermission="designs.flag"
                    variant="warning"
                    size="sm"
                    onClick={() => handleFlagDesign(designDetail.data!)}
                    className="flex items-center gap-2"
                    title="Flag Design"
                  >
                    <FlagIcon className="w-4 h-4" />
                    Flag Design
                  </PermissionButton>
                )}
              </div>
            </div>
            {/* Design Files - Images and Downloads */}
            {(() => {
              // Get all files from backend
              const allFiles = (designDetail.data as any)?.media_files || designDetail.data.files || [];
              const previewFiles = (designDetail.data as any)?.preview_files || [];
              
              // Helper function to get file extension
              const getFileExtension = (fileName: string): string => {
                if (!fileName) return '';
                const parts = fileName.toLowerCase().split('.');
                return parts.length > 1 ? parts[parts.length - 1] : '';
              };
              
              // Helper function to get base name (without extension)
              const getBaseName = (fileName: string): string => {
                if (!fileName) return '';
                const parts = fileName.split('.');
                return parts.length > 1 ? parts.slice(0, -1).join('.') : fileName;
              };
              
              // Categorize files
              const imageFiles: any[] = [];
              const downloadFiles: any[] = [];
              
              // Process preview files (these are already filtered to be images)
              previewFiles.forEach((file: any) => {
                const fileUrl = file.url || file.file;
                if (fileUrl) {
                  imageFiles.push({
                    ...file,
                    url: fileUrl,
                    fileName: file.file_name || fileUrl.split('/').pop() || 'image',
                  });
                }
              });
              
              // Process all files to find EPS and CDR
              allFiles.forEach((file: any) => {
                const fileUrl = file.url || file.file;
                if (!fileUrl) return;
                
                const fileName = file.name || file.file_name || fileUrl.split('/').pop() || '';
                const extension = getFileExtension(fileName);
                const baseName = getBaseName(fileName).toLowerCase();
                
                // Check if it's EPS or CDR
                if (extension === 'eps' || extension === 'cdr') {
                  downloadFiles.push({
                    id: file.id || fileUrl,
                    name: fileName,
                    url: fileUrl,
                    type: extension.toUpperCase(),
                    size: file.size || 0,
                    uploadedAt: file.uploadedAt || file.created_at || new Date().toISOString(),
                  });
                }
              });
              
              // Collect all image URLs for navigation
              const allPreviewUrls = imageFiles.map((file: any) => file.url).filter(Boolean);
              
              // Don't render if no files
              if (imageFiles.length === 0 && downloadFiles.length === 0) return null;
              
              return (
                <div className="space-y-6">
                  {/* Image Previews Section */}
                  {imageFiles.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold border-b border-border pb-2">Design Images</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {imageFiles.map((previewFile: any, idx: number) => {
                          const previewUrl = previewFile.url;
                          if (!previewUrl) return null;
                          
                          const isMockup = previewFile.is_mockup || getBaseName(previewFile.fileName).toLowerCase() === 'mockup';
                          const fileName = previewFile.fileName || 'image';
                          const extension = getFileExtension(fileName);
                          const fileLabel = isMockup 
                            ? 'Mockup' 
                            : extension === 'jpg' || extension === 'jpeg' 
                              ? 'JPG' 
                              : extension === 'png' 
                                ? 'PNG' 
                                : 'Image';
                          
                          return (
                            <div 
                              key={previewFile.id || idx} 
                              className="relative rounded-lg overflow-hidden border border-border group cursor-pointer hover:border-primary transition-colors bg-muted/5"
                              style={{ minHeight: '200px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAllDesignImages(allPreviewUrls);
                                setCurrentPreviewIndex(idx);
                                setFullPreviewImage(previewUrl);
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center p-2">
                                <img 
                                  src={previewUrl} 
                                  alt={fileLabel}
                                  className="max-w-full max-h-[200px] w-auto h-auto object-contain rounded"
                                  onError={(e) => {
                                    // Hide broken images
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="absolute top-2 left-2 px-2 py-1 bg-primary/90 text-white text-xs font-semibold rounded z-10">
                                {fileLabel}
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                <EyeIcon className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Download Files Section (EPS, CDR) */}
                  {downloadFiles.length > 0 && (
                    <div className="space-y-4 border-t border-border pt-4">
                      <h3 className="text-xl font-semibold border-b border-border pb-2">Design Files</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {downloadFiles.map((file) => (
                          <div 
                            key={file.id} 
                            className="p-4 bg-muted/10 rounded-lg border border-border hover:border-primary transition-colors flex items-center justify-between group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded">
                                  {file.type}
                                </div>
                                <p className="font-medium text-sm truncate">{file.name}</p>
                              </div>
                              {file.size > 0 && (
                                <p className="text-xs text-muted">
                                  {formatFileSize(file.size)}
                                </p>
                              )}
                            </div>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              download
                              className="ml-3 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 group-hover:scale-105 transition-transform"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">Download</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Metadata */}
            {designDetail.data.metadata && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  {designDetail.data.metadata.description && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <p className="text-muted">{designDetail.data.metadata.description}</p>
                    </div>
                  )}
                  {designDetail.data.metadata.dimensions && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Dimensions</label>
                        <p className="text-muted">
                          {designDetail.data.metadata.dimensions.width} × {designDetail.data.metadata.dimensions.height} {designDetail.data.metadata.dimensions.unit}
                        </p>
                      </div>
                      {designDetail.data.metadata.resolution && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Resolution</label>
                          <p className="text-muted">{designDetail.data.metadata.resolution} DPI</p>
                        </div>
                      )}
                    </>
                  )}
                  {designDetail.data.metadata.colorMode && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Color Mode</label>
                      <p className="text-muted">{designDetail.data.metadata.colorMode}</p>
                    </div>
                  )}
                  {designDetail.data.metadata.license && (
                    <div>
                      <label className="block text-sm font-medium mb-2">License</label>
                      <p className="text-muted">{designDetail.data.metadata.license}</p>
                    </div>
                  )}
                  {designDetail.data.metadata.fileFormats && designDetail.data.metadata.fileFormats.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">File Formats</label>
                      <p className="text-muted">{designDetail.data.metadata.fileFormats.join(', ')}</p>
                    </div>
                  )}
                  {designDetail.data.metadata.tags && designDetail.data.metadata.tags.length > 0 && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {designDetail.data.metadata.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval History */}
            {designDetail.data.approvalHistory && designDetail.data.approvalHistory.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Approval History</h3>
                <div className="space-y-3">
                  {designDetail.data.approvalHistory.map((history) => (
                    <div key={history.id} className="p-3 bg-muted/10 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium capitalize">{history.action.replace('_', ' ')}</p>
                          <p className="text-sm text-muted">By: {history.performedBy}</p>
                        </div>
                        <p className="text-sm text-muted">{formatDate(history.timestamp)}</p>
                      </div>
                      {history.remarks && (
                        <p className="text-sm text-muted mt-2 italic">&quot;{history.remarks}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Designer Details */}
            {designDetail.data.designer && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Linked Designer Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <p className="text-muted">{designDetail.data.designer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <p className="text-muted">{designDetail.data.designer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <p className="text-muted capitalize">{designDetail.data.designer.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Onboarding Status</label>
                    <p className="text-muted capitalize">{designDetail.data.designer.onboardingStatus?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lifetime Earnings</label>
                    <p className="text-muted">{formatCurrency(designDetail.data.designer.lifetimeEarnings)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pending Payout</label>
                    <p className="text-muted">{formatCurrency(designDetail.data.designer.pendingPayout)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={handleCloseRejectModal}
        title="Reject Design"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Please provide a reason for rejecting this design.
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="input-field w-full min-h-[120px] resize-none"
              placeholder="Enter the reason for rejection..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseRejectModal} title="Cancel">
              <XMarkIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
              title="Submit Rejection"
            >
              <CheckIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full Preview Modal */}
      <Modal
        isOpen={!!fullPreviewImage}
        onClose={() => {
          setFullPreviewImage(null);
          setCurrentPreviewIndex(0);
          setAllDesignImages([]);
        }}
        size="xl"
        title=""
        zIndex={60}
        static={false}
      >
        {fullPreviewImage && allDesignImages.length > 0 && (
          <div className="relative w-full h-full flex items-center justify-center bg-muted/5 rounded-lg overflow-hidden" style={{ minHeight: '400px', maxHeight: '80vh' }}>
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullPreviewImage(null);
                setCurrentPreviewIndex(0);
                setAllDesignImages([]);
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            {/* Navigation Buttons */}
            {allDesignImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = currentPreviewIndex > 0 ? currentPreviewIndex - 1 : allDesignImages.length - 1;
                    setCurrentPreviewIndex(prevIndex);
                    setFullPreviewImage(allDesignImages[prevIndex]);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                  title="Previous"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = currentPreviewIndex < allDesignImages.length - 1 ? currentPreviewIndex + 1 : 0;
                    setCurrentPreviewIndex(nextIndex);
                    setFullPreviewImage(allDesignImages[nextIndex]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                  title="Next"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {allDesignImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/60 rounded-full text-white text-sm">
                {currentPreviewIndex + 1} / {allDesignImages.length}
              </div>
            )}
            
            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={fullPreviewImage} 
                alt={`Design Preview ${currentPreviewIndex + 1}`}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                style={{ maxHeight: 'calc(80vh - 32px)' }}
                onError={(e) => {
                  // Show error message if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-center text-muted p-8';
                  errorDiv.textContent = 'Failed to load image';
                  target.parentElement?.appendChild(errorDiv);
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Flag Design Modal */}
      <Modal
        isOpen={showFlagModal}
        onClose={handleCloseFlagModal}
        title="Flag Design"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Please provide a reason for flagging this design (e.g., content violation, copied design).
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">Flag Reason</label>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="input-field w-full min-h-[120px] resize-none"
              placeholder="Enter the reason for flagging this design..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseFlagModal} title="Cancel">
              <XMarkIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="warning" 
              onClick={handleSubmitFlag}
              disabled={!flagReason.trim() || isFlagging}
              isLoading={isFlagging}
              title="Flag Design"
            >
              <FlagIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Activity Statistics Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={handleCloseActivityModal}
        title="Design Activity Statistics"
        size="lg"
      >
        {selectedActivityDesign && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border">
              <h3 className="text-lg font-semibold">{selectedActivityDesign.title}</h3>
              <p className="text-sm text-muted">by {selectedActivityDesign.designerName}</p>
            </div>

            {selectedActivityDesign.statistics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Views */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted">Total Views</p>
                    <EyeIcon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{selectedActivityDesign.statistics.totalViews.toLocaleString()}</p>
                </div>

                {/* Total Downloads */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted">Total Downloads</p>
                    <ArrowDownIcon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{selectedActivityDesign.statistics.totalDownloads.toLocaleString()}</p>
                </div>

                {/* Total Purchases */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted">Total Purchases</p>
                    <CheckCircleIcon className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-2xl font-bold">{selectedActivityDesign.statistics.totalPurchases.toLocaleString()}</p>
                </div>

                {/* Revenue Generated */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted">Revenue Generated</p>
                    <ChartBarIcon className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(selectedActivityDesign.statistics.revenueGenerated)}</p>
                </div>

                {/* Average Rating & Reviews */}
                {selectedActivityDesign.statistics.averageRating !== undefined && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted">Average Rating</p>
                      <StarIcon className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{selectedActivityDesign.statistics.averageRating.toFixed(1)}</p>
                      <span className="text-sm text-muted">/ 5.0</span>
                    </div>
                    {selectedActivityDesign.statistics.totalReviews !== undefined && (
                      <p className="text-sm text-muted mt-1">
                        Based on {selectedActivityDesign.statistics.totalReviews} {selectedActivityDesign.statistics.totalReviews === 1 ? 'review' : 'reviews'}
                      </p>
                    )}
                  </div>
                )}

                {/* Trending Rank */}
                {selectedActivityDesign.statistics.trendingRank !== undefined && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted">Trending Rank</p>
                      <ArrowUpIcon className="w-5 h-5 text-warning" />
                    </div>
                    <p className="text-2xl font-bold">#{selectedActivityDesign.statistics.trendingRank}</p>
                    <p className="text-sm text-muted mt-1">in {selectedActivityDesign.category}</p>
                  </div>
                )}

                {/* Performance Score */}
                {selectedActivityDesign.statistics.performanceScore !== undefined && (
                  <div className="card p-4 md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted">Performance Score</p>
                      <ChartBarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-2xl font-bold">{selectedActivityDesign.statistics.performanceScore}/100</p>
                      <div className="flex-1 bg-muted/20 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${selectedActivityDesign.statistics.performanceScore}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted mt-2">
                      Calculated based on views, downloads, purchases, and ratings
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No statistics available for this design yet.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
