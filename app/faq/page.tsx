'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { API } from '@/lib/api';
import { formatDate } from '@/lib/utils/cn';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  Bars3Icon,
  MapPinIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsUpDownIcon,
  XCircleIcon,
  TagIcon,
  ClockIcon,
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
  display_locations?: string[];
}

interface FAQTag {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

type FAQFormData = {
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  display_locations: string[];
};

const getInitialFormState = (): FAQFormData => ({
  question: '',
  answer: '',
  is_active: true,
  sort_order: 0,
  display_locations: [],
});

export default function FAQPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState<FAQFormData>(getInitialFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sort_order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedFAQs, setSelectedFAQs] = useState<Set<number>>(new Set());

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
      display_locations: faq.display_locations || [],
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
    if (formData.display_locations.length === 0) {
      toast.error('Please select at least one display location');
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


  // Filter and sort FAQs
  const filteredAndSortedFAQs = useMemo(() => {
    let filtered = [...faqs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.tags?.some((tag: { id: number; name: string }) => tag.name.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((faq) =>
        statusFilter === 'active' ? faq.is_active : !faq.is_active
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'sort_order':
          comparison = a.sort_order - b.sort_order;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'view_count':
          comparison = (a.view_count || 0) - (b.view_count || 0);
          break;
        case 'question':
          comparison = a.question.localeCompare(b.question);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [faqs, searchQuery, statusFilter, sortBy, sortOrder]);

  // Toggle row expansion
  const toggleRowExpansion = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle FAQ selection
  const toggleFAQSelection = (id: number) => {
    setSelectedFAQs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all FAQs
  const toggleSelectAll = () => {
    if (selectedFAQs.size === filteredAndSortedFAQs.length) {
      setSelectedFAQs(new Set());
    } else {
      setSelectedFAQs(new Set(filteredAndSortedFAQs.map((f) => f.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedFAQs.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFAQs.size} FAQ(s)?`)) return;

    try {
      const deletePromises = Array.from(selectedFAQs).map((id) =>
        deleteFAQMutation.mutateAsync(id)
      );
      await Promise.all(deletePromises);
      setSelectedFAQs(new Set());
      toast.success(`Successfully deleted ${selectedFAQs.size} FAQ(s)`);
    } catch (error) {
      toast.error('Failed to delete some FAQs');
    }
  };

  // Bulk toggle status
  const handleBulkToggleStatus = async (isActive: boolean) => {
    if (selectedFAQs.size === 0) return;

    try {
      const updatePromises = Array.from(selectedFAQs).map((id) => {
        const faq = faqs.find((f) => f.id === id);
        if (!faq || faq.is_active === isActive) return Promise.resolve();
        return updateFAQMutation.mutateAsync({
          id,
          payload: {
            question: faq.question,
            answer: faq.answer,
            is_active: isActive,
            sort_order: faq.sort_order,
            display_locations: faq.display_locations || [],
          },
        });
      });
      await Promise.all(updatePromises);
      setSelectedFAQs(new Set());
      toast.success(`Successfully ${isActive ? 'activated' : 'deactivated'} ${selectedFAQs.size} FAQ(s)`);
    } catch (error) {
      toast.error('Failed to update some FAQs');
    }
  };

  // View FAQ
  const handleView = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setShowViewModal(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('sort_order');
    setSortOrder('asc');
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Search and Filters */}
        {!isLoading && !isError && faqs.length > 0 && (
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search FAQs by question, answer, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Dropdown
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter by status"
                />
              </div>

              {/* Sort By */}
              <div className="w-full md:w-48">
                <Dropdown
                  options={[
                    { value: 'sort_order', label: 'Sort Order' },
                    { value: 'created_at', label: 'Created Date' },
                    { value: 'view_count', label: 'View Count' },
                    { value: 'question', label: 'Question (A-Z)' },
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Sort by"
                />
              </div>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full md:w-auto"
              >
                <ArrowsUpDownIcon className="w-4 h-4 mr-2" />
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </Button>

              {/* Clear Filters */}
              {(searchQuery || statusFilter !== 'all' || sortBy !== 'sort_order') && (
                <Button variant="ghost" onClick={clearFilters} className="w-full md:w-auto">
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {!isLoading && !isError && selectedFAQs.size > 0 && (
          <div className="card p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedFAQs.size} FAQ(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFAQs(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleStatus(true)}
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleStatus(false)}
                >
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted mt-4">Loading FAQs...</p>
          </div>
        ) : isError ? (
          <div className="card text-center py-12">
            <XCircleIcon className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Failed to load FAQs</p>
            <p className="text-muted text-sm mt-2">Please try refreshing the page</p>
          </div>
        ) : filteredAndSortedFAQs.length === 0 ? (
          <div className="card text-center py-12">
            {faqs.length === 0 ? (
              <>
                <QuestionMarkCircleIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No FAQs found</p>
                <p className="text-muted mb-6">Create your first FAQ to get started</p>
                <Button onClick={handleCreate}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create FAQ
                </Button>
              </>
            ) : (
              <>
                <FunnelIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No FAQs match your filters</p>
                <p className="text-muted mb-6">Try adjusting your search or filter criteria</p>
                <Button variant="outline" onClick={clearFilters}>
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold w-12">
                      <input
                        type="checkbox"
                        checked={selectedFAQs.size === filteredAndSortedFAQs.length && filteredAndSortedFAQs.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="text-left p-4 font-semibold w-12"></th>
                    <th className="text-left p-4 font-semibold">Question</th>
                    <th className="text-left p-4 font-semibold">Answer Preview</th>
                    <th className="text-left p-4 font-semibold">Tags</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Views</th>
                    <th className="text-left p-4 font-semibold">Sort</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedFAQs.map((faq) => {
                    const isExpanded = expandedRows.has(faq.id);
                    const isSelected = selectedFAQs.has(faq.id);
                    return (
                      <>
                        <tr
                          key={faq.id}
                          className={`border-b border-border transition-colors ${
                            isSelected ? 'bg-primary/5' : 'hover:bg-muted/5'
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFAQSelection(faq.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleRowExpansion(faq.id)}
                              className="p-1 rounded hover:bg-muted/50 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="font-medium max-w-xs">{faq.question}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground max-w-md line-clamp-2">
                              {faq.answer}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {faq.tags && faq.tags.length > 0 ? (
                                faq.tags.slice(0, 2).map((tag: Tag) => (
                                  <Badge key={tag.id} variant="secondary" className="text-xs">
                                    {tag.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No tags</span>
                              )}
                              {faq.tags && faq.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{faq.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {faq.is_active ? (
                              <Badge className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full font-medium shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                                <span>Active</span>
                              </Badge>
                            ) : (
                              <Badge className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                                <span>Inactive</span>
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm">
                              <EyeIcon className="w-4 h-4 text-muted-foreground" />
                              {faq.view_count || 0}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Bars3Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{faq.sort_order}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <ClockIcon className="w-4 h-4" />
                              {formatDate(faq.created_at, 'short')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(faq)}
                                title="View FAQ"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(faq)}
                                title="Edit FAQ"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(faq)}
                                className="text-destructive hover:text-destructive"
                                title="Delete FAQ"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${faq.id}-expanded`} className="bg-muted/20">
                            <td colSpan={10} className="p-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <QuestionMarkCircleIcon className="w-4 h-4 text-primary" />
                                    Question
                                  </h4>
                                  <p className="text-sm text-foreground">{faq.question}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <DocumentTextIcon className="w-4 h-4 text-primary" />
                                    Answer
                                  </h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.answer}</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Display Locations</p>
                                    <div className="flex flex-wrap gap-1">
                                      {faq.display_locations && faq.display_locations.length > 0 ? (
                                        (faq.display_locations as string[]).map((loc: string) => (
                                          <Badge key={loc} variant="secondary" className="text-xs">
                                            {loc.replace('_', ' ')}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">None</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                      {faq.tags && faq.tags.length > 0 ? (
                                        faq.tags.map((tag: Tag) => (
                                          <Badge key={tag.id} variant="secondary" className="text-xs">
                                            {tag.name}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">No tags</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Created By</p>
                                    <p className="text-xs font-medium">
                                      {faq.created_by?.username || faq.created_by?.email || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDate(faq.created_at, 'long')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                    <p className="text-xs font-medium">
                                      {faq.updated_by?.username || faq.updated_by?.email || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDate(faq.updated_at, 'long')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question Section */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <QuestionMarkCircleIcon className="w-5 h-5 text-primary" />
                Question <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.question}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, question: e.target.value }))
                }
                placeholder="Enter a clear and concise question..."
                required
                maxLength={500}
                className="text-base"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Keep it clear and specific to help users find answers quickly
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.question.length}/500
                </p>
              </div>
            </div>

            {/* Answer Section */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
                Answer <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, answer: e.target.value }))
                }
                placeholder="Provide a detailed and helpful answer..."
                required
                rows={8}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Be thorough and include any relevant details or steps
              </p>
            </div>

            {/* Settings Section */}
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Settings</h3>
              
              {/* Display Rank */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bars3Icon className="w-4 h-4 text-muted-foreground" />
                  Display Rank (Sort Order) <span className="text-destructive">*</span>
                </label>
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
                  placeholder="0"
                  required
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first. FAQs are sorted by this rank, then by ID.
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="is_active" className="text-sm font-medium cursor-pointer flex-1">
                  Make this FAQ active
                </label>
                <CheckIcon className={`w-5 h-5 ${formData.is_active ? 'text-success' : 'text-muted-foreground opacity-30'}`} />
              </div>
            </div>

            {/* Display Locations Section */}
            <div className="border-t border-border pt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPinIcon className="w-5 h-5 text-primary" />
                Display Locations <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-muted/20">
                {[
                  { value: 'landing_page', label: 'Landing Page', desc: 'Homepage FAQ section' },
                  { value: 'customer_dashboard', label: 'Customer Dashboard', desc: 'Customer FAQ page' },
                  { value: 'designer_console', label: 'Designer Console', desc: 'Designer FAQ page' },
                  { value: 'all', label: 'All Locations', desc: 'Show everywhere' },
                ].map((location) => (
                  <label
                    key={location.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.display_locations.includes(location.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.display_locations.includes(location.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            display_locations: [...prev.display_locations, location.value],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            display_locations: prev.display_locations.filter(
                              (loc) => loc !== location.value
                            ),
                          }));
                        }
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{location.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{location.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select where this FAQ should be displayed. You can select multiple locations.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
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
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Saving...
                  </span>
                ) : selectedFAQ ? (
                  'Update FAQ'
                ) : (
                  'Create FAQ'
                )}
              </Button>
            </div>
          </form>
        </Modal>

        {/* View FAQ Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedFAQ(null);
          }}
          title="FAQ Details"
          size="lg"
        >
          {selectedFAQ && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                  <QuestionMarkCircleIcon className="w-4 h-4" />
                  Question
                </h4>
                <p className="text-base font-medium">{selectedFAQ.question}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                  <DocumentTextIcon className="w-4 h-4" />
                  Answer
                </h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedFAQ.answer}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Status</p>
                  {selectedFAQ.is_active ? (
                    <Badge className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-full font-medium shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                      <span>Active</span>
                    </Badge>
                  ) : (
                    <Badge className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full font-medium">
                      <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                      <span>Inactive</span>
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sort Order</p>
                  <p className="text-sm font-medium">{selectedFAQ.sort_order}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">View Count</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {selectedFAQ.view_count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Slug</p>
                  <p className="text-sm font-mono text-muted-foreground">{selectedFAQ.slug}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Display Locations</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFAQ.display_locations && selectedFAQ.display_locations.length > 0 ? (
                    (selectedFAQ.display_locations as string[]).map((loc: string) => (
                      <Badge key={loc} variant="secondary" className="text-xs">
                        <MapPinIcon className="w-3 h-3 mr-1" />
                        {loc.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No locations specified</span>
                  )}
                </div>
              </div>
              {selectedFAQ.tags && selectedFAQ.tags.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFAQ.tags.map((tag: Tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created By</p>
                  <p className="text-sm font-medium">
                    {selectedFAQ.created_by?.username || selectedFAQ.created_by?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(selectedFAQ.created_at, 'long')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Updated By</p>
                  <p className="text-sm font-medium">
                    {selectedFAQ.updated_by?.username || selectedFAQ.updated_by?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(selectedFAQ.updated_at, 'long')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedFAQ(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedFAQ);
                  }}
                  className="flex-1"
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit FAQ
                </Button>
              </div>
            </div>
          )}
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
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <TrashIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>
            </div>
            {selectedFAQ && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-semibold mb-2">Question:</p>
                <p className="text-sm text-foreground">{selectedFAQ.question}</p>
                {selectedFAQ.view_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This FAQ has been viewed {selectedFAQ.view_count} time(s)
                  </p>
                )}
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
                variant="danger"
                onClick={handleDeleteConfirm}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Deleting...
                  </span>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete FAQ
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

