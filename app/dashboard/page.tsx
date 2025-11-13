'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/common/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import {
  CurrencyDollarIcon,
  UsersIcon,
  UserPlusIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/common/Button';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const DEFAULT_REVENUE_DATA = [
  { name: 'Mon', revenue: 12000 },
  { name: 'Tue', revenue: 15000 },
  { name: 'Wed', revenue: 18000 },
  { name: 'Thu', revenue: 14000 },
  { name: 'Fri', revenue: 22000 },
  { name: 'Sat', revenue: 19000 },
  { name: 'Sun', revenue: 16000 },
];

const DEFAULT_TOP_DESIGNERS = [
  { name: 'Alice', earnings: 45000 },
  { name: 'Bob', earnings: 38000 },
  { name: 'Carol', earnings: 32000 },
  { name: 'David', earnings: 28000 },
  { name: 'Eve', earnings: 24000 },
];

export default function DashboardPage() {
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['kpi-data'],
    queryFn: () => MockAPI.getKPIData(),
  });

  const { data: revenueAnalyticsData } = useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: () =>
      MockAPI.getRevenueAnalytics({
        report_type: 'daily',
        group_by: 'day',
        include_refunds: true,
      }),
  });

  const { data: topDesignersData } = useQuery({
    queryKey: ['top-designers'],
    queryFn: () =>
      MockAPI.getTopDesigners({
        limit: 5,
        sort_by: 'revenue',
      }),
  });

  const revenueChartData = useMemo(() => {
    const breakdown = revenueAnalyticsData?.data?.period_breakdown;
    if (Array.isArray(breakdown) && breakdown.length > 0) {
      return breakdown.map((item: any, index: number) => {
        const label =
          item.label ||
          item.period ||
          item.period_label ||
          (item.date ? formatDate(item.date) : `P${index + 1}`);

        return {
          name: label,
          revenue:
            item.total_revenue ?? item.revenue ?? item.amount ?? 0,
        };
      });
    }

    return DEFAULT_REVENUE_DATA;
  }, [revenueAnalyticsData]);

  const topDesignersChartData = useMemo(() => {
    const designers = topDesignersData?.data?.top_designers;
    if (Array.isArray(designers) && designers.length > 0) {
      return designers.map((designer: any, index: number) => ({
        name:
          designer.name ||
          designer.designer_name ||
          designer.full_name ||
          `Designer ${index + 1}`,
        earnings:
          designer.total_revenue ?? designer.revenue ?? designer.earnings ?? 0,
      }));
    }

    return DEFAULT_TOP_DESIGNERS;
  }, [topDesignersData]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const kpi = kpiData?.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted mt-1">Welcome back! Here&apos;s your overview</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Export Report</Button>
            <Button variant="primary">Create Report</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(kpi?.totalRevenue.today || 0)}
            change={kpi?.totalRevenue.change}
            subtitle={`${formatCurrency(kpi?.totalRevenue.month || 0)} this month`}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Active Users"
            value={kpi?.activeUsers.count || 0}
            change={kpi?.activeUsers.change}
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="New Designers"
            value={kpi?.newDesigners.count || 0}
            subtitle="Last 7 days"
            icon={<UserPlusIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Pending Payouts"
            value={formatCurrency(kpi?.pendingPayouts.amount || 0)}
            subtitle={`${kpi?.pendingPayouts.count || 0} requests`}
            icon={<BanknotesIcon className="w-6 h-6" />}
          />
        </div>

        <div className="glass rounded-2xl p-4 bg-warning/10 border-warning/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning rounded-lg">
              <BanknotesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">2 new custom orders require attention</p>
              <p className="text-sm text-muted">Review pending orders with SLA deadlines approaching</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              View Orders
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="text-xl font-bold mb-4">Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-xl font-bold mb-4">Top Designers</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDesignersChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="earnings" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 glass-hover rounded-xl text-left">
              <h4 className="font-medium mb-1">Approve Pending Designer</h4>
              <p className="text-sm text-muted">Review and approve new designer applications</p>
            </button>
            <button className="p-4 glass-hover rounded-xl text-left">
              <h4 className="font-medium mb-1">Create Report</h4>
              <p className="text-sm text-muted">Generate detailed analytics report</p>
            </button>
            <button className="p-4 glass-hover rounded-xl text-left">
              <h4 className="font-medium mb-1">Broadcast Notification</h4>
              <p className="text-sm text-muted">Send announcement to all users</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
