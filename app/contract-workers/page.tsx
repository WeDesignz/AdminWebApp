'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useState } from 'react';
import { formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  CheckCircleIcon, 
  XCircleIcon, 
  UsersIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ContractWorker } from '@/types';
import toast from 'react-hot-toast';

export default function ContractWorkersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<ContractWorker | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    email: '',
    phone: '',
    employeeId: '',
    esiNumber: '',
    status: 'active' as 'active' | 'inactive' | 'terminated',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankAccountHolderName: '',
    dateOfJoining: '',
    dateOfBirth: '',
    notes: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contract-workers', page, pageSize, search, statusFilter],
    queryFn: async () => {
      const response = await API.coreAdmin.getContractWorkers({
        page,
        page_size: pageSize,
        search,
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || { page, page_size: pageSize, total_pages: 1, total_count: 0 },
        };
      }
      return { data: [], pagination: { page, page_size: pageSize, total_pages: 1, total_count: 0 } };
    },
  });

  const workers: ContractWorker[] = data?.data || [];
  const pagination = data?.pagination || { page, page_size: pageSize, total_pages: 1, total_count: 0 };

  // Filter options
  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      fatherName: '',
      email: '',
      phone: '',
      employeeId: '',
      esiNumber: '',
      status: 'active',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      bankAccountNumber: '',
      bankIfscCode: '',
      bankAccountHolderName: '',
      dateOfJoining: '',
      dateOfBirth: '',
      notes: '',
    });
  };

  const handleViewDetails = (worker: ContractWorker) => {
    setSelectedWorker(worker);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedWorker(null);
  };

  const handleAddWorker = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleEditWorker = (worker: ContractWorker) => {
    // Format dates for date input (YYYY-MM-DD)
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    setFormData({
      firstName: worker.firstName || '',
      lastName: worker.lastName || '',
      fatherName: worker.fatherName || '',
      email: worker.email || '',
      phone: worker.phone || '',
      employeeId: worker.employeeId || '',
      esiNumber: worker.esiNumber || '',
      status: worker.status || 'active',
      address: worker.address || '',
      city: worker.city || '',
      state: worker.state || '',
      postalCode: worker.postalCode || '',
      country: worker.country || 'India',
      bankAccountNumber: worker.bankAccountNumber || '',
      bankIfscCode: worker.bankIfscCode || '',
      bankAccountHolderName: worker.bankAccountHolderName || '',
      dateOfJoining: formatDateForInput(worker.dateOfJoining),
      dateOfBirth: formatDateForInput(worker.dateOfBirth),
      notes: worker.notes || '',
    });
    setSelectedWorker(worker);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedWorker(null);
    resetForm();
  };

  const handleSubmitAdd = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await API.coreAdmin.createContractWorker({
        first_name: formData.firstName,
        last_name: formData.lastName,
        father_name: formData.fatherName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        employee_id: formData.employeeId || undefined,
        esi_number: formData.esiNumber || undefined,
        status: formData.status,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postalCode || undefined,
        country: formData.country,
        bank_account_number: formData.bankAccountNumber || undefined,
        bank_ifsc_code: formData.bankIfscCode || undefined,
        bank_account_holder_name: formData.bankAccountHolderName || undefined,
        date_of_joining: formData.dateOfJoining || undefined,
        date_of_birth: formData.dateOfBirth || undefined,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        toast.success('Contract worker created successfully');
        handleCloseAddModal();
        queryClient.invalidateQueries({ queryKey: ['contract-workers'] });
      } else {
        toast.error(response.error || 'Failed to create contract worker');
      }
    } catch (error) {
      toast.error('An error occurred while creating contract worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedWorker || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await API.coreAdmin.updateContractWorker(selectedWorker.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        father_name: formData.fatherName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        employee_id: formData.employeeId || undefined,
        esi_number: formData.esiNumber || undefined,
        status: formData.status,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postalCode || undefined,
        country: formData.country,
        bank_account_number: formData.bankAccountNumber || undefined,
        bank_ifsc_code: formData.bankIfscCode || undefined,
        bank_account_holder_name: formData.bankAccountHolderName || undefined,
        date_of_joining: formData.dateOfJoining || undefined,
        date_of_birth: formData.dateOfBirth || undefined,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        toast.success('Contract worker updated successfully');
        handleCloseEditModal();
        queryClient.invalidateQueries({ queryKey: ['contract-workers'] });
      } else {
        toast.error(response.error || 'Failed to update contract worker');
      }
    } catch (error) {
      toast.error('An error occurred while updating contract worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorker = async (worker: ContractWorker) => {
    if (!confirm(`Are you sure you want to delete ${worker.fullName || worker.firstName}?`)) {
      return;
    }

    try {
      const response = await API.coreAdmin.deleteContractWorker(worker.id);
      if (response.success) {
        toast.success('Contract worker deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['contract-workers'] });
      } else {
        toast.error(response.error || 'Failed to delete contract worker');
      }
    } catch (error) {
      toast.error('An error occurred while deleting contract worker');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
      terminated: { label: 'Terminated', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contract Workers</h1>
            <p className="text-muted mt-1">Manage contract workers and employees</p>
          </div>
          <Button
            variant="primary"
            onClick={handleAddWorker}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Contract Worker
          </Button>
        </div>

        <div className="card">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <Input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="w-48">
              <Dropdown
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                placeholder="Filter by status"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">No contract workers found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold">ESI Number</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker) => (
                      <tr key={worker.id} className="border-b border-border hover:bg-muted/5">
                        <td className="py-3 px-4">
                          <div className="font-medium">{worker.fullName || `${worker.firstName} ${worker.lastName}`}</div>
                        </td>
                        <td className="py-3 px-4 text-muted">{worker.email}</td>
                        <td className="py-3 px-4 text-muted">{worker.employeeId || '-'}</td>
                        <td className="py-3 px-4 text-muted">{worker.esiNumber || '-'}</td>
                        <td className="py-3 px-4 text-muted">{worker.phone || '-'}</td>
                        <td className="py-3 px-4">{getStatusBadge(worker.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(worker)}
                              className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="w-5 h-5 text-primary" />
                            </button>
                            <button
                              onClick={() => handleEditWorker(worker)}
                              className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker)}
                              className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">Show</span>
                  <Dropdown
                    options={pageSizeOptions}
                    value={String(pageSize)}
                    onChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-muted">entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title="Contract Worker Details"
        size="xl"
      >
        {selectedWorker && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">First Name</label>
                <p className="text-base font-medium">{selectedWorker.firstName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Last Name</label>
                <p className="text-base font-medium">{selectedWorker.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Father Name</label>
                <p className="text-base">{selectedWorker.fatherName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Email</label>
                <p className="text-base">{selectedWorker.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Phone</label>
                <p className="text-base">{selectedWorker.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Employee ID</label>
                <p className="text-base">{selectedWorker.employeeId || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">ESI Number</label>
                <p className="text-base">{selectedWorker.esiNumber || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Status</label>
                <div className="mt-1">{getStatusBadge(selectedWorker.status)}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 text-muted">Address</label>
                <p className="text-base">{selectedWorker.address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">City</label>
                <p className="text-base">{selectedWorker.city || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">State</label>
                <p className="text-base">{selectedWorker.state || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Postal Code</label>
                <p className="text-base">{selectedWorker.postalCode || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Country</label>
                <p className="text-base">{selectedWorker.country || 'India'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Bank Account Number</label>
                <p className="text-base">{selectedWorker.bankAccountNumber || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Bank IFSC Code</label>
                <p className="text-base">{selectedWorker.bankIfscCode || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Bank Account Holder Name</label>
                <p className="text-base">{selectedWorker.bankAccountHolderName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Date of Joining</label>
                <p className="text-base">{selectedWorker.dateOfJoining ? formatDate(selectedWorker.dateOfJoining) : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Date of Birth</label>
                <p className="text-base">{selectedWorker.dateOfBirth ? formatDate(selectedWorker.dateOfBirth) : '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 text-muted">Notes</label>
                <p className="text-base whitespace-pre-wrap">{selectedWorker.notes || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Created At</label>
                <p className="text-base">{formatDate(selectedWorker.createdAt)}</p>
              </div>
              {selectedWorker.updatedAt && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted">Updated At</label>
                  <p className="text-base">{formatDate(selectedWorker.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title="Add Contract Worker"
        size="xl"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Father Name</label>
              <Input
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="Enter father name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Employee ID</label>
              <Input
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Enter employee ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ESI Number</label>
              <Input
                value={formData.esiNumber}
                onChange={(e) => setFormData({ ...formData, esiNumber: e.target.value })}
                placeholder="Enter ESI number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Dropdown
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'terminated' })}
                placeholder="Select status"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                className="input-field w-full min-h-[80px] resize-y"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter state"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Postal Code</label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Enter country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank Account Number</label>
              <Input
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                placeholder="Enter bank account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank IFSC Code</label>
              <Input
                value={formData.bankIfscCode}
                onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                placeholder="Enter IFSC code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank Account Holder Name</label>
              <Input
                value={formData.bankAccountHolderName}
                onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
                placeholder="Enter account holder name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date of Joining</label>
              <Input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes"
                className="input-field w-full min-h-[100px] resize-y"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseAddModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitAdd} isLoading={isSubmitting}>
              Add Worker
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Contract Worker"
        size="xl"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Father Name</label>
              <Input
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="Enter father name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Employee ID</label>
              <Input
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Enter employee ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ESI Number</label>
              <Input
                value={formData.esiNumber}
                onChange={(e) => setFormData({ ...formData, esiNumber: e.target.value })}
                placeholder="Enter ESI number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Dropdown
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'terminated' })}
                placeholder="Select status"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                className="input-field w-full min-h-[80px] resize-y"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter state"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Postal Code</label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Enter country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank Account Number</label>
              <Input
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                placeholder="Enter bank account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank IFSC Code</label>
              <Input
                value={formData.bankIfscCode}
                onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                placeholder="Enter IFSC code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank Account Holder Name</label>
              <Input
                value={formData.bankAccountHolderName}
                onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
                placeholder="Enter account holder name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date of Joining</label>
              <Input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes"
                className="input-field w-full min-h-[100px] resize-y"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseEditModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitEdit} isLoading={isSubmitting}>
              Update Worker
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

