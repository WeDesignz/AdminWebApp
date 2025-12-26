'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Dropdown } from '@/components/common/Dropdown';
import { KpiCard } from '@/components/common/KpiCard';
import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/common/Input';
import { cn } from '@/lib/utils/cn';

interface TDSRecord {
  id: number;
  settlement_id: number;
  designer_id: number;
  designer_name: string;
  designer_email: string;
  settlement_period_start: string;
  settlement_period_end: string;
  settlement_amount: number;
  has_pan: boolean;
  pan_number: string;
  tds_percentage: number;
  tds_amount: number;
  net_amount: number;
  created_at: string;
}

export default function TDSPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Fetch TDS records
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tds', page, pageSize, monthFilter, yearFilter],
    queryFn: () => API.settlement.listTDSRecords({
      page,
      page_size: pageSize,
      month: monthFilter || undefined,
      year: yearFilter || undefined,
    }),
  });

  const tdsRecords = data?.data?.data || [];
  const totalCount = data?.data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Calculate stats
  const totalTDS = tdsRecords.reduce((sum: number, record: TDSRecord) => sum + record.tds_amount, 0);
  const totalSettlementAmount = tdsRecords.reduce((sum: number, record: TDSRecord) => sum + record.settlement_amount, 0);
  const totalNetAmount = tdsRecords.reduce((sum: number, record: TDSRecord) => sum + record.net_amount, 0);
  const withPAN = tdsRecords.filter((r: TDSRecord) => r.has_pan).length;
  const withoutPAN = tdsRecords.filter((r: TDSRecord) => !r.has_pan).length;

  // Filter by search
  const filteredRecords = tdsRecords.filter((record: TDSRecord) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      record.designer_name?.toLowerCase().includes(searchLower) ||
      record.designer_email?.toLowerCase().includes(searchLower) ||
      record.settlement_id.toString().includes(searchLower) ||
      record.pan_number?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TDS Management</h1>
            <p className="text-muted mt-1">View Tax Deducted at Source (TDS) records for settlements</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4">
          <KpiCard title="Total Records" value={totalCount} />
          <KpiCard title="Total Settlement Amount" value={formatCurrency(totalSettlementAmount)} />
          <KpiCard title="Total TDS" value={formatCurrency(totalTDS)} />
          <KpiCard title="Total Net Amount" value={formatCurrency(totalNetAmount)} />
          <KpiCard title="With PAN" value={withPAN} />
          <KpiCard title="Without PAN" value={withoutPAN} />
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by designer name, email, or settlement ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Dropdown
                value={monthFilter === '' ? '' : String(monthFilter)}
                onChange={(value) => setMonthFilter(value === '' ? '' : Number(value))}
                options={monthOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Dropdown
                value={yearFilter === '' ? '' : String(yearFilter)}
                onChange={(value) => setYearFilter(value === '' ? '' : Number(value))}
                options={[
                  { value: '', label: 'All Years' },
                  ...yearOptions.map(year => ({ value: String(year), label: String(year) })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Page Size</label>
              <Dropdown
                value={String(pageSize)}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
                options={[
                  { value: '10', label: '10' },
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* TDS Records Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4">Settlement ID</th>
                  <th className="text-left p-4">Designer</th>
                  <th className="text-left p-4">Period</th>
                  <th className="text-left p-4">Settlement Amount</th>
                  <th className="text-left p-4">Has PAN</th>
                  <th className="text-left p-4">PAN Number</th>
                  <th className="text-left p-4">TDS %</th>
                  <th className="text-left p-4">TDS Amount</th>
                  <th className="text-left p-4">Net Amount</th>
                  <th className="text-left p-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-muted">
                      No TDS records found
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record: TDSRecord) => (
                    <tr key={record.id} className="border-b border-border hover:bg-muted/5">
                      <td className="p-4 font-medium">#{record.settlement_id}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{record.designer_name}</p>
                          <p className="text-sm text-muted">{record.designer_email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {formatDate(record.settlement_period_start)} - {formatDate(record.settlement_period_end)}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(record.settlement_amount)}</td>
                      <td className="p-4">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          record.has_pan ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        )}>
                          {record.has_pan ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{record.pan_number || 'N/A'}</td>
                      <td className="p-4 text-sm">{record.tds_percentage}%</td>
                      <td className="p-4 font-medium text-red-600">{formatCurrency(record.tds_amount)}</td>
                      <td className="p-4 font-medium text-green-600">{formatCurrency(record.net_amount)}</td>
                      <td className="p-4 text-sm">{formatDate(record.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

