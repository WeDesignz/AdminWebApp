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
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AdminUser } from '@/types';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export default function ReportsPage() {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mockPdfPage, setMockPdfPage] = useState(1);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Debounce search input (hooks must be called before any early returns)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch moderators (hooks must be called before any early returns)
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
    enabled: hasRole('Super Admin'),
  });

  // Fetch Mock PDF report (stats + list)
  const {
    data: mockPdfData,
    isLoading: mockPdfLoading,
    error: mockPdfError,
  } = useQuery({
    queryKey: ['mockPdfReports', mockPdfPage],
    queryFn: async () => {
      const response = await API.mockPdfReports.getMockPdfReports({
        page: mockPdfPage,
        page_size: 20,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch mock PDF report');
      }
      return response.data;
    },
    enabled: hasRole('Super Admin'),
  });

  // Redirect moderators away from this page
  useEffect(() => {
    if (!hasRole('Super Admin')) {
      toast.error('Access denied. This page is restricted to Super Admins only.');
      router.replace('/dashboard');
    }
  }, [hasRole, router]);

  // Show error toast
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch moderators';
      toast.error(errorMessage);
    }
  }, [error]);

  useEffect(() => {
    if (mockPdfError) {
      toast.error(mockPdfError instanceof Error ? mockPdfError.message : 'Failed to fetch mock PDF report');
    }
  }, [mockPdfError]);

  const handleDownloadPdf = async (downloadId: number) => {
    try {
      const { blob, filename } = await API.mockPdfReports.downloadMockPdf(downloadId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const handleExportExcel = async () => {
    if (!mockPdfData?.stats?.total) {
      toast.error('No data to export');
      return;
    }
    setExportingExcel(true);
    try {
      const total = Math.min(mockPdfData.stats.total, 5000);
      const response = await API.mockPdfReports.getMockPdfReports({
        page: 1,
        page_size: total,
      });
      if (!response.success || !response.data) throw new Error(response.error || 'Failed to fetch data');
      const rows = response.data.downloads || [];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mock PDF Downloads');
      sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'customer_name', width: 28 },
        { header: 'Contact Number', key: 'customer_mobile', width: 16 },
        { header: 'Number of Designs', key: 'number_of_designs', width: 18 },
        { header: 'Download Type', key: 'download_type', width: 14 },
        { header: 'Created At', key: 'created_at', width: 22 },
        { header: 'Completed At', key: 'completed_at', width: 22 },
      ];
      sheet.getRow(1).font = { bold: true };
      rows.forEach((r: any) => {
        sheet.addRow({
          id: r.id,
          customer_name: r.customer_name || '',
          customer_mobile: r.customer_mobile || '',
          number_of_designs: r.number_of_designs ?? r.total_pages ?? 0,
          download_type: r.download_type || '',
          created_at: r.created_at ? format(new Date(r.created_at), 'PPp') : '',
          completed_at: r.completed_at ? format(new Date(r.completed_at), 'PPp') : '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mock-pdf-downloads-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Excel exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportingExcel(false);
    }
  };

  // Don't render if not Super Admin
  if (!hasRole('Super Admin')) {
    return null;
  }

  const moderators = data?.data?.data || [];
  const stats = mockPdfData?.stats ?? { total: 0, today: 0, this_week: 0, this_month: 0 };
  const downloads = mockPdfData?.downloads ?? [];
  const totalPages = mockPdfData?.total_pages ?? 1;
  const currentPage = mockPdfData?.current_page ?? 1;

  const handleViewReport = (moderatorId: number) => {
    router.push(`/reports/${moderatorId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Daily Reports Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Daily Reports</h1>
              <p className="text-muted-foreground mt-1">
                View daily activity reports for each moderator
              </p>
            </div>
          </div>

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

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}

          {!isLoading && moderators.length === 0 && (
            <div className="card text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No moderators found</p>
              {debouncedSearch && (
                <p className="text-muted-foreground text-sm mt-2">Try adjusting your search criteria</p>
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

        {/* Mock PDF Section */}
        <div className="space-y-6 border-t border-border pt-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <DocumentTextIcon className="w-7 h-7 text-primary" />
                Mock PDF
              </h2>
              <p className="text-muted-foreground mt-1">
                Completed mock PDF downloads: counts and list. Download PDFs or export to Excel.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={exportingExcel || !stats.total}
              className="flex items-center gap-2"
            >
              {exportingExcel ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <ArrowDownTrayIcon className="w-5 h-5" />
              )}
              Export to Excel
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-muted-foreground">Total downloaded</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold mt-1">{stats.today}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted-foreground">This week</p>
              <p className="text-2xl font-bold mt-1">{stats.this_week}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted-foreground">This month</p>
              <p className="text-2xl font-bold mt-1">{stats.this_month}</p>
            </div>
          </div>

          {mockPdfLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}

          {!mockPdfLoading && downloads.length === 0 && (
            <div className="card text-center py-12">
              <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No mock PDF downloads yet</p>
            </div>
          )}

          {!mockPdfLoading && downloads.length > 0 && (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-3 font-semibold">Name</th>
                        <th className="p-3 font-semibold">Contact</th>
                        <th className="p-3 font-semibold">Logo</th>
                        <th className="p-3 font-semibold">No. of designs</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloads.map((row: any) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="p-3">{row.customer_name || '—'}</td>
                          <td className="p-3">{row.customer_mobile || '—'}</td>
                          <td className="p-3">
                            {row.customer_logo_url ? (
                              <img
                                src={row.customer_logo_url}
                                alt=""
                                className="w-10 h-10 object-contain rounded border border-border"
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">{row.number_of_designs ?? row.total_pages ?? 0}</td>
                          <td className="p-3">
                            {row.created_at
                              ? format(new Date(row.created_at), 'PPp')
                              : '—'}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPdf(row.id)}
                              className="flex items-center gap-1"
                            >
                              <DocumentArrowDownIcon className="w-4 h-4" />
                              Download PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setMockPdfPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setMockPdfPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
