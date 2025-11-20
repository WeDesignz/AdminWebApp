'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { API } from '@/lib/api';
import { formatDate } from '@/lib/utils/cn';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  slug: string;
  is_active: boolean;
  view_count: number;
  sort_order: number;
  created_by?: {
    id: number;
    username: string;
    email: string;
  };
  created_at: string;
  updated_by?: {
    id: number;
    username: string;
    email: string;
  };
  updated_at: string;
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

interface FAQTag {
  id: number;
  name: string;
}

type FAQFormData = {
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  tag_ids: number[];
};

const getInitialFormState = (): FAQFormData => ({
  question: '',
  answer: '',
  is_active: true,
  sort_order: 0,
  tag_ids: [],
});

export default function FAQPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState<FAQFormData>(getInitialFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch FAQs
  const {
    data: faqs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const response = await API.faq.getFAQs();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch FAQs');
      }
      return response.data || [];
    },
  });

  // Fetch FAQ Tags
  const { data: tags = [] } = useQuery({
    queryKey: ['faq-tags'],
    queryFn: async () => {
      const response = await API.faq.getFAQTags();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch FAQ tags');
      }
      return response.data || [];
    },
  });

  const createFAQMutation = useMutation({
    mutationFn: async (payload: FAQFormData) => {
      const response = await API.faq.createFAQ(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create FAQ');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('FAQ created successfully');
      setShowModal(false);
      setFormData(getInitialFormState());
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create FAQ';
      toast.error(message);
    },
  });

  const updateFAQMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: FAQFormData }) => {
      const response = await API.faq.updateFAQ(id, payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update FAQ');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('FAQ updated successfully');
      setShowModal(false);
      setSelectedFAQ(null);
      setFormData(getInitialFormState());
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update FAQ';
      toast.error(message);
    },
  });

  const deleteFAQMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await API.faq.deleteFAQ(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete FAQ');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('FAQ deleted successfully');
      setShowDeleteModal(false);
      setSelectedFAQ(null);
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to delete FAQ';
      toast.error(message);
    },
  });

  const handleCreate = () => {
    setSelectedFAQ(null);
    setFormData(getInitialFormState());
    setShowModal(true);
  };

  const handleEdit = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
      sort_order: faq.sort_order,
      tag_ids: faq.tags?.map((tag) => tag.id) || [],
    });
    setShowModal(true);
  };

  const handleDelete = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFAQ) {
        await updateFAQMutation.mutateAsync({
          id: selectedFAQ.id,
          payload: formData,
        });
      } else {
        await createFAQMutation.mutateAsync(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFAQ) return;
    setIsDeleting(true);
    try {
      await deleteFAQMutation.mutateAsync(selectedFAQ.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FAQ Management</h1>
            <p className="text-muted mt-1">Manage frequently asked questions</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Create FAQ
          </Button>
        </div>

        {isLoading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : isError ? (
          <div className="card text-center py-12">
            <p className="text-destructive">Failed to load FAQs</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted">No FAQs found. Create your first FAQ.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Question</th>
                  <th className="text-left p-4 font-semibold">Answer</th>
                  <th className="text-left p-4 font-semibold">Tags</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Views</th>
                  <th className="text-left p-4 font-semibold">Sort Order</th>
                  <th className="text-left p-4 font-semibold">Created</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq) => (
                  <tr key={faq.id} className="border-b border-border hover:bg-muted/5">
                    <td className="p-4">
                      <div className="font-medium max-w-xs truncate">{faq.question}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground max-w-md truncate">
                        {faq.answer}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {faq.tags && faq.tags.length > 0 ? (
                          faq.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {faq.is_active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-500/10 text-gray-600">
                          <XMarkIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <EyeIcon className="w-4 h-4 text-muted-foreground" />
                        {faq.view_count}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{faq.sort_order}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(faq.created_at, 'short')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(faq)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(faq)}
                          className="text-destructive hover:text-destructive"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit FAQ Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedFAQ(null);
            setFormData(getInitialFormState());
          }}
          title={selectedFAQ ? 'Edit FAQ' : 'Create FAQ'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Question <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.question}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, question: e.target.value }))
                }
                placeholder="Enter question"
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.question.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Answer <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, answer: e.target.value }))
                }
                placeholder="Enter answer"
                required
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 p-3 border border-border rounded-md min-h-[60px]">
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags available</p>
                ) : (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.tag_ids.includes(tag.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setSelectedFAQ(null);
                  setFormData(getInitialFormState());
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : selectedFAQ ? 'Update FAQ' : 'Create FAQ'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedFAQ(null);
          }}
          title="Delete FAQ"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </p>
            {selectedFAQ && (
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="font-medium">{selectedFAQ.question}</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedFAQ(null);
                }}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete FAQ'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

