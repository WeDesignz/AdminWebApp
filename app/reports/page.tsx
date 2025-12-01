'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { AdminUser } from '@/types';

export default function ReportsPage() {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch moderators
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers', 'moderator', debouncedSearch],
    queryFn: async () => {
      const response = await API.adminUsers.getAdminUsers({
        role: 'moderator',
        status: 'active',
        search: debouncedSearch || undefined,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch moderators');
      }
      
      return response;
    },
  });

  // Show error toast
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch moderators';
      toast.error(errorMessage);
    }
  }, [error]);

  const moderators = data?.data?.data || [];

  const handleViewReport = (moderatorId: number) => {
    router.push(`/reports/${moderatorId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Reports</h1>
            <p className="text-muted-foreground mt-1">
              View daily activity reports for each moderator
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search moderators by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Moderators List */}
        {!isLoading && moderators.length === 0 && (
          <div className="card text-center py-12">
            <ShieldCheckIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No moderators found</p>
            {debouncedSearch && (
              <p className="text-muted-foreground text-sm mt-2">
                Try adjusting your search criteria
              </p>
            )}
          </div>
        )}

        {!isLoading && moderators.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moderators.map((moderator: AdminUser) => (
              <div
                key={moderator.id}
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleViewReport(moderator.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserGroupIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {moderator.first_name} {moderator.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{moderator.email}</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Click to view daily report</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

