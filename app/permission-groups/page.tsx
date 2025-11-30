'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionWrapper } from '@/components/common/PermissionWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { KpiCard } from '@/components/common/KpiCard';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UsersIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Permission, PERMISSION_GROUPS, MODERATOR_DEFAULT_PERMISSIONS } from '@/lib/permissions/config';
import toast from 'react-hot-toast';
import type { PermissionGroup as PermissionGroupType } from '@/lib/api/api';

// Component for checkbox with indeterminate state support
function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
  onClick,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: (e: React.MouseEvent<HTMLInputElement>) => void;
}) {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
    />
  );
}

export default function PermissionGroupsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroupType | null>(null);
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState<Set<string>>(
    new Set(Object.keys(PERMISSION_GROUPS))
  );
  const [permissionSearch, setPermissionSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as Permission[],
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['permissionGroups', debouncedSearch],
    queryFn: async () => {
      const response = await API.permissionGroups.getPermissionGroups({
        is_active: undefined, // Get all groups
      });
      
      if (response.success && response.data) {
        // Filter by search if provided
        let filtered = response.data;
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (group) =>
              group.name.toLowerCase().includes(searchLower) ||
              group.description.toLowerCase().includes(searchLower)
          );
        }
        return filtered;
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      permissions: string[];
      is_active?: boolean;
    }) => API.permissionGroups.createPermissionGroup(data),
    onSuccess: () => {
      toast.success('Permission group created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        permissions: [],
        is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to create permission group');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PermissionGroupType> }) =>
      API.permissionGroups.updatePermissionGroup(id, data),
    onSuccess: () => {
      toast.success('Permission group updated successfully');
      setShowEditModal(false);
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Refresh admin users to show updated groups
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to update permission group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.permissionGroups.deletePermissionGroup(id),
    onSuccess: () => {
      toast.success('Permission group deleted successfully');
      setShowDeleteModal(false);
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Refresh admin users
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to delete permission group');
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
      is_active: formData.is_active,
    });
  };

  const handleEdit = (group: PermissionGroupType) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      permissions: group.permissions as Permission[],
      is_active: group.is_active,
    });
    setExpandedPermissionGroups(new Set(Object.keys(PERMISSION_GROUPS)));
    setPermissionSearch('');
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (!selectedGroup) return;
    updateMutation.mutate({
      id: selectedGroup.id,
      data: {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        is_active: formData.is_active,
      },
    });
  };

  const handleDelete = (group: PermissionGroupType) => {
    setSelectedGroup(group);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedGroup) return;
    deleteMutation.mutate(selectedGroup.id);
  };

  const togglePermissionGroup = (group: string) => {
    setExpandedPermissionGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  const selectAllInGroup = (group: string) => {
    const groupPermissions = PERMISSION_GROUPS[group] || [];
    const allSelected = groupPermissions.every((perm) => formData.permissions.includes(perm));

    if (allSelected) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => !groupPermissions.includes(p)),
      });
    } else {
      const newPermissions = [...new Set([...formData.permissions, ...groupPermissions])];
      setFormData({
        ...formData,
        permissions: newPermissions,
      });
    }
  };

  // Permission presets
  const applyPermissionPreset = (preset: 'viewer' | 'editor' | 'full') => {
    const allAvailablePerms = Object.values(PERMISSION_GROUPS).flat() as Permission[];

    const viewerPerms: Permission[] = allAvailablePerms.filter((p) => p.endsWith('.view'));

    const editorPerms: Permission[] = [
      ...viewerPerms,
      'designers.approve',
      'designers.reject',
      'designs.approve',
      'designs.reject',
      'designs.flag',
      'custom_orders.approve',
      'custom_orders.reject',
      'custom_orders.upload_deliverables',
      'orders.update_status',
      'notifications.create',
    ].filter((p) => allAvailablePerms.includes(p as Permission)) as Permission[];

    const fullPerms = MODERATOR_DEFAULT_PERMISSIONS;

    let selectedPerms: Permission[] = [];
    switch (preset) {
      case 'viewer':
        selectedPerms = viewerPerms;
        break;
      case 'editor':
        selectedPerms = editorPerms;
        break;
      case 'full':
        selectedPerms = fullPerms;
        break;
    }

    setFormData({
      ...formData,
      permissions: selectedPerms,
    });
  };

  // Stats
  const stats = {
    total: data?.length || 0,
    active: data?.filter((g) => g.is_active).length || 0,
    totalMembers: data?.reduce((sum, g) => sum + g.member_count, 0) || 0,
  };

  return (
    <PermissionWrapper allowedRoles="Super Admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Permission Groups</h1>
              <p className="text-muted mt-1">Manage permission groups for moderators</p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  permissions: [],
                  is_active: true,
                });
                setExpandedPermissionGroups(new Set(Object.keys(PERMISSION_GROUPS)));
                setPermissionSearch('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Group
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              title="Total Groups"
              value={stats.total}
              icon={<ShieldCheckIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Active Groups"
              value={stats.active}
              icon={<CheckCircleIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Total Members"
              value={stats.totalMembers}
              icon={<UsersIcon className="w-6 h-6" />}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              type="text"
              placeholder="Search permission groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Groups List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-error">
              Error loading permission groups
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No permission groups found</h3>
              <p className="text-muted mb-4">Get started by creating your first permission group</p>
              <Button
                variant="primary"
                onClick={() => {
                  setFormData({
                    name: '',
                    description: '',
                    permissions: [],
                    is_active: true,
                  });
                  setShowCreateModal(true);
                }}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((group) => (
                <div
                  key={group.id}
                  className="border border-border rounded-lg p-4 hover:shadow-lg transition-shadow bg-background"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted mt-1">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {group.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted/20 text-muted">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <ShieldCheckIcon className="w-4 h-4" />
                      {group.permission_count} permissions
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="w-4 h-4" />
                      {group.member_count} members
                    </span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(group)}
                      className="flex-1"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      className="flex-1"
                      disabled={group.member_count > 0}
                      title={group.member_count > 0 ? 'Cannot delete group with members' : 'Delete group'}
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          <Modal
            isOpen={showCreateModal || showEditModal}
            onClose={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedGroup(null);
              setPermissionSearch('');
            }}
            title={showEditModal ? 'Edit Permission Group' : 'Create Permission Group'}
            size="xl"
          >
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <Input
                  label="Group Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Content Moderator"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this group is for..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    id="is_active_group"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="is_active_group" className="text-sm font-medium text-foreground cursor-pointer flex-1">
                    Group is active
                  </label>
                  {formData.is_active ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Permissions</h4>
                    <p className="text-xs text-muted mt-1">
                      Select the permissions for this group
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {formData.permissions.length} / {Object.values(PERMISSION_GROUPS).flat().length} selected
                    </span>
                  </div>
                </div>

                {/* Permission Presets */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => applyPermissionPreset('viewer')}
                    className="p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <EyeIcon className="w-4 h-4 text-muted group-hover:text-primary" />
                      <span className="text-sm font-semibold text-foreground">Viewer</span>
                    </div>
                    <p className="text-xs text-muted">Read-only access</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPermissionPreset('editor')}
                    className="p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <PencilIcon className="w-4 h-4 text-muted group-hover:text-primary" />
                      <span className="text-sm font-semibold text-foreground">Editor</span>
                    </div>
                    <p className="text-xs text-muted">Can approve/reject</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPermissionPreset('full')}
                    className="p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheckIcon className="w-4 h-4 text-muted group-hover:text-primary" />
                      <span className="text-sm font-semibold text-foreground">Full Access</span>
                    </div>
                    <p className="text-xs text-muted">All permissions</p>
                  </button>
                </div>

                {/* Permission Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                  <Input
                    type="text"
                    placeholder="Search permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="pl-10"
                  />
                  {permissionSearch && (
                    <button
                      onClick={() => setPermissionSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Permission Groups */}
                <div className="border border-border rounded-xl overflow-hidden bg-muted/5">
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {Object.entries(PERMISSION_GROUPS)
                      .filter(([group, permissions]) => {
                        if (!permissionSearch) return true;
                        const searchLower = permissionSearch.toLowerCase();
                        return (
                          group.toLowerCase().includes(searchLower) ||
                          permissions.some((p) => p.toLowerCase().includes(searchLower))
                        );
                      })
                      .map(([group, permissions]) => {
                        const isExpanded = expandedPermissionGroups.has(group);
                        const groupSelectedCount = permissions.filter((p) =>
                          formData.permissions.includes(p)
                        ).length;
                        const allSelected = groupSelectedCount === permissions.length;
                        const someSelected = groupSelectedCount > 0 && groupSelectedCount < permissions.length;

                        const filteredPermissions = permissions.filter((perm) =>
                          !permissionSearch || perm.toLowerCase().includes(permissionSearch.toLowerCase())
                        );

                        if (filteredPermissions.length === 0) return null;

                        return (
                          <div
                            key={group}
                            className="border border-border rounded-lg bg-background overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => togglePermissionGroup(group)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <GroupCheckbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      selectAllInGroup(group);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <h5 className="font-semibold text-sm text-foreground capitalize">
                                    {group.replace(/_/g, ' ')}
                                  </h5>
                                </div>
                                <span className="text-xs text-muted">
                                  ({groupSelectedCount}/{permissions.length})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {someSelected && (
                                  <span className="text-xs text-primary font-medium">Partial</span>
                                )}
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-5 h-5 text-muted" />
                                ) : (
                                  <ChevronDownIcon className="w-5 h-5 text-muted" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-border bg-muted/5">
                                <div className="p-3 space-y-2">
                                  {filteredPermissions.map((perm) => {
                                    const isSelected = formData.permissions.includes(perm);
                                    const [resource, action] = perm.split('.');

                                    return (
                                      <label
                                        key={perm}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                          isSelected
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-muted/10 border border-transparent'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setFormData({
                                                ...formData,
                                                permissions: [...formData.permissions, perm],
                                              });
                                            } else {
                                              setFormData({
                                                ...formData,
                                                permissions: formData.permissions.filter((p) => p !== perm),
                                              });
                                            }
                                          }}
                                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">
                                              {action}
                                            </span>
                                            <span className="text-xs text-muted">•</span>
                                            <span className="text-xs text-muted capitalize">{resource}</span>
                                          </div>
                                          <span className="text-xs text-muted font-mono">{perm}</span>
                                        </div>
                                        {isSelected && (
                                          <CheckCircleIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Permission Actions */}
                <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const allPerms = Object.values(PERMISSION_GROUPS).flat() as Permission[];
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.length === allPerms.length ? [] : allPerms,
                        });
                      }}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {formData.permissions.length === Object.values(PERMISSION_GROUPS).flat().length
                        ? 'Clear All'
                        : 'Select All'}
                    </button>
                    <span className="text-muted">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, permissions: [...MODERATOR_DEFAULT_PERMISSIONS] });
                      }}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  <div className="text-xs text-muted">
                    <span className="font-medium text-foreground">{formData.permissions.length}</span> permission
                    {formData.permissions.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedGroup(null);
                    setPermissionSearch('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={showEditModal ? handleUpdate : handleCreate}
                  disabled={showEditModal ? updateMutation.isPending : createMutation.isPending}
                >
                  {showEditModal
                    ? updateMutation.isPending
                      ? 'Updating...'
                      : 'Update Group'
                    : createMutation.isPending
                    ? 'Creating...'
                    : 'Create Group'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedGroup(null);
            }}
            title="Delete Permission Group"
          >
            {selectedGroup && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Are you sure you want to delete this permission group?
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      This action cannot be undone. If this group has members, you must reassign them first.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/10 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-2">{selectedGroup.name}</h4>
                  {selectedGroup.description && (
                    <p className="text-sm text-muted mb-3">{selectedGroup.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span>{selectedGroup.permission_count} permissions</span>
                    <span>{selectedGroup.member_count} members</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedGroup(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending || selectedGroup.member_count > 0}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Group'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionWrapper>
  );
}

