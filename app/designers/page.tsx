'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { MagnifyingGlassIcon, EyeIcon, XMarkIcon, UsersIcon, ClockIcon, CreditCardIcon, XCircleIcon, CheckIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Designer, DesignerOnboardingStep1, DesignerOnboardingStep2, DesignerOnboardingStep3 } from '@/types';
import { KpiCard } from '@/components/common/KpiCard';
import { API } from '@/lib/api';
import { usePermission } from '@/lib/hooks/usePermission';
import { PermissionButton } from '@/components/common/PermissionButton';
import toast from 'react-hot-toast';

export default function DesignersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState('');
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRejectModalFromTable, setShowRejectModalFromTable] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvingDesignerId, setApprovingDesignerId] = useState<string | null>(null);
  const [showAddDesignerModal, setShowAddDesignerModal] = useState(false);
  const [isSubmittingDesigner, setIsSubmittingDesigner] = useState(false);
  const [addDesignerError, setAddDesignerError] = useState<string | null>(null);
  const [addDesignerSuccess, setAddDesignerSuccess] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [previewImagesList, setPreviewImagesList] = useState<Array<{ url: string; title: string }>>([]);
  
  // Add Designer form state
  const [addDesignerForm, setAddDesignerForm] = useState<{
    step1: Partial<DesignerOnboardingStep1>;
    step2: Partial<DesignerOnboardingStep2>;
    step3: Partial<DesignerOnboardingStep3>;
  }>({
    step1: {
      profilePhoto: '',
      firstName: '',
      lastName: '',
      sampleDesigns: [],
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
    step2: {
      businessEmail: '',
      businessPhoneNumber: '',
      legalBusinessName: '',
      businessType: 'Proprietorship',
      category: '',
      subcategory: '',
      businessModel: 'Freelancer',
      streetAddress: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      panNumber: '',
      panDocumentFile: '',
      gstNumber: '',
      msmeNumber: '',
    },
    step3: {
      designsUploaded: 0,
      designs: [],
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['designers', page, pageSize, search, onboardingStatusFilter],
    queryFn: () => MockAPI.getDesigners({ page, limit: pageSize, onboardingStatus: onboardingStatusFilter, search }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['designerStats'],
    queryFn: () => MockAPI.getDesignerStats(),
  });

  // Fetch onboarding details when a designer is selected
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useQuery({
    queryKey: ['designerOnboarding', selectedDesigner?.id],
    queryFn: () => selectedDesigner ? API.designers.getDesignerOnboarding(selectedDesigner.id) : null,
    enabled: !!selectedDesigner && showViewModal,
  });

  // Filter options for onboarding status
  const onboardingStatusOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'admin_approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Filter designers based on onboarding status filter
  const filteredDesigners = onboardingStatusFilter 
    ? (data?.data?.filter(d => d.onboardingStatus === onboardingStatusFilter) || [])
    : (data?.data || []);

  const handleViewDesigner = (designer: Designer) => {
    setSelectedDesigner(designer);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedDesigner(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  const handleCreateRazorpayAccount = () => {
    // Keep the view modal open, just open the Razorpay modal
    setShowRazorpayModal(true);
  };

  const handleCloseRazorpayModal = () => {
    setShowRazorpayModal(false);
  };

  const handleCreateAccount = async () => {
    if (!selectedDesigner) return;
    setIsCreatingAccount(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsCreatingAccount(false);
    setShowRazorpayModal(false);
    setSelectedDesigner(null);
    // In real app, you would call the API here
  };

  const handleRejectFromTable = (designer: Designer) => {
    // Check permission before proceeding
    if (!hasPermission('designers.reject')) {
      toast.error('You do not have permission to reject designers');
      return;
    }
    setSelectedDesigner(designer);
    setShowRejectModalFromTable(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setShowRejectModalFromTable(false);
    setRejectionReason('');
  };

  const handleSubmitRejection = async () => {
    if (!selectedDesigner || !rejectionReason.trim()) return;
    setIsRejecting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRejecting(false);
    setShowRejectModal(false);
    setShowRejectModalFromTable(false);
    setRejectionReason('');
    setSelectedDesigner(null);
    // In real app, you would call the API here
  };

  const handleApproveDesigner = (designer: any) => {
    if (!designer?.id) return;
    // Check permission before proceeding
    if (!hasPermission('designers.approve')) {
      toast.error('You do not have permission to approve designers');
      return;
    }
    setSelectedDesigner(designer);
    setApprovingDesignerId(designer.id);
    setShowApproveModal(true);
  };

  const handleCloseApproveModal = () => {
    setShowApproveModal(false);
    setApprovingDesignerId(null);
    setSelectedDesigner(null);
  };

  const handleConfirmApprove = async () => {
    if (!selectedDesigner?.id) return;
    
    // Check permission before proceeding
    if (!hasPermission('designers.approve')) {
      toast.error('You do not have permission to approve designers');
      return;
    }
    
    setIsApproving(true);
    // Close modal immediately when confirm is clicked
    handleCloseApproveModal();
    
    try {
      const response = await API.designers.updateDesignerStatus(selectedDesigner.id.toString(), 'verified', true);
      
      if (response.success) {
        // Force refresh the designers list to get updated status
        await queryClient.invalidateQueries({ queryKey: ['designers'] });
        await queryClient.invalidateQueries({ queryKey: ['designerStats'] });
        // Refetch the data immediately
        await queryClient.refetchQueries({ queryKey: ['designers'] });
        // Show success message (you can add a toast notification here)
        toast.success('Designer approved successfully!');
      } else {
        toast.error(response.error || 'Failed to approve designer');
      }
    } catch (error) {
      console.error('Error approving designer:', error);
      toast.error('An error occurred while approving the designer');
    } finally {
      setIsApproving(false);
    }
  };

  const handleAddDesigner = () => {
    setShowAddDesignerModal(true);
  };

  const handleCloseAddDesignerModal = () => {
    setShowAddDesignerModal(false);
    setAddDesignerError(null);
    setAddDesignerSuccess(null);
    setAddDesignerForm({
      step1: {
        profilePhoto: '',
        firstName: '',
        lastName: '',
        sampleDesigns: [],
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      },
      step2: {
        businessEmail: '',
        businessPhoneNumber: '',
        legalBusinessName: '',
        businessType: 'Proprietorship',
        category: '',
        subcategory: '',
        businessModel: 'Freelancer',
        streetAddress: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        panNumber: '',
        panDocumentFile: '',
        gstNumber: '',
        msmeNumber: '',
      },
      step3: {
        designsUploaded: 0,
        designs: [],
      },
    });
  };

  const validateAddDesignerForm = (): string | null => {
    // Validate Step 1
    if (!addDesignerForm.step1.firstName?.trim()) {
      return 'First name is required';
    }
    if (!addDesignerForm.step1.lastName?.trim()) {
      return 'Last name is required';
    }
    if (!addDesignerForm.step1.email?.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addDesignerForm.step1.email)) {
      return 'Please enter a valid email address';
    }
    if (!addDesignerForm.step1.phoneNumber?.trim()) {
      return 'Phone number is required';
    }
    if (!addDesignerForm.step1.password?.trim()) {
      return 'Password is required';
    }
    if (addDesignerForm.step1.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (addDesignerForm.step1.password !== addDesignerForm.step1.confirmPassword) {
      return 'Passwords do not match';
    }

    // Validate Step 2
    if (!addDesignerForm.step2.businessEmail?.trim()) {
      return 'Business email is required';
    }
    if (!addDesignerForm.step2.businessPhoneNumber?.trim()) {
      return 'Business phone number is required';
    }
    if (!addDesignerForm.step2.legalBusinessName?.trim()) {
      return 'Legal business name is required';
    }
    if (!addDesignerForm.step2.category?.trim()) {
      return 'Category is required';
    }
    if (!addDesignerForm.step2.subcategory?.trim()) {
      return 'Subcategory is required';
    }
    if (!addDesignerForm.step2.streetAddress?.trim()) {
      return 'Street address is required';
    }
    if (!addDesignerForm.step2.city?.trim()) {
      return 'City is required';
    }
    if (!addDesignerForm.step2.state?.trim()) {
      return 'State is required';
    }
    if (!addDesignerForm.step2.pincode?.trim()) {
      return 'Pincode is required';
    }
    if (!addDesignerForm.step2.panNumber?.trim()) {
      return 'PAN number is required';
    }

    return null;
  };

  const handleSubmitAddDesigner = async () => {
    // Clear previous messages
    setAddDesignerError(null);
    setAddDesignerSuccess(null);

    // Validate form
    const validationError = validateAddDesignerForm();
    if (validationError) {
      setAddDesignerError(validationError);
      return;
    }

    setIsSubmittingDesigner(true);

    try {
      const response = await API.designers.createDesigner({
        step1: {
          firstName: addDesignerForm.step1.firstName!,
          lastName: addDesignerForm.step1.lastName!,
          email: addDesignerForm.step1.email!,
          phoneNumber: addDesignerForm.step1.phoneNumber!,
          password: addDesignerForm.step1.password!,
          confirmPassword: addDesignerForm.step1.confirmPassword!,
          profilePhoto: addDesignerForm.step1.profilePhoto || undefined,
        },
        step2: {
          businessEmail: addDesignerForm.step2.businessEmail!,
          businessPhoneNumber: addDesignerForm.step2.businessPhoneNumber!,
          legalBusinessName: addDesignerForm.step2.legalBusinessName!,
          businessType: addDesignerForm.step2.businessType!,
          category: addDesignerForm.step2.category!,
          subcategory: addDesignerForm.step2.subcategory!,
          businessModel: addDesignerForm.step2.businessModel!,
          streetAddress: addDesignerForm.step2.streetAddress!,
          city: addDesignerForm.step2.city!,
          state: addDesignerForm.step2.state!,
          pincode: addDesignerForm.step2.pincode!,
          country: addDesignerForm.step2.country!,
          panNumber: addDesignerForm.step2.panNumber!,
          panDocumentFile: addDesignerForm.step2.panDocumentFile || undefined,
          gstNumber: addDesignerForm.step2.gstNumber || undefined,
          msmeNumber: addDesignerForm.step2.msmeNumber || undefined,
        },
      });

      if (response.success) {
        setAddDesignerSuccess(response.message || 'Designer created successfully!');
        // Refresh designers list
        queryClient.invalidateQueries({ queryKey: ['designers'] });
        queryClient.invalidateQueries({ queryKey: ['designerStats'] });
        // Close modal after a short delay
        setTimeout(() => {
          handleCloseAddDesignerModal();
        }, 1500);
      } else {
        setAddDesignerError(response.error || 'Failed to create designer. Please try again.');
      }
    } catch (error: any) {
      setAddDesignerError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmittingDesigner(false);
    }
  };

  // Dropdown options
  const businessTypeOptions = [
    { value: 'Proprietorship', label: 'Proprietorship' },
    { value: 'Public Limited', label: 'Public Limited' },
    { value: 'Private Limited', label: 'Private Limited' },
    { value: 'Partnership', label: 'Partnership' },
    { value: 'LLP', label: 'LLP' },
  ];

  const businessModelOptions = [
    { value: 'Freelancer', label: 'Freelancer' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Studio', label: 'Studio' },
    { value: 'Consultancy', label: 'Consultancy' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Designers</h1>
            <p className="text-muted mt-1">Manage designer accounts and onboarding</p>
          </div>
          <Button variant="primary" onClick={handleAddDesigner}>Add Designer</Button>
        </div>

        {/* Statistics Tiles */}
        {statsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard
              title="Total Designers"
              value={statsData.data.totalDesigners}
              icon={<UsersIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Pending Approval"
              value={statsData.data.pendingApproval}
              icon={<ClockIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Razorpay Pending"
              value={statsData.data.razorpayPending}
              icon={<CreditCardIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Rejected"
              value={statsData.data.rejected}
              icon={<XCircleIcon className="w-6 h-6" />}
            />
          </div>
        )}

        <div className="card">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <Input
                placeholder="Search designers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-64">
              <Dropdown
                options={onboardingStatusOptions}
                value={onboardingStatusFilter}
                onChange={setOnboardingStatusFilter}
                placeholder="Filter by status"
              />
            </div>
          </div>

          {/* Pagination - Top */}
          {data?.pagination && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <p className="text-sm text-muted">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted whitespace-nowrap">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-muted whitespace-nowrap">per page</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Name</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Email</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Joined</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Earnings</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Pending</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredDesigners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      No designers found
                    </td>
                  </tr>
                ) : (
                  filteredDesigners.map((designer: any) => {
                    // Map API response to display format
                    const designerName = designer.name || 
                      (designer.first_name && designer.last_name 
                        ? `${designer.first_name} ${designer.last_name}`.trim()
                        : designer.first_name || designer.last_name || designer.username || 'N/A');
                    const designerEmail = designer.email || 'N/A';
                    const joinedDate = designer.joinedAt || designer.joined_date || designer.date_joined || '';
                    // Get designer status - prioritize designer_status (from DesignerProfile.status), then status field, then derive from is_active
                    let designerStatus = designer.designer_status || designer.status;
                    if (!designerStatus) {
                      designerStatus = designer.is_active ? 'active' : 'inactive';
                    }
                    const lifetimeEarnings = designer.lifetimeEarnings || designer.total_earnings || 0;
                    const pendingPayout = designer.pendingPayout || designer.pending_withdrawals || 0;
                    
                    return (
                      <tr key={designer.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-medium whitespace-nowrap">{designerName}</td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap">{designerEmail}</td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap">{joinedDate ? formatDate(joinedDate) : 'N/A'}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            designerStatus === 'active' || designerStatus === 'verified' ? 'bg-success/20 text-success' :
                            designerStatus === 'pending' ? 'bg-warning/20 text-warning' :
                            'bg-error/20 text-error'
                          }`}>
                            {designerStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(lifetimeEarnings)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(pendingPayout)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDesigner(designer)}
                              title="View Onboarding Details"
                            >
                              <EyeIcon className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            {designerStatus === 'verified' ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                title="Designer Already Approved"
                              >
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Approved
                              </Button>
                            ) : (
                              <PermissionButton
                                requiredPermission="designers.approve"
                                size="sm"
                                variant="primary"
                                onClick={() => handleApproveDesigner(designer)}
                                title="Approve Designer"
                              >
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Approve
                              </PermissionButton>
                            )}
                            <PermissionButton
                              requiredPermission="designers.reject"
                              size="sm"
                              variant="danger"
                              onClick={() => handleRejectFromTable(designer)}
                              title="Reject Designer"
                            >
                              <XMarkIcon className="w-4 h-4 mr-2" />
                              Reject
                            </PermissionButton>
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
        </div>
      </div>

      {/* View Onboarding Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title={`Designer Onboarding Details${selectedDesigner?.name ? ` - ${selectedDesigner.name}` : selectedDesigner?.id ? ` - ID: ${selectedDesigner.id}` : ''}`}
        size="xl"
      >
        {isLoadingOnboarding ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted mt-4">Loading onboarding details...</p>
          </div>
        ) : onboardingData?.data ? (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* ONBOARDING STEP 1 - Personal Details */}
            {onboardingData.data.step1 && Object.keys(onboardingData.data.step1).length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 1 - Personal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {onboardingData.data.step1.profile_photo_url && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Profile Photo</label>
                      <div className="w-32 h-32 rounded-lg overflow-hidden border border-border">
                        <img 
                          src={onboardingData.data.step1.profile_photo_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <p className="text-muted">{onboardingData.data.step1.first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <p className="text-muted">{onboardingData.data.step1.last_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="flex items-center gap-2">
                      <p className="text-muted">{onboardingData.data.step1.email || 'N/A'}</p>
                      {onboardingData.data.step1.email_verified !== undefined && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          onboardingData.data.step1.email_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {onboardingData.data.step1.email_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <div className="flex items-center gap-2">
                      <p className="text-muted">{onboardingData.data.step1.phone || 'N/A'}</p>
                      {onboardingData.data.step1.phone_verified !== undefined && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          onboardingData.data.step1.phone_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {onboardingData.data.step1.phone_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Profile Type</label>
                    <p className="text-muted">{onboardingData.data.step1.is_individual ? 'Individual' : 'Company'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ONBOARDING STEP 2 - Business Details */}
            {onboardingData.data.step2 && Object.keys(onboardingData.data.step2).length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 2 - Business Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Email</label>
                    <p className="text-muted">{onboardingData.data.step2.business_email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Phone Number</label>
                    <p className="text-muted">{onboardingData.data.step2.business_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Legal Business Name</label>
                    <p className="text-muted">{onboardingData.data.step2.legal_business_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Type</label>
                    <p className="text-muted">{onboardingData.data.step2.business_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <p className="text-muted">{onboardingData.data.step2.category || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Subcategory</label>
                    <p className="text-muted">{onboardingData.data.step2.subcategory || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Model</label>
                    <p className="text-muted">{onboardingData.data.step2.business_model || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Street Address</label>
                    <p className="text-muted">{onboardingData.data.step2.street_address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <p className="text-muted">{onboardingData.data.step2.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <p className="text-muted">{onboardingData.data.step2.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pincode</label>
                    <p className="text-muted">{onboardingData.data.step2.pincode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <p className="text-muted">{onboardingData.data.step2.country || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PAN Number</label>
                    <p className="text-muted font-mono">{onboardingData.data.step2.pan_number || 'N/A'}</p>
                  </div>
                  {onboardingData.data.step2.pan_card_url && (
                    <div>
                      <label className="block text-sm font-medium mb-2">PAN Document</label>
                      <div className="mt-2">
                        <a 
                          href={onboardingData.data.step2.pan_card_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View PAN Document
                        </a>
                      </div>
                    </div>
                  )}
                  {onboardingData.data.step2.gst_number && (
                    <div>
                      <label className="block text-sm font-medium mb-2">GST Number</label>
                      <p className="text-muted font-mono">{onboardingData.data.step2.gst_number}</p>
                    </div>
                  )}
                  {onboardingData.data.step2.msme_number && (
                    <div>
                      <label className="block text-sm font-medium mb-2">MSME Number</label>
                      <p className="text-muted font-mono">{onboardingData.data.step2.msme_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ONBOARDING STEP 3 - Designs Upload */}
            {onboardingData.data.step3 && Object.keys(onboardingData.data.step3).length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 3 - Designs Upload</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Designs Uploaded</label>
                    <p className="text-muted">
                      {onboardingData.data.step3.designs_uploaded || 0} / {onboardingData.data.step3.minimum_required || 50} (Minimum Required)
                      {onboardingData.data.step3.requirement_met && (
                        <span className="ml-2 text-success">✓ Requirement Met</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ONBOARDING STEP 4 - Product Images */}
            {onboardingData.data.step4 && onboardingData.data.step4.products && onboardingData.data.step4.products.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">
                  ONBOARDING STEP 4 - Product Images ({onboardingData.data.step4.total_products || onboardingData.data.step4.products.length} Products)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {onboardingData.data.step4.products.map((product: any) => (
                    product.image && (
                      <div 
                        key={`${product.product_id}-${product.image.id}`} 
                        className="relative group"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden border border-border bg-muted/10 relative">
                          <img
                            src={product.image.url}
                            alt={product.image.title || product.title || `Product ${product.product_id}`}
                            className="w-full h-full object-cover transition-transform duration-200 rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted text-xs rounded-lg">Image not available</div>';
                              }
                            }}
                          />
                          {/* Hover Overlay with Eye Icon */}
                          <div 
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              // Build list of all images from step4 products
                              const imagesList = onboardingData.data.step4.products
                                .filter((p: any) => p.image)
                                .map((p: any) => ({
                                  url: p.image.url,
                                  title: p.title || p.image.title || `Product ${p.product_id}`
                                }));
                              
                              // Find current image index
                              const currentIndex = imagesList.findIndex((img: { url: string; title: string }) => img.url === product.image.url);
                              
                              setPreviewImagesList(imagesList);
                              setCurrentImageIndex(currentIndex >= 0 ? currentIndex : 0);
                              setPreviewImage({
                                url: product.image.url,
                                title: product.title || product.image.title || `Product ${product.product_id}`
                              });
                              setShowImagePreview(true);
                            }}
                          >
                            <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition-colors">
                              <EyeIcon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                        {product.title && (
                          <p className="mt-1 text-xs text-muted truncate" title={product.title}>
                            {product.title}
                          </p>
                        )}
                      </div>
                    )
                  ))}
                </div>
                {onboardingData.data.step4.products.length === 0 && (
                  <p className="text-muted text-center py-4">No product images available</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseViewModal} title="Close Modal">
                <XMarkIcon className="w-4 h-4 mr-2" />
                Close
              </Button>
              {!onboardingData.data.razorpay_account_verified && (
                <Button variant="primary" onClick={handleCreateRazorpayAccount} title="Create Razorpay Linked Account">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Razorpay Account
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted">
              {onboardingData?.data?.message || 'Onboarding data is not available for this designer.'}
            </p>
            <Button variant="outline" onClick={handleCloseViewModal} className="mt-4" title="Close Modal">
              <XMarkIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* Razorpay Account Creation Modal */}
      <Modal
        isOpen={showRazorpayModal}
        onClose={handleCloseRazorpayModal}
        title="Create Razorpay Linked Account"
        size="lg"
      >
        {onboardingData?.data && selectedDesigner ? (
          <div className="space-y-4">
            <p className="text-sm text-muted mb-4">
              Review the following details before creating the Razorpay linked account. All fields are for display only.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.designer_name || selectedDesigner.name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.designer_email || selectedDesigner.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step1?.phone || onboardingData.data.contact_phone || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.legal_business_name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Type</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.business_type || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PAN Number</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.pan_number || 'N/A'}
                </p>
              </div>
              {onboardingData.data.step2?.gst_number && (
                <div>
                  <label className="block text-sm font-medium mb-2">GST Number</label>
                  <p className="text-muted bg-muted/10 p-2 rounded-lg">{onboardingData.data.step2.gst_number}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.street_address || onboardingData.data.contact_address || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.city || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.state || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pincode</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.pincode || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">
                  {onboardingData.data.step2?.country || 'India'}
                </p>
              </div>
              {onboardingData.data.bank_account_holder_name && (
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Account Holder Name</label>
                  <p className="text-muted bg-muted/10 p-2 rounded-lg">{onboardingData.data.bank_account_holder_name}</p>
                </div>
              )}
              {onboardingData.data.bank_account_number && (
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Account Number</label>
                  <p className="text-muted bg-muted/10 p-2 rounded-lg font-mono">{onboardingData.data.bank_account_number}</p>
                </div>
              )}
              {onboardingData.data.bank_ifsc_code && (
                <div>
                  <label className="block text-sm font-medium mb-2">Bank IFSC Code</label>
                  <p className="text-muted bg-muted/10 p-2 rounded-lg font-mono">{onboardingData.data.bank_ifsc_code}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseRazorpayModal} title="Cancel">
                <XMarkIcon className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateAccount}
                isLoading={isCreatingAccount}
                title="Create Razorpay Account"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted">Loading designer details...</p>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectModal || showRejectModalFromTable}
        onClose={handleCloseRejectModal}
        title="Reject Designer Application"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Please provide a reason for rejecting this designer&apos;s application.
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
            <Button variant="outline" onClick={handleCloseRejectModal} title="Cancel Rejection">
              <XMarkIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
              isLoading={isRejecting}
              title="Submit Rejection"
            >
              <XCircleIcon className="w-4 h-4 mr-2" />
              Submit Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Designer Modal */}
      <Modal
        isOpen={showAddDesignerModal}
        onClose={handleCloseAddDesignerModal}
        title="Add New Designer"
        size="xl"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {/* ONBOARDING STEP 1 */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 1 - Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Profile Photo URL</label>
                <Input
                  value={addDesignerForm.step1.profilePhoto || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, profilePhoto: e.target.value }
                  }))}
                  placeholder="Enter profile photo URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input
                  value={addDesignerForm.step1.firstName || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, firstName: e.target.value }
                  }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input
                  value={addDesignerForm.step1.lastName || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, lastName: e.target.value }
                  }))}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={addDesignerForm.step1.email || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, email: e.target.value }
                  }))}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={addDesignerForm.step1.phoneNumber || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, phoneNumber: e.target.value }
                  }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={addDesignerForm.step1.password || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, password: e.target.value }
                  }))}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={addDesignerForm.step1.confirmPassword || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step1: { ...prev.step1, confirmPassword: e.target.value }
                  }))}
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          {/* ONBOARDING STEP 2 */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 2 - Business Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Email</label>
                <Input
                  type="email"
                  value={addDesignerForm.step2.businessEmail || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, businessEmail: e.target.value }
                  }))}
                  placeholder="Enter business email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Phone Number</label>
                <Input
                  type="tel"
                  value={addDesignerForm.step2.businessPhoneNumber || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, businessPhoneNumber: e.target.value }
                  }))}
                  placeholder="Enter business phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Legal Business Name</label>
                <Input
                  value={addDesignerForm.step2.legalBusinessName || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, legalBusinessName: e.target.value }
                  }))}
                  placeholder="Enter legal business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Type</label>
                <Dropdown
                  options={businessTypeOptions}
                  value={addDesignerForm.step2.businessType || 'Proprietorship'}
                  onChange={(value) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, businessType: value as any }
                  }))}
                  placeholder="Select Business Type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Input
                  value={addDesignerForm.step2.category || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, category: e.target.value }
                  }))}
                  placeholder="Enter category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subcategory</label>
                <Input
                  value={addDesignerForm.step2.subcategory || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, subcategory: e.target.value }
                  }))}
                  placeholder="Enter subcategory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Model</label>
                <Dropdown
                  options={businessModelOptions}
                  value={addDesignerForm.step2.businessModel || 'Freelancer'}
                  onChange={(value) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, businessModel: value as any }
                  }))}
                  placeholder="Select Business Model"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <Input
                  value={addDesignerForm.step2.streetAddress || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, streetAddress: e.target.value }
                  }))}
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Input
                  value={addDesignerForm.step2.city || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, city: e.target.value }
                  }))}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <Input
                  value={addDesignerForm.step2.state || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, state: e.target.value }
                  }))}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pincode</label>
                <Input
                  value={addDesignerForm.step2.pincode || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, pincode: e.target.value }
                  }))}
                  placeholder="Enter pincode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <Input
                  value={addDesignerForm.step2.country || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, country: e.target.value }
                  }))}
                  placeholder="Enter country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PAN Number</label>
                <Input
                  value={addDesignerForm.step2.panNumber || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, panNumber: e.target.value }
                  }))}
                  placeholder="Enter PAN number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PAN Document File URL</label>
                <Input
                  value={addDesignerForm.step2.panDocumentFile || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, panDocumentFile: e.target.value }
                  }))}
                  placeholder="Enter PAN document URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">GST Number (Optional)</label>
                <Input
                  value={addDesignerForm.step2.gstNumber || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, gstNumber: e.target.value }
                  }))}
                  placeholder="Enter GST number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">MSME Number (Optional)</label>
                <Input
                  value={addDesignerForm.step2.msmeNumber || ''}
                  onChange={(e) => setAddDesignerForm(prev => ({
                    ...prev,
                    step2: { ...prev.step2, msmeNumber: e.target.value }
                  }))}
                  placeholder="Enter MSME number"
                />
              </div>
            </div>
          </div>

          {/* ONBOARDING STEP 3 */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 3 - Designs Upload</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <p className="text-sm text-muted">
                  Designer needs to upload a minimum of 50 designs to activate their account. 
                  This step will be completed by the designer after onboarding.
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {addDesignerError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {addDesignerError}
            </div>
          )}
          {addDesignerSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {addDesignerSuccess}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={handleCloseAddDesignerModal} 
              className="flex items-center gap-2"
              disabled={isSubmittingDesigner}
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmitAddDesigner}
              isLoading={isSubmittingDesigner}
              className="flex items-center gap-2"
              disabled={isSubmittingDesigner}
            >
              <PlusIcon className="w-4 h-4" />
              Create Designer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={handleCloseApproveModal}
        title="Approve Designer"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Are you sure you want to approve this designer? This will set their DesignerProfile status to &quot;verified&quot; and activate their account.
          </p>
          {selectedDesigner && (
            <div className="bg-muted/10 p-3 rounded-lg">
              <p className="text-sm font-medium">
                Designer: {selectedDesigner.name || 'N/A'}
              </p>
              <p className="text-xs text-muted mt-1">
                Email: {selectedDesigner.email || 'N/A'}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseApproveModal} title="Cancel">
              <XMarkIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmApprove}
              title="Confirm Approval"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        isOpen={showImagePreview}
        onClose={() => {
          setShowImagePreview(false);
          setPreviewImage(null);
          setPreviewImagesList([]);
          setCurrentImageIndex(0);
        }}
        title={previewImage?.title || 'Image Preview'}
        size="lg"
      >
        {previewImage && previewImagesList.length > 0 && (
          <div className="space-y-4">
            <div className="relative w-full flex items-center justify-center bg-muted/10 rounded-lg p-4 min-h-[400px]">
              {/* Previous Button */}
              {previewImagesList.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : previewImagesList.length - 1;
                    setCurrentImageIndex(prevIndex);
                    setPreviewImage(previewImagesList[prevIndex]);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                  title="Previous Image"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
              )}
              
              {/* Image */}
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted">Image not available</div>';
                  }
                }}
              />
              
              {/* Next Button */}
              {previewImagesList.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = currentImageIndex < previewImagesList.length - 1 ? currentImageIndex + 1 : 0;
                    setCurrentImageIndex(nextIndex);
                    setPreviewImage(previewImagesList[nextIndex]);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
                  title="Next Image"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              )}
              
              {/* Image Counter */}
              {previewImagesList.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {previewImagesList.length}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted">
                {previewImagesList.length > 1 && (
                  <span>Use arrow buttons to navigate</span>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowImagePreview(false);
                  setPreviewImage(null);
                  setPreviewImagesList([]);
                  setCurrentImageIndex(0);
                }}
                title="Close Preview"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
