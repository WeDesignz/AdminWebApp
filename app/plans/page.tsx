'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { Plan } from '@/types';
import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CheckIcon as CheckIconSolid,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Form state
  const [formData, setFormData] = useState({
    planName: '',
    description: '',
    price: '',
    duration: 'Monthly' as 'Monthly' | 'Annually',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => MockAPI.getPlans(),
  });

  const handleCreate = () => {
    setFormData({
      planName: '',
      description: '',
      price: '',
      duration: 'Monthly',
      status: 'Active',
    });
    setSelectedPlan(null);
    setShowCreateModal(true);
  };

  const handleEdit = (plan: Plan) => {
    setFormData({
      planName: plan.planName,
      description: Array.isArray(plan.description) 
        ? plan.description.join('\n') 
        : plan.description,
      price: plan.price.toString(),
      duration: plan.duration,
      status: plan.status,
    });
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleDelete = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      planName: '',
      description: '',
      price: '',
      duration: 'Monthly',
      status: 'Active',
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedPlan(null);
    setFormData({
      planName: '',
      description: '',
      price: '',
      duration: 'Monthly',
      status: 'Active',
    });
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedPlan(null);
  };

  const handleSubmitCreate = async () => {
    if (!formData.planName || !formData.description || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const descriptionArray = formData.description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await MockAPI.createPlan({
        planName: formData.planName,
        description: descriptionArray,
        price: parseFloat(formData.price),
        duration: formData.duration,
        status: formData.status,
      });

      if (response.success) {
        toast.success('Plan created successfully');
        handleCloseCreateModal();
        queryClient.invalidateQueries({ queryKey: ['plans'] });
      } else {
        toast.error(response.error || 'Failed to create plan');
      }
    } catch (error) {
      toast.error('An error occurred while creating plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dropdown options
  const planNameOptions = [
    { value: '', label: 'Select Plan Name' },
    { value: 'Basic', label: 'Basic' },
    { value: 'Prime', label: 'Prime' },
    { value: 'Premium', label: 'Premium' },
  ];

  const durationOptions = [
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Annually', label: 'Annually' },
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const handleSubmitEdit = async () => {
    if (!selectedPlan || !formData.planName || !formData.description || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const descriptionArray = formData.description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await MockAPI.updatePlan(selectedPlan.id, {
        planName: formData.planName,
        description: descriptionArray,
        price: parseFloat(formData.price),
        duration: formData.duration,
        status: formData.status,
      });

      if (response.success) {
        toast.success('Plan updated successfully');
        handleCloseEditModal();
        queryClient.invalidateQueries({ queryKey: ['plans'] });
      } else {
        toast.error(response.error || 'Failed to update plan');
      }
    } catch (error) {
      toast.error('An error occurred while updating plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlan) return;

    setIsDeleting(true);
    try {
      const response = await MockAPI.deletePlan(selectedPlan.id);
      if (response.success) {
        toast.success('Plan deleted successfully');
        handleCloseDeleteModal();
        queryClient.invalidateQueries({ queryKey: ['plans'] });
      } else {
        toast.error(response.error || 'Failed to delete plan');
      }
    } catch (error) {
      toast.error('An error occurred while deleting plan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted mt-1">Manage pricing and plan features</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-primary'
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-primary'
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>
            <Button 
              variant="primary" 
              onClick={handleCreate}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Plan
            </Button>
          </div>
        </div>

        {/* Plans Table View */}
        {viewMode === 'table' ? (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Plan Name</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Description</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Price</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Duration</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Created At</th>
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
                ) : !data?.data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      No plans found. Create your first plan to get started.
                    </td>
                  </tr>
                ) : (
                  data.data.map((plan) => (
                    <tr key={plan.id} className="group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{plan.planName}</td>
                      <td className="py-3 px-4">
                        <div className="max-w-md">
                          {Array.isArray(plan.description) ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted">
                              {plan.description.slice(0, 3).map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                              {plan.description.length > 3 && (
                                <li className="text-xs">+{plan.description.length - 3} more</li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted line-clamp-2">{plan.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        {formatCurrency(plan.price)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary">
                          {plan.duration}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          plan.status === 'Active' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-muted/20 text-muted'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">
                        {plan.createdAt ? formatDate(plan.createdAt) : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(plan)}
                            className="flex items-center gap-1"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(plan)}
                            className="flex items-center gap-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Plans Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : !data?.data || data.data.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted">
                No plans found. Create your first plan to get started.
              </div>
            ) : (
              data.data.map((plan) => (
                <div key={plan.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">{plan.planName}</h3>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      plan.status === 'Active' 
                        ? 'bg-success/20 text-success' 
                        : 'bg-muted/20 text-muted'
                    }`}>
                      {plan.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted">/{plan.duration === 'Monthly' ? 'mo' : 'yr'}</span>
                  </div>

                  <div className="mb-6">
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary">
                      {plan.duration}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    {Array.isArray(plan.description) ? (
                      plan.description.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckIconSolid className="w-3 h-3 text-success" />
                          </div>
                          <span className="text-sm text-muted">{item}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">{plan.description}</p>
                    )}
                  </div>

                  {plan.createdAt && (
                    <p className="text-xs text-muted mb-4">
                      Created: {formatDate(plan.createdAt)}
                    </p>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(plan)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create New Plan"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Plan Name <span className="text-error">*</span>
            </label>
            <Dropdown
              options={planNameOptions}
              value={formData.planName}
              onChange={(value) => setFormData({ ...formData, planName: value })}
              placeholder="Select Plan Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (One per line) <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full min-h-[120px] resize-none"
              placeholder="Enter description points, one per line..."
              required
            />
            <p className="text-xs text-muted mt-1">
              Each line will be treated as a separate feature/point
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Price <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Enter price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration <span className="text-error">*</span>
            </label>
            <Dropdown
              options={durationOptions}
              value={formData.duration}
              onChange={(value) => setFormData({ ...formData, duration: value as 'Monthly' | 'Annually' })}
              placeholder="Select Duration"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Status <span className="text-error">*</span>
            </label>
            <Dropdown
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as 'Active' | 'Inactive' })}
              placeholder="Select Status"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCloseCreateModal}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitCreate}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Create Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Plan"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Plan Name <span className="text-error">*</span>
            </label>
            <Dropdown
              options={planNameOptions}
              value={formData.planName}
              onChange={(value) => setFormData({ ...formData, planName: value })}
              placeholder="Select Plan Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (One per line) <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full min-h-[120px] resize-none"
              placeholder="Enter description points, one per line..."
              required
            />
            <p className="text-xs text-muted mt-1">
              Each line will be treated as a separate feature/point
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Price <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Enter price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration <span className="text-error">*</span>
            </label>
            <Dropdown
              options={durationOptions}
              value={formData.duration}
              onChange={(value) => setFormData({ ...formData, duration: value as 'Monthly' | 'Annually' })}
              placeholder="Select Duration"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Status <span className="text-error">*</span>
            </label>
            <Dropdown
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as 'Active' | 'Inactive' })}
              placeholder="Select Status"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEdit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Update Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        title="Delete Plan"
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Are you sure you want to delete this plan? This action cannot be undone.
            </p>
            <div className="p-4 bg-muted/10 rounded-lg">
              <div className="space-y-2 text-sm">
                <p><span className="text-muted">Plan Name:</span> <span className="font-medium">{selectedPlan.planName}</span></p>
                <p><span className="text-muted">Price:</span> <span className="font-medium">{formatCurrency(selectedPlan.price)}</span></p>
                <p><span className="text-muted">Duration:</span> <span className="font-medium">{selectedPlan.duration}</span></p>
                <p><span className="text-muted">Status:</span> <span className="font-medium">{selectedPlan.status}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCloseDeleteModal}
                className="flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                isLoading={isDeleting}
                className="flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete Plan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
