'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api';
import type {
  ScheduledTaskListItem,
  ScheduledTaskDetail,
  PeriodicTaskListItem,
} from '@/lib/api/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  StopIcon,
  ArrowPathIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  CubeIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const QUEUE_PREVIEW_LIMIT_OPTIONS = [25, 50, 100, 500, 1000] as const;
const MIN_COL_WIDTH = 64;
type TabId = 'history' | 'periodic' | 'all' | 'queue';

const HISTORY_DEFAULT_WIDTHS: Record<string, number> = {
  select: 44,
  task_id: 120,
  task_name: 200,
  status: 100,
  date_created: 152,
  date_done: 152,
  worker: 100,
  actions: 100,
};

const PERIODIC_DEFAULT_WIDTHS: Record<string, number> = {
  name: 160,
  task: 240,
  schedule: 180,
  status: 100,
  last_run: 152,
  run_count: 90,
};

function useResizableColumns(
  defaultWidths: Record<string, number>
): [Record<string, number>, (key: string, width: number) => void, (key: string, e: React.MouseEvent) => void] {
  const [widths, setWidths] = useState<Record<string, number>>(() => ({ ...defaultWidths }));
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const setWidth = useCallback((key: string, w: number) => {
    setWidths((prev) => ({ ...prev, [key]: Math.max(MIN_COL_WIDTH, w) }));
  }, []);

  const handleMouseDown = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();
      const current = widths[key] ?? defaultWidths[key];
      resizeRef.current = { key, startX: e.clientX, startWidth: current };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current || resizeRef.current.key !== key) return;
        const delta = moveEvent.clientX - resizeRef.current.startX;
        setWidths((prev) => {
          const currentW = prev[resizeRef.current!.key] ?? defaultWidths[resizeRef.current!.key];
          return {
            ...prev,
            [resizeRef.current!.key]: Math.max(MIN_COL_WIDTH, resizeRef.current!.startWidth + delta),
          };
        });
      };
      const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [defaultWidths, widths]
  );

  return [widths, setWidth, handleMouseDown];
}

export default function ScheduledTasksClient() {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('history');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [taskNameFilter, setTaskNameFilter] = useState('');
  const [periodicEnabledFilter, setPeriodicEnabledFilter] = useState<string>('');
  const [periodicTaskNameFilter, setPeriodicTaskNameFilter] = useState('');
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkRevoking, setIsBulkRevoking] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [allTasksFilter, setAllTasksFilter] = useState('');
  const [selectedRegisteredTaskName, setSelectedRegisteredTaskName] = useState<string | null>(null);
  const [queueLimit, setQueueLimit] = useState<number>(50);
  const [queueTaskNameFilter, setQueueTaskNameFilter] = useState('');

  const [historyWidths, , handleHistoryResize] = useResizableColumns(HISTORY_DEFAULT_WIDTHS);
  const [periodicWidths, , handlePeriodicResize] = useResizableColumns(PERIODIC_DEFAULT_WIDTHS);

  useEffect(() => {
    if (hasRole && !hasRole('Super Admin')) {
      toast.error('Access denied. This page is restricted to Super Admins only.');
      router.replace('/dashboard');
    }
  }, [hasRole, router]);

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['scheduled-tasks-overview'],
    queryFn: () => API.scheduledTasks.getOverview(),
    refetchInterval: 15000,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['scheduled-tasks-list', page, pageSize, statusFilter, taskNameFilter],
    queryFn: () =>
      API.scheduledTasks.getList({
        page,
        page_size: pageSize,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(taskNameFilter.trim() ? { task_name: taskNameFilter.trim() } : {}),
      }),
  });

  const { data: periodicOverviewData, isLoading: periodicOverviewLoading } = useQuery({
    queryKey: ['periodic-tasks-overview'],
    queryFn: () => API.periodicTasks.getOverview(),
    refetchInterval: 15000,
    enabled: activeTab === 'periodic',
  });

  const { data: periodicListData, isLoading: periodicListLoading } = useQuery({
    queryKey: ['periodic-tasks-list', page, pageSize, periodicEnabledFilter, periodicTaskNameFilter],
    queryFn: () =>
      API.periodicTasks.getList({
        page,
        page_size: pageSize,
        ...(periodicEnabledFilter === 'true' ? { enabled: true } : periodicEnabledFilter === 'false' ? { enabled: false } : {}),
        ...(periodicTaskNameFilter.trim() ? { task_name: periodicTaskNameFilter.trim() } : {}),
      }),
    enabled: activeTab === 'periodic',
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['scheduled-tasks-detail', detailTaskId],
    queryFn: () => API.scheduledTasks.getDetail(detailTaskId!),
    enabled: !!detailTaskId,
  });

  const { data: registeredTasksData, isLoading: registeredTasksLoading } = useQuery({
    queryKey: ['registered-tasks'],
    queryFn: () => API.scheduledTasks.getRegisteredTasks(),
  });

  const hasRedisQueue = overviewData?.data?.queue_name != null;
  const { data: queuePreviewData, isLoading: queuePreviewLoading } = useQuery({
    queryKey: ['scheduled-tasks-queue-preview', queueLimit, queueTaskNameFilter],
    queryFn: () =>
      API.scheduledTasks.getQueuePreview({
        limit: queueLimit,
        ...(queueTaskNameFilter.trim() ? { task_name: queueTaskNameFilter.trim() } : {}),
      }),
    refetchInterval: 20000,
    enabled: hasRedisQueue && activeTab === 'queue',
  });

  const overview = overviewData?.data;
  const tasks = listData?.data?.data ?? [];
  const pagination = listData?.data?.pagination;
  const detail = detailData?.data;
  const periodicOverview = periodicOverviewData?.data;
  const periodicTasks = periodicListData?.data?.data ?? [];
  const periodicPagination = periodicListData?.data?.pagination;
  const registeredTasks: Array<{ name: string; description: string | null }> =
    registeredTasksData?.data?.tasks ?? [];
  const filteredRegisteredTasks = allTasksFilter.trim()
    ? registeredTasks.filter((task) =>
        task.name.toLowerCase().includes(allTasksFilter.trim().toLowerCase())
      )
    : registeredTasks;
  const selectedTaskFromList = selectedRegisteredTaskName
    ? registeredTasks.find((t) => t.name === selectedRegisteredTaskName)
    : null;

  const handleRevoke = async (taskId: string) => {
    setRevokingId(taskId);
    try {
      const res = await API.scheduledTasks.revoke(taskId, true);
      if (res.success) {
        toast.success('Task revoke requested.');
        queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-overview'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-list'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-queue-preview'] });
        if (detailTaskId === taskId) setDetailTaskId(null);
      } else {
        toast.error(res.data?.error || res.error || 'Failed to revoke');
      }
    } catch {
      toast.error('Failed to revoke task');
    } finally {
      setRevokingId(null);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllTasksOnPage = () => {
    if (tasks.length === 0) return;
    const allSelected = tasks.every((t) => selectedTaskIds.has(t.task_id));
    if (allSelected) {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        tasks.forEach((t) => next.delete(t.task_id));
        return next;
      });
    } else {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        tasks.forEach((t) => next.add(t.task_id));
        return next;
      });
    }
  };

  const handleBulkRevoke = async () => {
    const revokableStatuses = ['PENDING', 'STARTED', 'RETRY'];
    const idsToRevoke = Array.from(selectedTaskIds).filter((id) => {
      const task = tasks.find((t) => t.task_id === id);
      return task && revokableStatuses.includes(task.status);
    });
    if (idsToRevoke.length === 0) {
      toast.error('No selected tasks can be revoked (only Pending, Started, or Retry).');
      return;
    }
    setIsBulkRevoking(true);
    try {
      const res = await API.scheduledTasks.bulkRevoke(idsToRevoke, true);
      const data = res.data;
      if (res.success && data) {
        const revoked = data.revoked ?? 0;
        const failed = data.failed ?? 0;
        if (revoked > 0) {
          toast.success(`Revoke requested for ${revoked} task(s).`);
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-overview'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-list'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-queue-preview'] });
          setSelectedTaskIds(new Set());
          if (detailTaskId && idsToRevoke.includes(detailTaskId)) setDetailTaskId(null);
        }
        if (failed > 0 && data.errors?.length) {
          toast.error(`${failed} failed: ${data.errors.map((e) => e.error).join('; ')}`);
        }
      } else {
        toast.error((data as { error?: string })?.error || res.error || 'Bulk revoke failed');
      }
    } catch {
      toast.error('Bulk revoke failed');
    } finally {
      setIsBulkRevoking(false);
    }
  };

  if (!hasRole('Super Admin')) {
    return null;
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Success
          </span>
        );
      case 'FAILURE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
            <XCircleIcon className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <ClockIcon className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'STARTED':
      case 'RETRY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
            <ArrowPathIcon className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return '—';
    try {
      const d = new Date(s);
      return d.toLocaleString();
    } catch {
      return s;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Scheduled Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Celery task history, periodic (Beat) schedule, and revoke running tasks.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-1" aria-label="Tabs">
            <button
              type="button"
              onClick={() => { setActiveTab('history'); setPage(1); }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
              Task history
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('periodic'); setPage(1); setSelectedTaskIds(new Set()); }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'periodic'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Periodic tasks
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('all'); setPage(1); setSelectedTaskIds(new Set()); }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CubeIcon className="w-4 h-4" />
              All tasks
            </button>
            {hasRedisQueue && (
              <button
                type="button"
                onClick={() => { setActiveTab('queue'); setPage(1); }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === 'queue'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <QueueListIcon className="w-4 h-4" />
                Broker queue (Redis)
              </button>
            )}
          </nav>
        </div>

        {/* Tab content: Task history */}
        {activeTab === 'history' && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {overviewLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card p-4 animate-pulse h-24" />
                ))
              ) : (
                <>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{overview?.active ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Running now</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reserved</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{overview?.reserved ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Claimed by workers</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduled</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{overview?.scheduled ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Countdown</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed (24h)</p>
                    <p className="text-2xl font-semibold text-destructive mt-1">{overview?.failed_last_24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last 24 hours</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success (24h)</p>
                    <p className="text-2xl font-semibold text-success mt-1">{overview?.success_last_24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last 24 hours</p>
                  </div>
                  {overview?.queue_name != null && (
                    <div className="rounded-xl border border-border/50 bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending in queue</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">{overview?.queue_pending ?? '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Redis · {overview.queue_name}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                  <option value="PENDING">Pending</option>
                  <option value="STARTED">Started</option>
                  <option value="RETRY">Retry</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">Task name</span>
                <select
                  value={taskNameFilter}
                  onChange={(e) => {
                    setTaskNameFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px] max-w-[320px]"
                  aria-label="Filter by task name"
                  disabled={registeredTasksLoading}
                >
                  <option value="">All tasks</option>
                  {registeredTasks.map((task) => (
                    <option key={task.name} value={task.name} title={task.name}>
                      {task.name.length > 48 ? `${task.name.slice(0, 45)}…` : task.name}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Show {n}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStatusFilter('');
                  setTaskNameFilter('');
                  setPage(1);
                  queryClient.invalidateQueries({ queryKey: ['scheduled-tasks-list'] });
                }}
              >
                Clear
              </Button>
              {!listLoading && pagination != null && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {pagination.total} result{pagination.total !== 1 ? 's' : ''}
                  {(statusFilter || taskNameFilter.trim()) && ' (filtered)'}
                </span>
              )}
            </div>

            {/* Bulk actions bar */}
            {selectedTaskIds.size > 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {selectedTaskIds.size} task(s) selected
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>
                    Clear selection
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkRevoke}
                    disabled={isBulkRevoking}
                  >
                    {isBulkRevoking ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <StopIcon className="w-4 h-4" />
                    )}
                    <span className="ml-1.5">
                      {isBulkRevoking ? 'Revoking…' : 'Revoke selected'}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Task list table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {listLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tasks found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed" style={{ minWidth: '100%' }}>
                    <colgroup>
                      <col style={{ width: historyWidths.select }} />
                      <col style={{ width: historyWidths.task_id }} />
                      <col style={{ width: historyWidths.task_name }} />
                      <col style={{ width: historyWidths.status }} />
                      <col style={{ width: historyWidths.date_created }} />
                      <col style={{ width: historyWidths.date_done }} />
                      <col style={{ width: historyWidths.worker }} />
                      <col style={{ width: historyWidths.actions }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium text-foreground border-l border-border first:border-l-0 w-11">
                          <input
                            type="checkbox"
                            checked={tasks.length > 0 && tasks.every((t) => selectedTaskIds.has(t.task_id))}
                            onChange={selectAllTasksOnPage}
                            className="rounded border-border"
                            aria-label="Select all on page"
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Task ID</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('task_id', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Task name</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('task_name', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Status</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('status', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Created</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('date_created', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Done</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('date_done', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Worker</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('worker', e)}
                          />
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Actions</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handleHistoryResize('actions', e)}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t: ScheduledTaskListItem) => (
                        <tr key={t.task_id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-4 border-l border-border first:border-l-0 w-11">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.has(t.task_id)}
                              onChange={() => toggleTaskSelection(t.task_id)}
                              className="rounded border-border"
                              aria-label={`Select task ${t.task_id}`}
                            />
                          </td>
                          <td className="py-2 px-4 font-mono text-xs text-muted-foreground break-all border-l border-border" title={t.task_id}>
                            {t.task_id}
                          </td>
                          <td className="py-2 px-4 text-foreground truncate border-l border-border" title={t.task_name}>
                            {t.task_name || '—'}
                          </td>
                          <td className="py-2 px-4 border-l border-border">{statusBadge(t.status)}</td>
                          <td className="py-2 px-4 text-muted-foreground whitespace-nowrap border-l border-border">{formatDate(t.date_created)}</td>
                          <td className="py-2 px-4 text-muted-foreground whitespace-nowrap border-l border-border">{formatDate(t.date_done)}</td>
                          <td className="py-2 px-4 text-muted-foreground truncate border-l border-border">{t.worker || '—'}</td>
                          <td className="py-2 px-4 text-right border-l border-border">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailTaskId(t.task_id)}
                                title="View detail"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              {(t.status === 'PENDING' || t.status === 'STARTED' || t.status === 'RETRY') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevoke(t.task_id)}
                                  disabled={revokingId === t.task_id}
                                  title="Stop task"
                                >
                                  {revokingId === t.task_id ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <StopIcon className="w-4 h-4 text-destructive" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.total > pageSize && (
                <div className="flex items-center justify-between py-3 px-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab content: All tasks (registered) */}
        {activeTab === 'all' && (
          <>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-sm text-muted-foreground mb-3">
                All Celery task names registered in this application. Use Task history to see runs; use Periodic tasks to see the Beat schedule.
              </p>
              <input
                type="text"
                placeholder="Search task name..."
                value={allTasksFilter}
                onChange={(e) => setAllTasksFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[240px] mb-4"
                aria-label="Search registered tasks"
              />
            </div>
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {registeredTasksLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading registered tasks...</div>
              ) : filteredRegisteredTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {registeredTasks.length === 0
                    ? 'No registered tasks found.'
                    : 'No tasks match your search.'}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border/50">
                      <tr className="bg-background">
                        <th className="text-left py-3 px-4 font-medium text-foreground bg-background">#</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground bg-background">Task name</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground bg-background">Description</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground bg-background w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegisteredTasks.map((task, index) => {
                        const desc = task.description || '';
                        const truncated = desc.length > 100 ? desc.slice(0, 100).trim() + '…' : desc;
                        return (
                          <tr key={task.name} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-2 px-4 text-muted-foreground font-mono text-xs w-12">{index + 1}</td>
                            <td className="py-2 px-4 text-foreground font-mono text-xs break-all" title={task.name}>
                              {task.name}
                            </td>
                            <td className="py-2 px-4 text-muted-foreground text-xs max-w-md truncate" title={desc || undefined}>
                              {truncated || '—'}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRegisteredTaskName(task.name)}
                                title="View task details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!registeredTasksLoading && registeredTasks.length > 0 && (
                <div className="py-2 px-4 border-t border-border/50 text-sm text-muted-foreground">
                  {filteredRegisteredTasks.length === registeredTasks.length
                    ? `${registeredTasks.length} task(s)`
                    : `${filteredRegisteredTasks.length} of ${registeredTasks.length} task(s) (filtered)`}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab content: Broker queue (Redis) */}
        {activeTab === 'queue' && hasRedisQueue && (
          <>
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h2 className="text-base font-semibold text-foreground">Broker queue (Redis)</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Read-only peek at messages in the queue. Total in queue: {queuePreviewData?.data?.total ?? (queuePreviewLoading ? '…' : overview?.queue_pending ?? '—')}
                  {queueTaskNameFilter.trim() && ' (filtered by task name)'}
                </p>
              </div>
              <div className="p-4 border-b border-border/50 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">Show</span>
                  <select
                    value={queueLimit}
                    onChange={(e) => setQueueLimit(Number(e.target.value))}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Number of results"
                  >
                    {QUEUE_PREVIEW_LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} results
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">Filter by task name</span>
                  <input
                    type="text"
                    placeholder="e.g. common.tasks or send_email"
                    value={queueTaskNameFilter}
                    onChange={(e) => setQueueTaskNameFilter(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary flex-1 max-w-md"
                    aria-label="Filter by task name (substring)"
                  />
                </label>
                {queueTaskNameFilter.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueueTaskNameFilter('')}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              {queuePreviewLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading queue preview...</div>
              ) : queuePreviewData?.data?.sample?.length ? (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Task name</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Task ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queuePreviewData.data.sample.map((item, idx) => (
                        <tr key={idx} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono text-xs break-all">{item.task_name ?? '—'}</td>
                          <td className="py-1.5 px-3 font-mono text-xs break-all">{item.task_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {queueTaskNameFilter.trim()
                    ? 'No matching messages in the first 5000 queue entries.'
                    : 'Queue is empty or preview unavailable.'}
                </div>
              )}
              {!queuePreviewLoading && queuePreviewData?.data && (
                <div className="py-2 px-4 border-t border-border/50 text-sm text-muted-foreground">
                  Showing {queuePreviewData.data.sample?.length ?? 0} of {queuePreviewData.data.total ?? 0} in queue
                  {queueTaskNameFilter.trim() ? ` (filter: task name contains "${queueTaskNameFilter.trim()}")` : null}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab content: Periodic tasks */}
        {activeTab === 'periodic' && (
          <>
            {/* Periodic overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {periodicOverviewLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card p-4 animate-pulse h-24" />
                ))
              ) : (
                <>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{periodicOverview?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Periodic tasks</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enabled</p>
                    <p className="text-2xl font-semibold text-success mt-1">{periodicOverview?.enabled ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Active in Beat</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Info</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recurring schedules (Celery Beat). Edit in Django admin to create or change schedules.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Periodic filters */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">Status</span>
                <select
                  value={periodicEnabledFilter}
                  onChange={(e) => {
                    setPeriodicEnabledFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All</option>
                  <option value="true">Enabled only</option>
                  <option value="false">Disabled only</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">Task name</span>
                <select
                  value={periodicTaskNameFilter}
                  onChange={(e) => {
                    setPeriodicTaskNameFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px] max-w-[320px]"
                  aria-label="Filter by task name"
                  disabled={registeredTasksLoading}
                >
                  <option value="">All tasks</option>
                  {registeredTasks.map((task) => (
                    <option key={task.name} value={task.name} title={task.name}>
                      {task.name.length > 48 ? `${task.name.slice(0, 45)}…` : task.name}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Show {n}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPeriodicEnabledFilter('');
                  setPeriodicTaskNameFilter('');
                  setPage(1);
                  queryClient.invalidateQueries({ queryKey: ['periodic-tasks-list'] });
                }}
              >
                Clear
              </Button>
              {!periodicListLoading && periodicPagination != null && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {periodicPagination.total} result{periodicPagination.total !== 1 ? 's' : ''}
                  {(periodicEnabledFilter || periodicTaskNameFilter.trim()) && ' (filtered)'}
                </span>
              )}
            </div>

            {/* Periodic tasks table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {periodicListLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading periodic tasks...</div>
              ) : periodicTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No periodic tasks found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed" style={{ minWidth: '100%' }}>
                    <colgroup>
                      <col style={{ width: periodicWidths.name }} />
                      <col style={{ width: periodicWidths.task }} />
                      <col style={{ width: periodicWidths.schedule }} />
                      <col style={{ width: periodicWidths.status }} />
                      <col style={{ width: periodicWidths.last_run }} />
                      <col style={{ width: periodicWidths.run_count }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border first:border-l-0">
                          <span>Name</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('name', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Task</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('task', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Schedule</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('schedule', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Status</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('status', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Last run</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('last_run', e)}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground relative select-none border-l border-border">
                          <span>Run count</span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none bg-muted-foreground/50 hover:bg-primary/50 active:bg-primary/70"
                            style={{ marginRight: '-2px' }}
                            onMouseDown={(e) => handlePeriodicResize('run_count', e)}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodicTasks.map((pt: PeriodicTaskListItem) => (
                        <tr key={pt.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-4 font-medium text-foreground truncate border-l border-border first:border-l-0">{pt.name || '—'}</td>
                          <td className="py-2 px-4 text-muted-foreground truncate font-mono text-xs border-l border-border" title={pt.task}>
                            {pt.task || '—'}
                          </td>
                          <td className="py-2 px-4 text-muted-foreground truncate border-l border-border">{pt.schedule_display}</td>
                          <td className="py-2 px-4 border-l border-border">
                            {pt.enabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                <XCircleIcon className="w-3.5 h-3.5" />
                                Disabled
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-muted-foreground whitespace-nowrap border-l border-border">{formatDate(pt.last_run_at)}</td>
                          <td className="py-2 px-4 text-muted-foreground border-l border-border">{pt.total_run_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {periodicPagination && periodicPagination.total > pageSize && (
                <div className="flex items-center justify-between py-3 px-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Page {periodicPagination.page} of {periodicPagination.totalPages} ({periodicPagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={periodicPagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={periodicPagination.page >= periodicPagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail modal - opaque overlay and solid panel */}
      <AnimatePresence>
        {detailTaskId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setDetailTaskId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Task detail</h2>
                <button
                  type="button"
                  onClick={() => setDetailTaskId(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {detailLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : detail ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Task ID</p>
                        <p className="font-mono text-xs break-all">{detail.task_id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p>{statusBadge(detail.status)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Task name</p>
                        <p className="break-all">{detail.task_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Worker</p>
                        <p>{detail.worker || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{formatDate(detail.date_created)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Done</p>
                        <p>{formatDate(detail.date_done)}</p>
                      </div>
                    </div>
                    {(detail.traceback && detail.status === 'FAILURE') && (
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">Traceback</p>
                        <pre className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                          {detail.traceback}
                        </pre>
                      </div>
                    )}
                    {detail.result != null && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Result</p>
                        <pre className="rounded-lg bg-muted/30 border border-border p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                          {typeof detail.result === 'string'
                            ? detail.result
                            : JSON.stringify(detail.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    {(detail.task_args || detail.task_kwargs) && (
                      <div className="grid grid-cols-2 gap-2">
                        {detail.task_args && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Args</p>
                            <pre className="text-xs font-mono break-all bg-muted/20 p-2 rounded">{detail.task_args}</pre>
                          </div>
                        )}
                        {detail.task_kwargs && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Kwargs</p>
                            <pre className="text-xs font-mono break-all bg-muted/20 p-2 rounded">{detail.task_kwargs}</pre>
                          </div>
                        )}
                      </div>
                    )}
                    {(detail.status === 'PENDING' || detail.status === 'STARTED' || detail.status === 'RETRY') && (
                      <div className="pt-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(detail.task_id)}
                          disabled={revokingId === detail.task_id}
                        >
                          {revokingId === detail.task_id ? (
                            <>
                              <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                              Revoking…
                            </>
                          ) : (
                            <>
                              <StopIcon className="w-4 h-4 mr-1" />
                              Stop task
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Could not load task.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registered task detail modal (All tasks tab) */}
      <AnimatePresence>
        {selectedRegisteredTaskName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedRegisteredTaskName(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Task details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedRegisteredTaskName(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {selectedTaskFromList ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Task name</p>
                      <p className="font-mono text-sm break-all text-foreground">{selectedTaskFromList.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">What it does</p>
                      {selectedTaskFromList.description ? (
                        <pre className="rounded-lg bg-muted/30 border border-border p-3 text-sm whitespace-pre-wrap font-sans text-foreground max-h-96 overflow-y-auto">
                          {selectedTaskFromList.description}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground italic">No description available.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Task not found in list.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
