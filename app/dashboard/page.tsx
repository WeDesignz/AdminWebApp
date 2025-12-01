'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/common/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  CurrencyDollarIcon,
  UsersIcon,
  UserPlusIcon,
  BanknotesIcon,
  UserGroupIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils/cn';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/common/Button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Super Admin Dashboard Component
function SuperAdminDashboard({ data }: { data: any }) {
  const router = useRouter();
  const financial = data.financial || {};
  const transactions = data.transactions || {};
  const users = data.users || {};
  const pendingTasks = data.pending_tasks || {};
  const payouts = data.payouts || {};
  const topCustomers = data.top_customers || [];
  const revenueTrend = data.revenue_trend || [];

  const revenueBySource = [
    { name: 'Plans', value: financial.revenue_by_source?.plans || 0, color: '#3b82f6' },
    { name: 'Designs', value: financial.revenue_by_source?.designs || 0, color: '#10b981' },
    { name: 'Custom Orders', value: financial.revenue_by_source?.custom_orders || 0, color: '#f59e0b' },
  ];

  return (
      <div className="space-y-6">
      {/* Financial KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
          title="Revenue Today"
          value={formatCurrency(financial.revenue_today || 0)}
          subtitle={`${formatCurrency(financial.revenue_month || 0)} this month`}
          icon={<CurrencyDollarIcon className="w-6 h-6" />}
          change={financial.revenue_growth}
        />
        <KpiCard
          title="Net Revenue"
          value={formatCurrency(financial.net_revenue || 0)}
          subtitle={`After ${formatCurrency(financial.total_refunds || 0)} refunds`}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
          />
          <KpiCard
          title="Avg Order Value"
          value={formatCurrency(financial.avg_order_value || 0)}
          subtitle={`${transactions.successful || 0} successful orders`}
          icon={<BanknotesIcon className="w-6 h-6" />}
        />
        <KpiCard
          title="Revenue Growth"
          value={`${financial.revenue_growth >= 0 ? '+' : ''}${financial.revenue_growth?.toFixed(1) || 0}%`}
          subtitle="Month over month"
          icon={financial.revenue_growth >= 0 ? <ArrowTrendingUpIcon className="w-6 h-6" /> : <ArrowTrendingDownIcon className="w-6 h-6" />}
          change={financial.revenue_growth}
        />
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Customers"
          value={users.total_customers || 0}
          subtitle={`${users.new_customers_7d || 0} new (7d)`}
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <KpiCard
          title="Total Designers"
          value={users.total_designers || 0}
          subtitle={`${users.new_designers_7d || 0} new (7d)`}
          icon={<UserGroupIcon className="w-6 h-6" />}
        />
        <KpiCard
          title="Active Subscriptions"
          value={users.active_subscriptions || 0}
          icon={<BanknotesIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Pending Payouts"
          value={formatCurrency(payouts.pending_amount || 0)}
          subtitle={`${payouts.pending_count || 0} requests`}
            icon={<BanknotesIcon className="w-6 h-6" />}
          />
        </div>

      {/* Alerts */}
      {(pendingTasks.designer_approvals > 0 || pendingTasks.design_reviews > 0 || pendingTasks.custom_orders > 0 || pendingTasks.support_tickets > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingTasks.designer_approvals > 0 && (
            <div className="glass rounded-xl p-4 bg-warning/10 border-warning/30">
              <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning rounded-lg">
                    <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <div>
                    <p className="font-medium">{pendingTasks.designer_approvals} Designer Approvals Pending</p>
                    <p className="text-sm text-muted-foreground">Review and approve new designer applications</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/designers')}>
                  Review
                </Button>
              </div>
            </div>
          )}
          {pendingTasks.custom_orders > 0 && (
            <div className="glass rounded-xl p-4 bg-warning/10 border-warning/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning rounded-lg">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{pendingTasks.custom_orders} Custom Orders Pending</p>
                    {pendingTasks.custom_orders_delayed > 0 && (
                      <p className="text-sm text-error">{pendingTasks.custom_orders_delayed} delayed</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/custom-orders')}>
              View Orders
            </Button>
          </div>
        </div>
          )}
        </div>
      )}

      {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
          <h3 className="text-xl font-bold mb-4">Revenue Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                formatter={(value: any) => formatCurrency(value)}
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
          <h3 className="text-xl font-bold mb-4">Revenue by Source (This Month)</h3>
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBySource}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueBySource.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                formatter={(value: any) => formatCurrency(value)}
                />
            </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-xl font-bold mb-4">Top Customers (This Month)</h3>
          <div className="space-y-3">
            {topCustomers.map((customer: any, index: number) => (
              <div key={customer.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(customer.total_spent)}</p>
                  <p className="text-sm text-muted-foreground">{customer.order_count} orders</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/designers" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">Review Designers</h4>
            <p className="text-sm text-muted-foreground">Approve or reject designer applications</p>
          </Link>
          <Link href="/reports" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">View Reports</h4>
            <p className="text-sm text-muted-foreground">Check moderator daily activity reports</p>
          </Link>
          <Link href="/orders" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">Financial Reports</h4>
            <p className="text-sm text-muted-foreground">View transactions and revenue analytics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Moderator Dashboard Component
function ModeratorDashboard({ data }: { data: any }) {
  const router = useRouter();
  const todayActivity = data.today_activity || {};
  const pendingTasks = data.pending_tasks || {};

  return (
    <div className="space-y-6">
      {/* Today's Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Total Activity Today"
          value={todayActivity.total || 0}
          subtitle="All actions performed today"
          icon={<CheckCircleIcon className="w-6 h-6" />}
        />
        <KpiCard
          title="Designers Processed"
          value={todayActivity.designers_approved + todayActivity.designers_rejected || 0}
          subtitle={`${todayActivity.designers_approved} approved, ${todayActivity.designers_rejected} rejected`}
          icon={<UserGroupIcon className="w-6 h-6" />}
        />
        <KpiCard
          title="Designs Processed"
          value={todayActivity.designs_approved + todayActivity.designs_rejected || 0}
          subtitle={`${todayActivity.designs_approved} approved, ${todayActivity.designs_rejected} rejected`}
          icon={<PhotoIcon className="w-6 h-6" />}
        />
      </div>

      {/* Today's Detailed Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Custom Orders"
          value={todayActivity.custom_orders_completed || 0}
          subtitle="Completed today"
          icon={<WrenchScrewdriverIcon className="w-6 h-6" />}
        />
        <KpiCard
          title="Support Tickets"
          value={todayActivity.support_resolved || 0}
          subtitle="Resolved today"
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
        />
      </div>

      {/* Pending Tasks - High Priority */}
      {pendingTasks.total > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Pending Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTasks.designer_approvals > 0 && (
              <div className="card p-6 border-2 border-warning/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-warning/20 rounded-lg">
                      <UserGroupIcon className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Designer Approvals</h3>
                      <p className="text-sm text-muted-foreground">Pending verification</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-warning">{pendingTasks.designer_approvals}</div>
                </div>
                <Button variant="primary" onClick={() => router.push('/designers')} className="w-full">
                  Review Now
                </Button>
              </div>
            )}

            {pendingTasks.design_reviews > 0 && (
              <div className="card p-6 border-2 border-warning/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-warning/20 rounded-lg">
                      <PhotoIcon className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Design Reviews</h3>
                      <p className="text-sm text-muted-foreground">Awaiting approval</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-warning">{pendingTasks.design_reviews}</div>
                </div>
                <Button variant="primary" onClick={() => router.push('/designs')} className="w-full">
                  Review Now
                </Button>
              </div>
            )}

            {pendingTasks.custom_orders > 0 && (
              <div className="card p-6 border-2 border-primary/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/20 rounded-lg">
                      <WrenchScrewdriverIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Custom Orders</h3>
                      <p className="text-sm text-muted-foreground">Assigned to you</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{pendingTasks.custom_orders}</div>
                </div>
                <Button variant="primary" onClick={() => router.push('/custom-orders')} className="w-full">
                  View Orders
                </Button>
              </div>
            )}

            {pendingTasks.support_tickets > 0 && (
              <div className="card p-6 border-2 border-primary/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/20 rounded-lg">
                      <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Support Tickets</h3>
                      <p className="text-sm text-muted-foreground">Assigned to you</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{pendingTasks.support_tickets}</div>
                </div>
                <Button variant="primary" onClick={() => router.push('/support')} className="w-full">
                  View Tickets
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Pending Tasks */}
      {pendingTasks.total === 0 && (
        <div className="card text-center py-12">
          <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">You have no pending tasks at the moment.</p>
        </div>
      )}

      {/* Today's Activity Breakdown */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Today&apos;s Activity Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="font-medium">Designers Approved</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.designers_approved || 0}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircleIcon className="w-5 h-5 text-error" />
              <span className="font-medium">Designers Rejected</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.designers_rejected || 0}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="font-medium">Designs Approved</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.designs_approved || 0}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircleIcon className="w-5 h-5 text-error" />
              <span className="font-medium">Designs Rejected</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.designs_rejected || 0}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="font-medium">Orders Completed</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.custom_orders_completed || 0}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="font-medium">Tickets Resolved</span>
            </div>
            <p className="text-2xl font-bold">{todayActivity.support_resolved || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/designers" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">Review Designers</h4>
            <p className="text-sm text-muted-foreground">Approve or reject designer applications</p>
          </Link>
          <Link href="/designs" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">Review Designs</h4>
            <p className="text-sm text-muted-foreground">Approve or reject design submissions</p>
          </Link>
          <Link href="/custom-orders" className="p-4 glass-hover rounded-xl text-left transition-all">
            <h4 className="font-medium mb-1">Custom Orders</h4>
            <p className="text-sm text-muted-foreground">Manage assigned custom orders</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { admin, hasRole } = useAuthStore();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await API.dashboard.getKPIData();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isSuperAdmin = hasRole('Super Admin');
  const dashboardData = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin 
                ? 'Welcome back! Here\'s your business overview' 
                : 'Welcome back! Here\'s your task overview'}
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/reports')}>
                View Reports
              </Button>
            </div>
          )}
        </div>

        {dashboardData?.role === 'superadmin' ? (
          <SuperAdminDashboard data={dashboardData} />
        ) : (
          <ModeratorDashboard data={dashboardData} />
        )}
      </div>
    </DashboardLayout>
  );
}
