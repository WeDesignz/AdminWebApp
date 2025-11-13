'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { MagnifyingGlassIcon, EyeIcon, UserCircleIcon, CheckCircleIcon, XCircleIcon, UsersIcon, ChartBarIcon, CreditCardIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Customer } from '@/types';
import { KpiCard } from '@/components/common/KpiCard';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', page, pageSize, search, statusFilter, planStatusFilter],
    queryFn: () => MockAPI.getCustomers({ page, limit: pageSize, status: statusFilter, planStatus: planStatusFilter, search }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['customerStats'],
    queryFn: () => MockAPI.getCustomerStats(),
  });

  // Filter options
  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Deactivated' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const planStatusFilterOptions = [
    { value: '', label: 'All Plans' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'none', label: 'None' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedCustomer(null);
  };

  const handleViewActivity = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowActivityModal(true);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedCustomer(null);
  };

  const handleActivateCustomer = async (customer: Customer) => {
    setIsUpdatingStatus(true);
    await MockAPI.updateCustomerStatus(customer.id, 'active');
    setIsUpdatingStatus(false);
    refetch();
  };

  const handleDeactivateCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeactivateModal(true);
  };

  const handleCloseDeactivateModal = () => {
    setShowDeactivateModal(false);
    setDeactivationReason('');
    setSelectedCustomer(null);
  };

  const handleSubmitDeactivation = async () => {
    if (!selectedCustomer || !deactivationReason.trim()) return;
    setIsUpdatingStatus(true);
    await MockAPI.updateCustomerStatus(selectedCustomer.id, 'inactive', deactivationReason);
    setIsUpdatingStatus(false);
    setShowDeactivateModal(false);
    setDeactivationReason('');
    setSelectedCustomer(null);
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted mt-1">View and manage customer accounts</p>
          </div>
        </div>

        {/* Statistics Tiles */}
        {statsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              title="Total Customers"
              value={statsData.data.totalCustomers}
              icon={<UsersIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Monthly Active Users"
              value={statsData.data.monthlyActiveUsers}
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Paid Users"
              value={statsData.data.paidUsers}
              icon={<CreditCardIcon className="w-6 h-6" />}
            />
          </div>
        )}

        <div className="card">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <Input
                placeholder="Search by name, email, or phone number..."
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
            <div className="w-48">
              <Dropdown
                options={planStatusFilterOptions}
                value={planStatusFilter}
                onChange={setPlanStatusFilter}
                placeholder="Filter by plan"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Name</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Email</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Phone</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Joined</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Plan Status</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Purchases</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Total Spent</th>
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
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  data?.data.map((customer) => (
                    <tr key={customer.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{customer.name}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">{customer.email}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">{customer.phoneNumber || 'N/A'}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">{formatDate(customer.joinedAt)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          customer.status === 'active' ? 'bg-success/20 text-success' :
                          customer.status === 'blocked' ? 'bg-error/20 text-error' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          customer.planStatus === 'active' ? 'bg-success/20 text-success' :
                          customer.planStatus === 'expired' ? 'bg-warning/20 text-warning' :
                          'bg-muted/20 text-muted'
                        }`}>
                          {customer.planStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{customer.totalPurchases}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{formatCurrency(customer.totalSpent)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewProfile(customer)}
                            title="View Profile"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewActivity(customer)}
                            title="View Activity"
                          >
                            <UserCircleIcon className="w-4 h-4" />
                          </Button>
                          {customer.status === 'active' ? (
                            <Button 
                              size="sm" 
                              variant="danger"
                              onClick={() => handleDeactivateCustomer(customer)}
                              disabled={isUpdatingStatus}
                              title="Deactivate"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => handleActivateCustomer(customer)}
                              disabled={isUpdatingStatus}
                              title="Activate"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
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

      {/* View Profile Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title="Customer Profile"
        size="xl"
      >
        {selectedCustomer && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <p className="text-muted">{selectedCustomer.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <p className="text-muted">{selectedCustomer.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <p className="text-muted">{selectedCustomer.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Joined Date</label>
                  <p className="text-muted">{formatDate(selectedCustomer.joinedAt)}</p>
                </div>
                {selectedCustomer.address && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Address</label>
                      <p className="text-muted">
                        {selectedCustomer.address.street}, {selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.pincode}, {selectedCustomer.address.country}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Active Subscription Plan */}
            {selectedCustomer.plan ? (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Active Subscription Plan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan Name</label>
                    <p className="text-muted">{selectedCustomer.plan.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan Type</label>
                    <p className="text-muted capitalize">{selectedCustomer.plan.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <p className="text-muted capitalize">{selectedCustomer.plan.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <p className="text-muted">{formatDate(selectedCustomer.plan.startDate)}</p>
                  </div>
                  {selectedCustomer.plan.expiryDate && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Date</label>
                      <p className="text-muted">{formatDate(selectedCustomer.plan.expiryDate)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">Available Downloads</label>
                    <p className="text-muted">{selectedCustomer.plan.availableDownloads}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Downloads</label>
                    <p className="text-muted">{selectedCustomer.plan.totalDownloads}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Active Subscription Plan</h3>
                <p className="text-muted">No active subscription plan</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseViewModal} title="Close">
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Activity Summary Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={handleCloseActivityModal}
        title="Customer Activity Summary"
        size="xl"
      >
        {selectedCustomer && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* Views History */}
            {selectedCustomer.views && selectedCustomer.views.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Views History</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCustomer.views.map((view) => (
                    <div key={view.id} className="p-3 bg-muted/10 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{view.designTitle}</p>
                          <p className="text-sm text-muted">Category: {view.category}</p>
                        </div>
                        <p className="text-sm text-muted">{formatDate(view.viewedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Summary */}
            {selectedCustomer.purchases && selectedCustomer.purchases.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Purchase Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Purchases:</span>
                    <span className="text-muted">{selectedCustomer.totalPurchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Spent:</span>
                    <span className="text-muted font-medium">{formatCurrency(selectedCustomer.totalSpent)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">Purchase History</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCustomer.purchases.map((purchase) => (
                      <div key={purchase.id} className="p-3 bg-muted/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{purchase.itemName}</p>
                            <p className="text-sm text-muted capitalize">Type: {purchase.type}</p>
                            <p className="text-sm text-muted">Payment Ref: {purchase.paymentReference}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(purchase.amount)}</p>
                            <p className="text-sm text-muted">{formatDate(purchase.date)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Download Summary */}
            {selectedCustomer.downloads && selectedCustomer.downloads.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Download Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Downloads:</span>
                    <span className="text-muted">{selectedCustomer.downloads.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">Download History</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCustomer.downloads.map((download) => (
                      <div key={download.id} className="p-3 bg-muted/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{download.designTitle}</p>
                            <p className="text-sm text-muted">Type: {download.designType}</p>
                            <p className="text-sm text-muted">ID: {download.designId}</p>
                          </div>
                          <p className="text-sm text-muted">{formatDate(download.downloadedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Plan */}
            {selectedCustomer.plan && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Active Plan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan Name</label>
                    <p className="text-muted">{selectedCustomer.plan.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan Type</label>
                    <p className="text-muted capitalize">{selectedCustomer.plan.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <p className="text-muted capitalize">{selectedCustomer.plan.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Validity</label>
                    <p className="text-muted">
                      {formatDate(selectedCustomer.plan.startDate)} - {selectedCustomer.plan.expiryDate ? formatDate(selectedCustomer.plan.expiryDate) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Available Downloads</label>
                    <p className="text-muted">{selectedCustomer.plan.availableDownloads}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Downloads</label>
                    <p className="text-muted">{selectedCustomer.plan.totalDownloads}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wishlist Items */}
            {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Wishlist Items</h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedCustomer.wishlist.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg overflow-hidden">
                      <img src={item.designThumbnail} alt={item.designTitle} className="w-full h-32 object-cover" />
                      <div className="p-3">
                        <p className="font-medium text-sm">{item.designTitle}</p>
                        <p className="text-sm text-muted mt-1">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-muted mt-1">Added: {formatDate(item.addedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Items */}
            {selectedCustomer.cart && selectedCustomer.cart.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Cart Items</h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedCustomer.cart.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg overflow-hidden">
                      <img src={item.designThumbnail} alt={item.designTitle} className="w-full h-32 object-cover" />
                      <div className="p-3">
                        <p className="font-medium text-sm">{item.designTitle}</p>
                        <p className="text-sm text-muted mt-1">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-muted mt-1">Added: {formatDate(item.addedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseActivityModal} title="Close">
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivation Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={handleCloseDeactivateModal}
        title="Deactivate Customer Account"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Please provide a reason for deactivating this customer&apos;s account. This action will be recorded with your admin details and timestamp.
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">Deactivation Reason</label>
            <textarea
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              className="input-field w-full min-h-[120px] resize-none"
              placeholder="Enter the reason for deactivation..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDeactivateModal} title="Cancel">
              <XMarkIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSubmitDeactivation}
              disabled={!deactivationReason.trim() || isUpdatingStatus}
              isLoading={isUpdatingStatus}
              title="Deactivate Account"
            >
              <XCircleIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
