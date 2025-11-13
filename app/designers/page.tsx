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
import { MagnifyingGlassIcon, EyeIcon, XMarkIcon, UsersIcon, ClockIcon, CreditCardIcon, XCircleIcon, CheckIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Designer, DesignerOnboardingStep1, DesignerOnboardingStep2, DesignerOnboardingStep3 } from '@/types';
import { KpiCard } from '@/components/common/KpiCard';
import { API } from '@/lib/api';

export default function DesignersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState('');
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRejectModalFromTable, setShowRejectModalFromTable] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showAddDesignerModal, setShowAddDesignerModal] = useState(false);
  const [isSubmittingDesigner, setIsSubmittingDesigner] = useState(false);
  const [addDesignerError, setAddDesignerError] = useState<string | null>(null);
  const [addDesignerSuccess, setAddDesignerSuccess] = useState<string | null>(null);
  
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

  // Filter options for onboarding status
  const onboardingStatusOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'admin_approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Filter designers based on onboarding status filter
  const filteredDesigners = onboardingStatusFilter 
    ? data?.data.filter(d => d.onboardingStatus === onboardingStatusFilter) || []
    : data?.data || [];

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
    setShowViewModal(false);
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
                  filteredDesigners.map((designer) => (
                    <tr key={designer.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{designer.name}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">{designer.email}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(designer.joinedAt)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          designer.status === 'active' ? 'bg-success/20 text-success' :
                          designer.status === 'pending' ? 'bg-warning/20 text-warning' :
                          'bg-error/20 text-error'
                        }`}>
                          {designer.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(designer.lifetimeEarnings)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(designer.pendingPayout)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewDesigner(designer)}
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleRejectFromTable(designer)}
                            title="Reject"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
        title="Designer Onboarding Details"
        size="xl"
      >
        {selectedDesigner?.onboarding ? (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* ONBOARDING STEP 1 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 1 - Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Profile Photo</label>
                  <div className="w-32 h-32 rounded-lg overflow-hidden border border-border">
                    <img 
                      src={selectedDesigner.onboarding.step1.profilePhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step1.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step1.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step1.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step1.phoneNumber}</p>
                </div>
              </div>
            </div>

            {/* ONBOARDING STEP 2 */}
            <div className="space-y-4 border-t border-border pt-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 2 - Business Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Email</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.businessEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Phone Number</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.businessPhoneNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Legal Business Name</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.legalBusinessName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Type</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.businessType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subcategory</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.subcategory}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Model</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.businessModel}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Street Address</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.streetAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.city}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.state}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pincode</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.pincode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.country}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PAN Number</label>
                  <p className="text-muted">{selectedDesigner.onboarding.step2.panNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PAN Document File</label>
                  <div className="mt-2">
                    <a 
                      href={selectedDesigner.onboarding.step2.panDocumentFile} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View PAN Document
                    </a>
                  </div>
                </div>
                {selectedDesigner.onboarding.step2.gstNumber && (
                  <div>
                    <label className="block text-sm font-medium mb-2">GST Number</label>
                    <p className="text-muted">{selectedDesigner.onboarding.step2.gstNumber}</p>
                  </div>
                )}
                {selectedDesigner.onboarding.step2.msmeNumber && (
                  <div>
                    <label className="block text-sm font-medium mb-2">MSME Number</label>
                    <p className="text-muted">{selectedDesigner.onboarding.step2.msmeNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ONBOARDING STEP 3 */}
            <div className="space-y-4 border-t border-border pt-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">ONBOARDING STEP 3 - Designs Upload</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Designs Uploaded</label>
                  <p className="text-muted">
                    {selectedDesigner.onboarding.step3.designsUploaded} / 50 (Minimum Required)
                    {selectedDesigner.onboarding.step3.designsUploaded >= 50 && (
                      <span className="ml-2 text-success">✓ Requirement Met</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Uploaded Designs</label>
                  <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {selectedDesigner.onboarding.step3.designs.slice(0, 20).map((design) => (
                      <div key={design.id} className="aspect-square rounded-lg overflow-hidden border border-border">
                        <img 
                          src={design.url} 
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {selectedDesigner.onboarding.step3.designs.length > 20 && (
                    <p className="text-sm text-muted mt-2">
                      + {selectedDesigner.onboarding.step3.designs.length - 20} more designs
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseViewModal} title="Close">
                <XMarkIcon className="w-4 h-4" />
              </Button>
              <Button variant="primary" onClick={handleCreateRazorpayAccount} title="Create Razorpay Linked Account">
                <CheckIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted">Onboarding data is not available for this designer.</p>
            <Button variant="outline" onClick={handleCloseViewModal} className="mt-4" title="Close">
              <XMarkIcon className="w-4 h-4" />
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
        {selectedDesigner?.razorpayDetails && (
          <div className="space-y-4">
            <p className="text-sm text-muted mb-4">
              Review the following details before creating the Razorpay linked account. All fields are for display only.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.businessName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Type</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.businessType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PAN Number</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.panNumber}</p>
              </div>
              {selectedDesigner.razorpayDetails.gstNumber && (
                <div>
                  <label className="block text-sm font-medium mb-2">GST Number</label>
                  <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.gstNumber}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.streetAddress}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.city}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.state}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pincode</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.pincode}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <p className="text-muted bg-muted/10 p-2 rounded-lg">{selectedDesigner.razorpayDetails.country}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseRazorpayModal} title="Cancel">
                <XMarkIcon className="w-4 h-4" />
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateAccount}
                isLoading={isCreatingAccount}
                title="Create Account"
              >
                <CheckIcon className="w-4 h-4" />
              </Button>
            </div>
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
            <Button variant="outline" onClick={handleCloseRejectModal} title="Cancel">
              <XMarkIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
              isLoading={isRejecting}
              title="Submit Rejection"
            >
              <CheckIcon className="w-4 h-4" />
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
    </DashboardLayout>
  );
}
