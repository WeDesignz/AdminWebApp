'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { KpiCard } from '@/components/common/KpiCard';
import { formatDate } from '@/lib/utils/cn';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserGroupIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

export default function ModeratorReportPage() {
  const router = useRouter();
  const params = useParams();
  const { hasRole } = useAuthStore();
  const moderatorId = parseInt(params.moderatorId as string);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  // Fetch moderator daily report
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['moderatorDailyReport', moderatorId, selectedDate],
    queryFn: async () => {
      const response = await API.dashboard.getModeratorDailyReport(moderatorId, selectedDate);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch moderator report');
      }
      
      return response.data;
    },
    enabled: !!moderatorId,
  });

  // Show error toast
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report';
      toast.error(errorMessage);
    }
  }, [error]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const report = data;
  const moderator = report?.moderator;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <p className="text-muted-foreground">No report data available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/reports')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Daily Report - {moderator?.first_name} {moderator?.last_name}
              </h1>
              <p className="text-muted-foreground mt-1">{moderator?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {/* Report Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="w-4 h-4" />
          <span>Report Date: {formatDate(report.report_date)}</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Designers"
            value={`${report.designers.approved + report.designers.rejected}`}
            subtitle={`${report.designers.approved} approved, ${report.designers.rejected} rejected`}
            icon={<UserGroupIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Designs"
            value={`${report.designs.approved + report.designs.rejected}`}
            subtitle={`${report.designs.approved} approved, ${report.designs.rejected} rejected`}
            icon={<PhotoIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Custom Orders"
            value={report.custom_orders.interacted}
            subtitle={`${report.custom_orders.completed} completed`}
            icon={<WrenchScrewdriverIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Support Tickets"
            value={report.support.interacted}
            subtitle={`${report.support.resolved} resolved`}
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          />
          <KpiCard
            title="Coupons"
            value={report.coupons.added}
            subtitle={`${report.coupons.usage_count} usages`}
            icon={<TicketIcon className="w-6 h-6" />}
          />
        </div>

        {/* Detailed Sections */}
        <div className="space-y-4">
          {/* Designers Section */}
          <div className="card">
            <button
              onClick={() => toggleSection('designers')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserGroupIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Designers</h3>
                <span className="text-sm text-muted-foreground">
                  ({report.designers.approved} approved, {report.designers.rejected} rejected)
                </span>
              </div>
              {expandedSections.has('designers') ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
            {expandedSections.has('designers') && (
              <div className="p-4 border-t border-border">
                {report.designers.approved > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-success" />
                      Approved ({report.designers.approved})
                    </h4>
                    <div className="space-y-2">
                      {report.designers.approved_list.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="text-sm text-muted-foreground pl-6">
                          Designer ID: {item.designer_id} - {formatDate(item.approved_at)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.designers.rejected > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircleIcon className="w-4 h-4 text-error" />
                      Rejected ({report.designers.rejected})
                    </h4>
                    <div className="space-y-2">
                      {report.designers.rejected_list.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="text-sm text-muted-foreground pl-6">
                          <div>Designer ID: {item.designer_id} - {formatDate(item.rejected_at)}</div>
                          {item.rejection_reason && (
                            <div className="text-xs text-muted-foreground/80 pl-4 mt-1">
                              Reason: {item.rejection_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Designs Section */}
          <div className="card">
            <button
              onClick={() => toggleSection('designs')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PhotoIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Designs</h3>
                <span className="text-sm text-muted-foreground">
                  ({report.designs.approved} approved, {report.designs.rejected} rejected)
                </span>
              </div>
              {expandedSections.has('designs') ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
            {expandedSections.has('designs') && (
              <div className="p-4 border-t border-border">
                {report.designs.approved > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-success" />
                      Approved ({report.designs.approved})
                    </h4>
                    <div className="space-y-2">
                      {report.designs.approved_list.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="text-sm text-muted-foreground pl-6">
                          Design ID: {item.product_id} - {formatDate(item.approved_at)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.designs.rejected > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircleIcon className="w-4 h-4 text-error" />
                      Rejected ({report.designs.rejected})
                    </h4>
                    <div className="space-y-2">
                      {report.designs.rejected_list.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="text-sm text-muted-foreground pl-6">
                          <div>Design ID: {item.product_id} - {formatDate(item.approved_at)}</div>
                          {item.rejection_reason && (
                            <div className="text-xs text-muted-foreground/80 pl-4 mt-1">
                              Reason: {item.rejection_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Orders Section */}
          <div className="card">
            <button
              onClick={() => toggleSection('custom_orders')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <WrenchScrewdriverIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Custom Orders</h3>
                <span className="text-sm text-muted-foreground">
                  ({report.custom_orders.interacted} interacted, {report.custom_orders.completed} completed)
                </span>
              </div>
              {expandedSections.has('custom_orders') ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
            {expandedSections.has('custom_orders') && (
              <div className="p-4 border-t border-border">
                <div className="space-y-3">
                  {report.custom_orders.list.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Order #{order.id}: {order.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'completed' ? 'bg-success/20 text-success' :
                          order.status === 'cancelled' ? 'bg-error/20 text-error' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Updated: {formatDate(order.updated_at)}
                      </div>
                      {order.cancellation_reason && (
                        <div className="text-xs text-error mt-2 pl-4 border-l-2 border-error/30">
                          Cancellation Reason: {order.cancellation_reason}
                        </div>
                      )}
                      {order.refund_reason && (
                        <div className="text-xs text-warning mt-2 pl-4 border-l-2 border-warning/30">
                          Refund Reason: {order.refund_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Support Tickets Section */}
          <div className="card">
            <button
              onClick={() => toggleSection('support')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Support Tickets</h3>
                <span className="text-sm text-muted-foreground">
                  ({report.support.interacted} interacted, {report.support.resolved} resolved)
                </span>
              </div>
              {expandedSections.has('support') ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
            {expandedSections.has('support') && (
              <div className="p-4 border-t border-border">
                <div className="space-y-3">
                  {report.support.support_threads.slice(0, 10).map((ticket: any) => (
                    <div key={ticket.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">#{ticket.id}: {ticket.subject}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          ticket.status === 'resolved' ? 'bg-success/20 text-success' :
                          ticket.status === 'closed' ? 'bg-muted text-muted-foreground' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Priority: {ticket.priority} | Updated: {formatDate(ticket.updated_at)}
                      </div>
                      {ticket.resolution && (
                        <div className="text-xs text-muted-foreground mt-2 pl-4 border-l-2 border-border">
                          Resolution: {ticket.resolution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coupons Section */}
          <div className="card">
            <button
              onClick={() => toggleSection('coupons')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TicketIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Coupons</h3>
                <span className="text-sm text-muted-foreground">
                  ({report.coupons.added} added, {report.coupons.usage_count} usages)
                </span>
              </div>
              {expandedSections.has('coupons') ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
            {expandedSections.has('coupons') && (
              <div className="p-4 border-t border-border">
                <div className="space-y-2">
                  {report.coupons.list.slice(0, 10).map((coupon: any) => (
                    <div key={coupon.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div>
                        <span className="font-medium">{coupon.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({coupon.code})</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(coupon.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

