'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionWrapper } from '@/components/common/PermissionWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useState, useEffect, useMemo, useRef } from 'react';
import { formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { KpiCard } from '@/components/common/KpiCard';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  KeyIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  UsersIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { AdminUser } from '@/types';
import { Permission, PERMISSION_GROUPS, MODERATOR_DEFAULT_PERMISSIONS } from '@/lib/permissions/config';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

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
  const checkboxRef = useRef<HTMLInputElement>(null);

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

export default function AdminUsersPage() {
  const router = useRouter();
  const { hasRole } = useAuthStore();

  // Redirect moderators away from this page
  useEffect(() => {
    if (!hasRole('Super Admin')) {
      toast.error('Access denied. This page is restricted to Super Admins only.');
      router.replace('/dashboard');
    }
  }, [hasRole, router]);

  // Don't render if not Super Admin
  if (!hasRole('Super Admin')) {
    return null;
  }

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'superadmin' | 'moderator' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    admin_group: 'moderator' as 'superadmin' | 'moderator',
    permission_group_id: null as number | null,
    permissions: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    admin_group: 'moderator' as 'superadmin' | 'moderator',
    permission_group_id: null as number | null,
    is_active: true,
    permissions: [] as string[],
  });
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState<Set<string>>(
    new Set(Object.keys(PERMISSION_GROUPS))
  );
  const [permissionSearch, setPermissionSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions'>('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  const queryClient = useQueryClient();

  // Fetch permission groups
  const { data: permissionGroupsData } = useQuery({
    queryKey: ['permissionGroups'],
    queryFn: async () => {
      const response = await API.permissionGroups.getPermissionGroups();
      return response.success && response.data ? response.data : [];
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsers', page, pageSize, debouncedSearch, roleFilter, statusFilter],
    queryFn: async () => {
      const response = await API.adminUsers.getAdminUsers({
        page,
        limit: pageSize,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Admin Users API Response:', response);
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch admin users');
      }
      
      return response;
    },
    retry: 1,
  });

  // Show error toast
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch admin users';
      toast.error(errorMessage);
      console.error('Admin Users query error:', error);
    }
  }, [error]);

  // Calculate stats from data
  const stats = useMemo(() => {
    if (!data?.data?.data) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        superAdmins: 0,
        moderators: 0,
        with2FA: 0,
      };
    }

    const users = data.data.data;
    return {
      total: data.data.pagination?.total || users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
      superAdmins: users.filter((u) => u.admin_group === 'superadmin').length,
      moderators: users.filter((u) => u.admin_group === 'moderator').length,
      with2FA: users.filter((u) => u.is_2fa_enabled).length,
    };
  }, [data]);

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) =>
      API.adminUsers.createAdminUser({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        admin_group: data.admin_group,
        permission_group_id: data.admin_group === 'superadmin' ? null : data.permission_group_id,
        permissions: data.admin_group === 'superadmin' ? [] : data.permissions,
      }),
    onSuccess: () => {
      toast.success('Admin user created successfully');
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirm_password: '',
        admin_group: 'moderator',
        permission_group_id: null,
        permissions: [],
      });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to create admin user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminUser> }) =>
      API.adminUsers.updateAdminUser(id, data),
    onSuccess: () => {
      toast.success('Admin user updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      setPermissionSearch('');
      setHasChanges(false);
      setActiveTab('basic');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to update admin user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.adminUsers.deactivateAdminUser(id),
    onSuccess: () => {
      toast.success('Admin user deactivated successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to deactivate admin user');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { new_password: string; confirm_password: string } }) =>
      API.adminUsers.resetAdminPassword(id, data),
    onSuccess: () => {
      toast.success('Password reset successfully');
      setShowResetPasswordModal(false);
      setResetPasswordForm({ new_password: '', confirm_password: '' });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error?.error || 'Failed to reset password');
    },
  });

  const handleCreate = () => {
    if (!createForm.email || !createForm.first_name || !createForm.last_name || !createForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (createForm.password !== createForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    const initialPermissions = user.permissions || (user.admin_group === 'moderator' ? MODERATOR_DEFAULT_PERMISSIONS : []);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      admin_group: user.admin_group,
      permission_group_id: user.permission_group?.id || null,
      is_active: user.is_active,
      permissions: initialPermissions,
    });
    setExpandedPermissionGroups(new Set(Object.keys(PERMISSION_GROUPS)));
    setPermissionSearch('');
    setActiveTab(user.admin_group === 'moderator' ? 'permissions' : 'basic');
    setHasChanges(false);
    setShowEditModal(true);
  };
  
  // Track changes
  useEffect(() => {
    if (!selectedUser) return;
    
    const hasFormChanges = 
      editForm.first_name !== selectedUser.first_name ||
      editForm.last_name !== selectedUser.last_name ||
      editForm.admin_group !== selectedUser.admin_group ||
      editForm.permission_group_id !== (selectedUser.permission_group?.id || null) ||
      editForm.is_active !== selectedUser.is_active ||
      JSON.stringify(editForm.permissions?.sort()) !== JSON.stringify((selectedUser.permissions || []).sort());
    
    setHasChanges(hasFormChanges);
  }, [editForm, selectedUser]);
  
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
    const allSelected = groupPermissions.every((perm) => editForm.permissions.includes(perm));
    
    if (allSelected) {
      // Deselect all in group
      setEditForm({
        ...editForm,
        permissions: editForm.permissions.filter((p) => !groupPermissions.includes(p as Permission)),
      });
    } else {
      // Select all in group
      const newPermissions = [...new Set([...editForm.permissions, ...groupPermissions])];
      setEditForm({
        ...editForm,
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
    
    setEditForm({
      ...editForm,
      permissions: selectedPerms,
    });
  };

  const handleUpdate = () => {
    if (!selectedUser) return;
    if (!editForm.first_name || !editForm.last_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({
      id: selectedUser.id,
      data: {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        admin_group: editForm.admin_group,
        permission_group_id: editForm.admin_group === 'superadmin' ? null : editForm.permission_group_id,
        is_active: editForm.is_active,
        permissions: editForm.admin_group === 'superadmin' ? [] : editForm.permissions,
      } as Partial<AdminUser> & { permission_group_id: number | null },
    });
  };

  const handleResetPassword = (user: AdminUser) => {
    setSelectedUser(user);
    setResetPasswordForm({ new_password: '', confirm_password: '' });
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = () => {
    if (!selectedUser) return;
    if (!resetPasswordForm.new_password || !resetPasswordForm.confirm_password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (resetPasswordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      data: {
        new_password: resetPasswordForm.new_password,
        confirm_password: resetPasswordForm.confirm_password,
      },
    });
  };

  const handleDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  };

  const roleFilterOptions = [
    { value: '', label: 'All Roles' },
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'moderator', label: 'Moderator' },
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  return (
    <PermissionWrapper allowedRoles="Super Admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Users</h1>
              <p className="text-muted mt-1">Manage admin users and moderators</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Create Admin User
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Users"
              value={stats.total}
              icon={<UsersIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Active Users"
              value={stats.active}
              subtitle={`${stats.inactive} inactive`}
              icon={<CheckCircleIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Super Admins"
              value={stats.superAdmins}
              subtitle={`${stats.moderators} moderators`}
              icon={<ShieldCheckIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="2FA Enabled"
              value={stats.with2FA}
              subtitle={`${stats.total - stats.with2FA} without 2FA`}
              icon={<LockClosedIcon className="w-6 h-6" />}
            />
          </div>

          {/* Filters */}
          <div className="glass rounded-xl p-4 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted z-10" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  className="pl-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Dropdown
                options={roleFilterOptions}
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value as typeof roleFilter);
                  setPage(1);
                }}
                placeholder="All Roles"
              />
              <Dropdown
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as typeof statusFilter);
                  setPage(1);
                }}
                placeholder="All Status"
              />
              <Dropdown
                options={pageSizeOptions}
                value={pageSize.toString()}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
                placeholder="Items per page"
              />
            </div>
          </div>

          {/* Table */}
          <div className="glass rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted/20 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted/20 rounded w-1/4" />
                        <div className="h-3 bg-muted/20 rounded w-1/3" />
                      </div>
                      <div className="h-6 bg-muted/20 rounded w-20" />
                      <div className="h-6 bg-muted/20 rounded w-16" />
                      <div className="h-6 bg-muted/20 rounded w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                    <ExclamationTriangleIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Error loading admin users</h3>
                  <p className="text-muted mb-6 max-w-md">
                    {error instanceof Error ? error.message : 'An error occurred while fetching admin users'}
                  </p>
                  <Button onClick={() => refetch()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : !data?.data?.data?.length ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-muted/10 mb-4">
                    <UsersIcon className="w-12 h-12 text-muted" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No admin users found</h3>
                  <p className="text-muted mb-4 max-w-md">
                    {search || roleFilter || statusFilter
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by creating your first admin user'}
                  </p>
                  {!search && !roleFilter && !statusFilter && (
                    <>
                      <Button onClick={() => setShowCreateModal(true)} className="mb-4">
                        <PlusIcon className="w-5 h-5" />
                        Create Admin User
                      </Button>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <strong>Note:</strong> If you created a user in the User table but don&apos;t see them here, 
                          you need to create an AdminUserProfile for that user. Run this command in your backend:
                        </p>
                        <code className="block mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded text-xs text-left">
                          python manage.py create_admin_profile &lt;user_id&gt; moderator
                        </code>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider hidden sm:table-cell">
                        Email
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider hidden lg:table-cell">
                        2FA
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider hidden xl:table-cell">
                        Created
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {data.data.data.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-muted/5 transition-colors group"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <UserCircleIcon className="w-6 h-6 text-primary" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">{user.full_name}</div>
                              <div className="text-sm text-muted truncate sm:hidden">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-muted hidden sm:table-cell">
                          <div className="truncate max-w-xs">{user.email}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.admin_group === 'superadmin'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}
                          >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            {user.admin_group_display}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                              <CheckCircleIcon className="w-5 h-5" />
                              <span className="hidden sm:inline">Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                              <XCircleIcon className="w-5 h-5" />
                              <span className="hidden sm:inline">Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                          {user.is_2fa_enabled ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                              <LockClosedIcon className="w-4 h-4" />
                              <span className="text-xs">Enabled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-muted">
                              <LockClosedIcon className="w-4 h-4" />
                              <span className="text-xs">Disabled</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-muted hidden xl:table-cell">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Reset Password"
                            >
                              <KeyIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Deactivate"
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

            {/* Pagination */}
            {data?.data?.pagination && data.data.pagination.totalPages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted text-center sm:text-left">
                  Showing <span className="font-medium text-foreground">{((data.data.pagination.page - 1) * data.data.pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium text-foreground">{Math.min(data.data.pagination.page * data.data.pagination.limit, data.data.pagination.total)}</span> of{' '}
                  <span className="font-medium text-foreground">{data.data.pagination.total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-sm text-muted">
                      Page <span className="font-medium text-foreground">{data.data.pagination.page}</span> of{' '}
                      <span className="font-medium text-foreground">{data.data.pagination.totalPages}</span>
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Create Modal */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateForm({
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                confirm_password: '',
                admin_group: 'moderator',
                permission_group_id: null,
                permissions: [],
              });
            }}
            title="Create Admin User"
          >
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={createForm.confirm_password}
                  onChange={(e) => setCreateForm({ ...createForm, confirm_password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                <Dropdown
                  options={[
                    { value: 'moderator', label: 'Moderator' },
                    { value: 'superadmin', label: 'Super Admin' },
                  ]}
                  value={createForm.admin_group}
                  onChange={(value) => {
                    const newGroup = value as typeof createForm.admin_group;
                    setCreateForm({ 
                      ...createForm, 
                      admin_group: newGroup,
                      permission_group_id: newGroup === 'superadmin' ? null : createForm.permission_group_id,
                      permissions: newGroup === 'superadmin' ? [] : createForm.permissions,
                    });
                  }}
                />
              </div>
              
              {/* Permission Group Selection - Only for Moderators */}
              {createForm.admin_group === 'moderator' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Permission Group (Optional)
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: 'No Group (Individual Permissions Only)' },
                      ...(permissionGroupsData || [])
                        .filter((g) => g.is_active)
                        .map((group) => ({
                          value: group.id.toString(),
                          label: `${group.name} (${group.permission_count} permissions)`,
                        })),
                    ]}
                    value={createForm.permission_group_id?.toString() || ''}
                    onChange={(value) => {
                      const groupId = value ? parseInt(value, 10) : null;
                      setCreateForm({
                        ...createForm,
                        permission_group_id: groupId,
                      });
                    }}
                  />
                  {createForm.permission_group_id && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <InformationCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-green-800 dark:text-green-300">
                        This moderator will inherit {permissionGroupsData?.find((g) => g.id === createForm.permission_group_id)?.permission_count || 0} permissions from the selected group.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      email: '',
                      first_name: '',
                      last_name: '',
                      password: '',
                      confirm_password: '',
                      admin_group: 'moderator',
                      permission_group_id: null,
                      permissions: [],
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Edit Modal */}
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              if (hasChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setPermissionSearch('');
                  setHasChanges(false);
                  setActiveTab('basic');
                }
              } else {
                setShowEditModal(false);
                setSelectedUser(null);
                setPermissionSearch('');
                setActiveTab('basic');
              }
            }}
            title="Edit Admin User"
            size="xl"
          >
            {selectedUser && (
              <div className="space-y-6">
                {/* User Info Header */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl border border-border">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                    <UserCircleIcon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground truncate">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted truncate">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">Last login:</span>
                      <span className="text-xs text-foreground">
                        {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        selectedUser.admin_group === 'superadmin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      {selectedUser.admin_group_display}
                    </span>
                    {hasChanges && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('basic')}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        activeTab === 'basic'
                          ? 'text-primary'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Basic Information
                      {activeTab === 'basic' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                    {editForm.admin_group === 'moderator' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('permissions')}
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                          activeTab === 'permissions'
                            ? 'text-primary'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        Permissions
                        {editForm.permissions.length > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                            {editForm.permissions.length}
                          </span>
                        )}
                        {activeTab === 'permissions' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'basic' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                    <Dropdown
                      options={[
                        { value: 'moderator', label: 'Moderator' },
                        { value: 'superadmin', label: 'Super Admin' },
                      ]}
                      value={editForm.admin_group}
                      onChange={(value) => {
                        const newGroup = value as typeof editForm.admin_group;
                        setEditForm({ 
                          ...editForm, 
                          admin_group: newGroup,
                          // Reset permissions if switching to superadmin
                          permissions: newGroup === 'superadmin' ? [] : editForm.permissions,
                        });
                      }}
                    />
                    {editForm.admin_group === 'superadmin' && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          Super Admins have full access to all features and permissions.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Permission Group Selection - Only for Moderators */}
                  {editForm.admin_group === 'moderator' && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Permission Group
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: 'No Group (Individual Permissions Only)' },
                          ...(permissionGroupsData || [])
                            .filter((g) => g.is_active)
                            .map((group) => ({
                              value: group.id.toString(),
                              label: `${group.name} (${group.permission_count} permissions)`,
                            })),
                        ]}
                        value={editForm.permission_group_id?.toString() || ''}
                        onChange={(value) => {
                          const groupId = value ? parseInt(value, 10) : null;
                          setEditForm({
                            ...editForm,
                            permission_group_id: groupId,
                          });
                        }}
                      />
                      {editForm.permission_group_id && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <InformationCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-green-800 dark:text-green-300 font-medium">
                              {permissionGroupsData?.find((g) => g.id === editForm.permission_group_id)?.name || 'Selected Group'}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              This moderator will inherit all permissions from the selected group. You can add additional individual permissions in the Permissions tab.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/5 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer flex-1">
                      Account is active
                    </label>
                    {editForm.is_active ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>
                )}
                
                {/* Permissions Management - Only for Moderators */}
                {activeTab === 'permissions' && editForm.admin_group === 'moderator' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Permissions</h4>
                        <p className="text-xs text-muted mt-1">
                          {editForm.permission_group_id
                            ? 'Additional individual permissions (group permissions are inherited automatically)'
                            : 'Select the permissions this moderator should have access to'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {editForm.permissions.length} individual permission{editForm.permissions.length !== 1 ? 's' : ''}
                        </span>
                        {editForm.permission_group_id && (
                          <>
                            <span className="text-muted">•</span>
                            <span className="text-xs text-primary font-medium">
                              + {permissionGroupsData?.find((g) => g.id === editForm.permission_group_id)?.permission_count || 0} from group
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Show Group Permissions Info */}
                    {editForm.permission_group_id && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-3">
                          <ShieldCheckIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground mb-1">
                              Group Permissions: {permissionGroupsData?.find((g) => g.id === editForm.permission_group_id)?.name || 'Selected Group'}
                            </p>
                            <p className="text-xs text-muted">
                              This moderator inherits {permissionGroupsData?.find((g) => g.id === editForm.permission_group_id)?.permission_count || 0} permissions from the selected group. 
                              Individual permissions below are added on top of group permissions.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                        <p className="text-xs text-muted">Read-only access to view data</p>
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
                        <p className="text-xs text-muted">Can approve/reject and manage content</p>
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
                        <p className="text-xs text-muted">All moderator permissions enabled</p>
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
                              editForm.permissions.includes(p)
                            ).length;
                            const allSelected = groupSelectedCount === permissions.length;
                            const someSelected = groupSelectedCount > 0 && groupSelectedCount < permissions.length;
                            
                            // Filter permissions by search
                            const filteredPermissions = permissions.filter((perm) =>
                              !permissionSearch || perm.toLowerCase().includes(permissionSearch.toLowerCase())
                            );

                            if (filteredPermissions.length === 0) return null;

                            return (
                              <div
                                key={group}
                                className="border border-border rounded-lg bg-background overflow-hidden"
                              >
                                {/* Group Header */}
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

                                {/* Group Permissions */}
                                {isExpanded && (
                                  <div className="border-t border-border bg-muted/5">
                                    <div className="p-3 space-y-2">
                                      {filteredPermissions.map((perm) => {
                                        const isSelected = editForm.permissions.includes(perm);
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
                                                  setEditForm({
                                                    ...editForm,
                                                    permissions: [...editForm.permissions, perm],
                                                  });
                                                } else {
                                                  setEditForm({
                                                    ...editForm,
                                                    permissions: editForm.permissions.filter((p) => p !== perm),
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
                            const allPerms = Object.values(PERMISSION_GROUPS).flat();
                            setEditForm({
                              ...editForm,
                              permissions: editForm.permissions.length === allPerms.length ? [] : [...allPerms],
                            });
                          }}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          {editForm.permissions.length === Object.values(PERMISSION_GROUPS).flat().length
                            ? 'Clear All'
                            : 'Select All'}
                        </button>
                        <span className="text-muted">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, permissions: [...MODERATOR_DEFAULT_PERMISSIONS] });
                          }}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          Reset to Defaults
                        </button>
                      </div>
                      <div className="text-xs text-muted">
                        <span className="font-medium text-foreground">{editForm.permissions.length}</span> permission
                        {editForm.permissions.length !== 1 ? 's' : ''} selected
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  {hasChanges && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3 text-amber-500" />
                      You have unsaved changes
                    </span>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (hasChanges) {
                          if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                            setShowEditModal(false);
                            setSelectedUser(null);
                            setPermissionSearch('');
                            setHasChanges(false);
                            setActiveTab('basic');
                          }
                        } else {
                          setShowEditModal(false);
                          setSelectedUser(null);
                          setPermissionSearch('');
                          setActiveTab('basic');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdate} 
                      disabled={updateMutation.isPending || !hasChanges}
                      className="min-w-[120px]"
                    >
                      {updateMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Reset Password Modal */}
          <Modal
            isOpen={showResetPasswordModal}
            onClose={() => {
              setShowResetPasswordModal(false);
              setResetPasswordForm({ new_password: '', confirm_password: '' });
              setSelectedUser(null);
            }}
            title="Reset Password"
          >
            {selectedUser && (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Reset password for <strong>{selectedUser.full_name}</strong> ({selectedUser.email})
                </p>
                <Input
                  label="New Password"
                  type="password"
                  value={resetPasswordForm.new_password}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, new_password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={resetPasswordForm.confirm_password}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })}
                  required
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setResetPasswordForm({ new_password: '', confirm_password: '' });
                      setSelectedUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleResetPasswordSubmit} disabled={resetPasswordMutation.isPending}>
                    {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Delete Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedUser(null);
            }}
            title="Deactivate Admin User"
          >
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Warning</p>
                    <p className="text-sm text-muted">
                      Are you sure you want to deactivate <strong className="text-foreground">{selectedUser.full_name}</strong> ({selectedUser.email})? 
                      This will prevent them from logging into the AdminWebApp.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate User'}
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

