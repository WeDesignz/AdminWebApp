'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { Bundle, Design } from '@/types';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';
import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function BundlesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [showDesignSelector, setShowDesignSelector] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    status: 'active' as 'active' | 'inactive' | 'draft',
    selectedDesignIds: [] as string[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bundles', search],
    queryFn: () => MockAPI.getBundles({ search }),
  });

  const { data: designsData } = useQuery<ApiResponse<PaginatedResponse<Design>>>({
    queryKey: ['designs-for-bundle'],
    queryFn: () => MockAPI.getDesigns({ status: 'approved', limit: 1000 }),
    enabled: showDesignSelector || showCreateModal || showEditModal,
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      status: 'active',
      selectedDesignIds: [],
    });
    setSelectedBundle(null);
    setShowCreateModal(true);
  };

  const handleEdit = (bundle: Bundle) => {
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      price: bundle.price.toString(),
      status: bundle.status,
      selectedDesignIds: bundle.designIds || [],
    });
    setSelectedBundle(bundle);
    setShowEditModal(true);
  };

  const handleDelete = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setShowDeleteModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: '',
      description: '',
      price: '',
      status: 'active',
      selectedDesignIds: [],
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedBundle(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      status: 'active',
      selectedDesignIds: [],
    });
  };

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
  ];

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Bundle name is required');
      return;
    }
    if (formData.selectedDesignIds.length === 0) {
      toast.error('Please select at least one design');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await MockAPI.createBundle({
        name: formData.name,
        description: formData.description,
        designIds: formData.selectedDesignIds,
        price: parseFloat(formData.price),
        status: formData.status,
      });

      if (response.success) {
        toast.success('Bundle created successfully');
        handleCloseCreateModal();
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
      } else {
        toast.error(response.error || 'Failed to create bundle');
      }
    } catch (error) {
      toast.error('An error occurred while creating bundle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedBundle) return;
    if (!formData.name.trim()) {
      toast.error('Bundle name is required');
      return;
    }
    if (formData.selectedDesignIds.length === 0) {
      toast.error('Please select at least one design');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await MockAPI.updateBundle(selectedBundle.id, {
        name: formData.name,
        description: formData.description,
        designIds: formData.selectedDesignIds,
        price: parseFloat(formData.price),
        status: formData.status,
      });

      if (response.success) {
        toast.success('Bundle updated successfully');
        handleCloseEditModal();
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
      } else {
        toast.error(response.error || 'Failed to update bundle');
      }
    } catch (error) {
      toast.error('An error occurred while updating bundle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedBundle) return;
    setIsDeleting(true);
    try {
      const response = await MockAPI.deleteBundle(selectedBundle.id);
      if (response.success) {
        toast.success('Bundle deleted successfully');
        setShowDeleteModal(false);
        setSelectedBundle(null);
        queryClient.invalidateQueries({ queryKey: ['bundles'] });
      } else {
        toast.error(response.error || 'Failed to delete bundle');
      }
    } catch (error) {
      toast.error('An error occurred while deleting bundle');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleDesignSelection = (designId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedDesignIds: prev.selectedDesignIds.includes(designId)
        ? prev.selectedDesignIds.filter((id) => id !== designId)
        : [...prev.selectedDesignIds, designId],
    }));
  };

  const filteredBundles = data?.data?.filter((bundle) =>
    bundle.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bundles</h1>
            <p className="text-muted mt-1">Manage design bundles</p>
          </div>
          <Button variant="primary" onClick={handleCreate} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Create Bundle
          </Button>
        </div>

        {/* Search Bar */}
        <div className="card">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              placeholder="Search bundles by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Bundles Grid */}
        {isLoading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredBundles.length === 0 ? (
          <div className="card text-center py-12">
            <PhotoIcon className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg">No bundles found</p>
            <p className="text-muted text-sm mt-2">Create your first bundle to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBundles.map((bundle) => (
              <div key={bundle.id} className="card-hover group">
                {/* Bundle Thumbnail */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-muted/20">
                  {bundle.thumbnailUrl ? (
                    <img
                      src={bundle.thumbnailUrl}
                      alt={bundle.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : bundle.designs && bundle.designs.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1 h-full">
                      {bundle.designs.slice(0, 4).map((design, idx) => (
                        <img
                          key={design.id}
                          src={design.thumbnailUrl}
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="w-12 h-12 text-muted" />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-semibold uppercase ${
                    bundle.status === 'active' ? 'bg-success/90 text-white' :
                    bundle.status === 'inactive' ? 'bg-muted/90 text-white' :
                    'bg-warning/90 text-white'
                  }`}>
                    {bundle.status}
                  </span>
                </div>

                {/* Bundle Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg truncate">{bundle.name}</h3>
                  {bundle.description && (
                    <p className="text-sm text-muted line-clamp-2">{bundle.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted">Designs</p>
                      <p className="font-medium">{bundle.designIds?.length || 0} designs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Price</p>
                      <p className="font-bold text-primary">{formatCurrency(bundle.price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(bundle)}
                      className="flex-1"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(bundle)}
                      className="flex-1"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Bundle Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create Bundle"
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Bundle Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter bundle name"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter bundle description (optional)"
              className="input-field w-full min-h-[100px] resize-y"
              rows={4}
            />
          </div>
          <Input
            label="Price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Dropdown
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'draft' })}
              placeholder="Select Status"
            />
          </div>

          {/* Design Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Designs <span className="text-error">*</span>
            </label>
            <div className="border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {designsData?.data?.data && designsData.data.data.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {designsData.data.data.map((design: Design) => (
                    <div
                      key={design.id}
                      onClick={() => toggleDesignSelection(design.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        formData.selectedDesignIds.includes(design.id)
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={design.thumbnailUrl}
                        alt={design.title}
                        className="w-full h-full object-cover"
                      />
                      {formData.selectedDesignIds.includes(design.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <CheckIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                        <p className="text-xs font-medium truncate">{design.title}</p>
                        <p className="text-xs">{formatCurrency(design.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-8">No designs available</p>
              )}
            </div>
            {formData.selectedDesignIds.length > 0 && (
              <p className="text-sm text-muted mt-2">
                {formData.selectedDesignIds.length} design{formData.selectedDesignIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseCreateModal} className="flex items-center gap-2">
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitCreate}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Create Bundle
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Bundle Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Bundle"
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Bundle Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter bundle name"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter bundle description (optional)"
              className="input-field w-full min-h-[100px] resize-y"
              rows={4}
            />
          </div>
          <Input
            label="Price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Dropdown
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'draft' })}
              placeholder="Select Status"
            />
          </div>

          {/* Design Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Designs <span className="text-error">*</span>
            </label>
            <div className="border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {designsData?.data?.data && designsData.data.data.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {designsData.data.data.map((design: Design) => (
                    <div
                      key={design.id}
                      onClick={() => toggleDesignSelection(design.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        formData.selectedDesignIds.includes(design.id)
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={design.thumbnailUrl}
                        alt={design.title}
                        className="w-full h-full object-cover"
                      />
                      {formData.selectedDesignIds.includes(design.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <CheckIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                        <p className="text-xs font-medium truncate">{design.title}</p>
                        <p className="text-xs">{formatCurrency(design.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-8">No designs available</p>
              )}
            </div>
            {formData.selectedDesignIds.length > 0 && (
              <p className="text-sm text-muted mt-2">
                {formData.selectedDesignIds.length} design{formData.selectedDesignIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseEditModal} className="flex items-center gap-2">
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEdit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Update Bundle
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Bundle"
        size="md"
      >
        {selectedBundle && (
          <div className="space-y-4">
            <p className="text-muted">
              Are you sure you want to delete the bundle &quot;{selectedBundle.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleSubmitDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

