'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils/cn';
import { ActivityLog } from '@/types';
import { useState } from 'react';
import { Dropdown } from '@/components/common/Dropdown';
import {
  UserGroupIcon,
  PhotoIcon,
  UsersIcon,
  CubeIcon,
  BellIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlagIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
  ArrowPathIcon,
  BanknotesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ActionType =
  | 'APPROVE_DESIGNER'
  | 'REJECT_DESIGNER'
  | 'APPROVE_DESIGN'
  | 'REJECT_DESIGN'
  | 'FLAG_DESIGN'
  | 'RESOLVE_FLAG'
  | 'ACTIVATE_CUSTOMER'
  | 'DEACTIVATE_CUSTOMER'
  | 'CREATE_PLAN'
  | 'UPDATE_PLAN'
  | 'DELETE_PLAN'
  | 'CREATE_NOTIFICATION'
  | 'UPDATE_SYSTEM_CONFIG'
  | 'UPDATE_ORDER_STATUS'
  | 'INITIATE_REFUND'
  | 'CREATE_RAZORPAY_ACCOUNT'
  | 'REJECT_ORDER'
  | 'UPLOAD_DELIVERABLES';

export default function ActivityLogPage() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<number | null>(null); // days: 7, 15, 30, or null for all

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => MockAPI.getActivityLogs({ limit: 100 }),
  });

  const logs = data?.data || [];

  // Filter logs
  let filteredLogs = logs;

  // Filter by action type
  if (actionFilter !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.action && log.action === actionFilter);
  }

  // Filter by time period
  if (timeFilter !== null) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    filteredLogs = filteredLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });
  }

  // Get unique action types for filter
  const actionTypes = Array.from(new Set(logs.map((log) => log.action).filter((action): action is string => !!action)));

  const getActionIcon = (action: string | undefined) => {
    if (!action) return <ClockIcon className="w-5 h-5 text-muted" />;
    switch (action) {
      case 'APPROVE_DESIGNER':
      case 'APPROVE_DESIGN':
        return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'REJECT_DESIGNER':
      case 'REJECT_DESIGN':
      case 'REJECT_ORDER':
        return <XCircleIcon className="w-5 h-5 text-error" />;
      case 'FLAG_DESIGN':
        return <FlagIcon className="w-5 h-5 text-warning" />;
      case 'RESOLVE_FLAG':
        return <ShieldCheckIcon className="w-5 h-5 text-success" />;
      case 'ACTIVATE_CUSTOMER':
        return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'DEACTIVATE_CUSTOMER':
        return <XCircleIcon className="w-5 h-5 text-error" />;
      case 'CREATE_PLAN':
      case 'CREATE_NOTIFICATION':
        return <PlusIcon className="w-5 h-5 text-primary" />;
      case 'UPDATE_PLAN':
      case 'UPDATE_SYSTEM_CONFIG':
      case 'UPDATE_ORDER_STATUS':
        return <PencilIcon className="w-5 h-5 text-primary" />;
      case 'DELETE_PLAN':
        return <TrashIcon className="w-5 h-5 text-error" />;
      case 'INITIATE_REFUND':
        return <BanknotesIcon className="w-5 h-5 text-warning" />;
      case 'CREATE_RAZORPAY_ACCOUNT':
        return <CreditCardIcon className="w-5 h-5 text-primary" />;
      case 'UPLOAD_DELIVERABLES':
        return <ArrowPathIcon className="w-5 h-5 text-primary" />;
      default:
        return <ClockIcon className="w-5 h-5 text-muted" />;
    }
  };

  const getActionColor = (action: string | undefined) => {
    if (!action) return 'bg-muted/10 border-muted/20 text-muted';
    if (action.includes('APPROVE') || action.includes('ACTIVATE') || action.includes('RESOLVE')) {
      return 'bg-success/10 border-success/20 text-success';
    }
    if (action.includes('REJECT') || action.includes('DEACTIVATE') || action.includes('DELETE')) {
      return 'bg-error/10 border-error/20 text-error';
    }
    if (action.includes('FLAG')) {
      return 'bg-warning/10 border-warning/20 text-warning';
    }
    if (action.includes('CREATE') || action.includes('UPDATE')) {
      return 'bg-primary/10 border-primary/20 text-primary';
    }
    return 'bg-muted/10 border-muted/20 text-muted';
  };

  const getResourceIcon = (resource: string | undefined) => {
    if (!resource) return <ClockIcon className="w-4 h-4" />;
    switch (resource.toLowerCase()) {
      case 'designer':
        return <UserGroupIcon className="w-4 h-4" />;
      case 'design':
        return <PhotoIcon className="w-4 h-4" />;
      case 'customer':
        return <UsersIcon className="w-4 h-4" />;
      case 'plan':
        return <CubeIcon className="w-4 h-4" />;
      case 'notification':
        return <BellIcon className="w-4 h-4" />;
      case 'system config':
        return <Cog6ToothIcon className="w-4 h-4" />;
      case 'order':
      case 'custom order':
        return <ShoppingCartIcon className="w-4 h-4" />;
      case 'transaction':
        return <CreditCardIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatAction = (action: string | undefined) => {
    if (!action) return 'Unknown Action';
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter options
  const actionFilterOptions = [
    { value: 'all', label: 'All Activities' },
    ...actionTypes.map((action) => ({
      value: action,
      label: formatAction(action),
    })),
  ];

  const getActionDescription = (log: ActivityLog) => {
    const resourceName = log.resource || 'Unknown';
    const resourceId = log.resourceId || 'N/A';
    const action = log.action;
    
    if (!action) {
      return `Unknown action on ${resourceName} #${resourceId}`;
    }
    
    switch (action) {
      case 'APPROVE_DESIGNER':
        return `Approved designer onboarding for ${resourceName} #${resourceId}`;
      case 'REJECT_DESIGNER':
        return `Rejected designer onboarding for ${resourceName} #${resourceId}`;
      case 'APPROVE_DESIGN':
        return `Approved design "${resourceName}" (ID: ${resourceId})`;
      case 'REJECT_DESIGN':
        return `Rejected design "${resourceName}" (ID: ${resourceId})`;
      case 'FLAG_DESIGN':
        return `Flagged design "${resourceName}" (ID: ${resourceId}) for review`;
      case 'RESOLVE_FLAG':
        return `Resolved flag on design "${resourceName}" (ID: ${resourceId})`;
      case 'ACTIVATE_CUSTOMER':
        return `Activated customer account ${resourceName} #${resourceId}`;
      case 'DEACTIVATE_CUSTOMER':
        return `Deactivated customer account ${resourceName} #${resourceId}`;
      case 'CREATE_PLAN':
        return `Created new subscription plan "${resourceName}" (ID: ${resourceId})`;
      case 'UPDATE_PLAN':
        return `Updated subscription plan "${resourceName}" (ID: ${resourceId})`;
      case 'DELETE_PLAN':
        return `Deleted subscription plan "${resourceName}" (ID: ${resourceId})`;
      case 'CREATE_NOTIFICATION':
        return `Created notification "${resourceName}" (ID: ${resourceId})`;
      case 'UPDATE_SYSTEM_CONFIG':
        return `Updated system configuration settings`;
      case 'UPDATE_ORDER_STATUS':
        return `Updated order status for ${resourceName} #${resourceId}`;
      case 'INITIATE_REFUND':
        return `Initiated refund for transaction ${resourceName} #${resourceId}`;
      case 'CREATE_RAZORPAY_ACCOUNT':
        return `Created Razorpay linked account for designer ${resourceName} #${resourceId}`;
      case 'REJECT_ORDER':
        return `Rejected custom order ${resourceName} #${resourceId}`;
      case 'UPLOAD_DELIVERABLES':
        return `Uploaded deliverables for custom order ${resourceName} #${resourceId}`;
      default:
        return `${formatAction(log.action)} on ${resourceName} #${resourceId}`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted mt-1">Complete audit trail of all admin actions</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="card p-4">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            {/* Time Period Filters */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Time Period</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setTimeFilter(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeFilter === null
                      ? 'bg-primary text-white'
                      : 'bg-muted/20 text-muted hover:bg-muted/30'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimeFilter(7)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeFilter === 7
                      ? 'bg-primary text-white'
                      : 'bg-muted/20 text-muted hover:bg-muted/30'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeFilter(15)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeFilter === 15
                      ? 'bg-primary text-white'
                      : 'bg-muted/20 text-muted hover:bg-muted/30'
                  }`}
                >
                  Last 15 Days
                </button>
                <button
                  onClick={() => setTimeFilter(30)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeFilter === 30
                      ? 'bg-primary text-white'
                      : 'bg-muted/20 text-muted hover:bg-muted/30'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Activity Type Filter */}
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-2">Activity Type</label>
              <Dropdown
                options={actionFilterOptions}
                value={actionFilter}
                onChange={setActionFilter}
                placeholder="Filter by activity type"
              />
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
              {isLoading ? (
            <div className="card text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="card text-center py-12">
              <ClockIcon className="w-12 h-12 mx-auto text-muted mb-3" />
              <p className="text-muted">No activity logs found</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={log.id}
                className="card hover:shadow-lg transition-shadow relative overflow-hidden"
              >
                {/* Timeline Line */}
                {index < filteredLogs.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-border"></div>
                )}

                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{log.adminName}</span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getActionColor(
                            log.action
                          )}`}>
                            {formatAction(log.action)}
                          </span>
                        </div>
                        <p className="text-sm text-muted mb-2">
                          {getActionDescription(log)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <div className="flex items-center gap-1">
                            {getResourceIcon(log.resource)}
                            <span className="font-medium">{log.resource || 'Unknown'}</span>
                            <span className="font-mono">#{log.resourceId || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatRelativeTime(log.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">{log.ip}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted">
                          {formatDate(log.timestamp, 'long')}
                        </p>
                      </div>
                    </div>

                    {/* Before/After Data */}
                    {(log.beforeData || log.afterData) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.beforeData && Object.keys(log.beforeData).length > 0 && (
                            <div className="p-3 bg-muted/10 rounded-lg">
                              <p className="text-xs font-medium text-muted mb-2">Before</p>
                              <div className="space-y-1">
                                {Object.entries(log.beforeData).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-muted">{key}:</span>{' '}
                                    <span className="font-medium">
                                      {typeof value === 'object' 
                                        ? JSON.stringify(value) 
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.afterData && Object.keys(log.afterData).length > 0 && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs font-medium text-muted mb-2">After</p>
                              <div className="space-y-1">
                                {Object.entries(log.afterData).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-muted">{key}:</span>{' '}
                                    <span className="font-medium">
                                      {typeof value === 'object' 
                                        ? JSON.stringify(value) 
                                        : String(value)}
                      </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
