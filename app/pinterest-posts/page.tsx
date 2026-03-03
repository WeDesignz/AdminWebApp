'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  PhotoIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

type StatusFilter = 'all' | 'success' | 'failed' | 'pending';

interface PinterestPostRow {
  id: number;
  product_id: number;
  product_title: string;
  product_thumbnail_url: string | null;
  status: string;
  error_message: string | null;
  pin_url: string | null;
  pins_data: Record<string, { id?: string; url?: string }>;
  created_at: string;
  posted_at: string | null;
}

export default function PinterestPostsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [detailsPost, setDetailsPost] = useState<PinterestPostRow | null>(null);
  const [previewPost, setPreviewPost] = useState<PinterestPostRow | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());
  const [hoveredThumbId, setHoveredThumbId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isReady = isHydrated && isAuthenticated && !!accessToken;

  const { data: postsResponse, isLoading } = useQuery({
    queryKey: ['pinterest-posts', statusFilter, page],
    queryFn: () =>
      API.getPinterestPosts({
        status: statusFilter,
        page,
        limit: 20,
      }),
    enabled: isReady,
  });

  const { data: pinterestStatus } = useQuery({
    queryKey: ['pinterest-status'],
    queryFn: () => API.getPinterestStatus(),
    enabled: isReady,
    refetchInterval: 60000,
  });

  const { data: statsResponse } = useQuery({
    queryKey: ['pinterest-posts-stats'],
    queryFn: () => API.getPinterestPostsStats(),
    enabled: isReady,
  });

  const counts = statsResponse?.data;

  const posts = postsResponse?.data?.data ?? [];
  const pagination = postsResponse?.data?.pagination;
  const isPinterestReady =
    pinterestStatus?.data?.is_configured && pinterestStatus?.data?.is_token_valid;

  const handlePostAgain = async (postId: number) => {
    if (!isPinterestReady) {
      toast.error('Configure Pinterest in Settings first.');
      return;
    }
    setPostingId(postId);
    try {
      const res = await API.retryPinterestPost(postId);
      if (res.success) {
        toast.success('Posted to Pinterest');
        queryClient.invalidateQueries({ queryKey: ['pinterest-posts'] });
        queryClient.invalidateQueries({ queryKey: ['pinterest-posts-stats'] });
        queryClient.invalidateQueries({ queryKey: ['pinterest-status'] });
      } else {
        toast.error(res.error || 'Post failed');
      }
    } catch {
      toast.error('Post failed');
    } finally {
      setPostingId(null);
    }
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'pending', label: 'Pending' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Posted
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
            <XCircleIcon className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            Pending
          </span>
        );
    }
  };

  if (!isHydrated || !isReady) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 bg-clip-text text-transparent">
            Pinterest Posts
          </h1>
          <p className="text-muted mt-1">View and manage designs posted to Pinterest</p>
        </div>

        {pinterestStatus?.data && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              isPinterestReady
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPinterestReady ? (
                    <>
                      <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">Pinterest Connected</p>
                        <p className="text-sm text-green-700 dark:text-green-300 opacity-80">
                          {pinterestStatus.data.board_name
                            ? `Board: ${pinterestStatus.data.board_name}`
                            : 'Designs can be posted to Pinterest'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">Pinterest Not Configured</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 opacity-80">
                          Configure in Settings to enable posting.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {!isPinterestReady && (
                  <Button
                    onClick={() => (window.location.href = '/settings?tab=pinterest')}
                    size="sm"
                    variant="outline"
                  >
                    Configure Pinterest
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Rate limit statistics tile - always visible when status is loaded */}
        <div className="card p-4 rounded-xl border border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-3">Pinterest API rate limit</h3>
          {!pinterestStatus?.data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !isPinterestReady ? (
            <p className="text-sm text-muted-foreground">Connect Pinterest in Settings to see rate limit statistics.</p>
          ) : pinterestStatus.data.rate_limit_retry_after_at ? (
            <div className="text-sm space-y-2">
              <p className="font-medium text-amber-600 dark:text-amber-400">Currently rate limited</p>
              <p className="text-muted-foreground">
                Safe to retry after: <span className="font-medium text-foreground">{new Date(pinterestStatus.data.rate_limit_retry_after_at).toLocaleString()}</span>
              </p>
            </div>
          ) : pinterestStatus.data.rate_limit_limit != null && pinterestStatus.data.rate_limit_remaining != null ? (
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <div className="rounded-lg bg-muted/50 dark:bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Requests sent</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.max(0, pinterestStatus.data.rate_limit_limit - pinterestStatus.data.rate_limit_remaining)}
                  <span className="text-sm font-normal text-muted-foreground"> / {pinterestStatus.data.rate_limit_limit}</span>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 dark:bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Requests remaining</p>
                <p className="text-lg font-semibold text-foreground">{pinterestStatus.data.rate_limit_remaining}</p>
              </div>
              <div className="rounded-lg bg-muted/50 dark:bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Resets at</p>
                <p className="text-sm font-medium text-foreground">
                  {pinterestStatus.data.rate_limit_reset_at
                    ? new Date(pinterestStatus.data.rate_limit_reset_at).toLocaleString()
                    : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unknown until the next Pinterest API request is made.</p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => {
                const count = counts ? counts[opt.value] ?? 0 : null;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                    {count !== null && ` (${count})`}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <PhotoIcon className="w-16 h-16 mx-auto text-muted mb-4 opacity-50" />
              <p className="text-muted">No Pinterest posts match the selected filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Design</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Posted at</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border"
                            onMouseEnter={() => setHoveredThumbId(row.id)}
                            onMouseLeave={() => setHoveredThumbId(null)}
                          >
                            {row.product_thumbnail_url && !brokenImageIds.has(row.id) ? (
                              <img
                                src={row.product_thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={() =>
                                  setBrokenImageIds((prev) => new Set(prev).add(row.id))
                                }
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted">
                                <PhotoIcon className="w-7 h-7" />
                              </div>
                            )}
                            {(row.product_thumbnail_url && !brokenImageIds.has(row.id)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPost(row);
                                }}
                                className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg cursor-pointer hover:bg-black/60 transition-opacity duration-200 ${
                                  hoveredThumbId === row.id ? 'opacity-100' : 'opacity-0'
                                }`}
                                title="Preview design"
                              >
                                <MagnifyingGlassPlusIcon className="w-7 h-7 text-white" />
                              </button>
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[200px]" title={row.product_title}>
                            {row.product_title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{getStatusBadge(row.status)}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {row.posted_at
                          ? new Date(row.posted_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {row.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => setDetailsPost(row)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="View error details"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                          )}
                          {row.status !== 'success' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePostAgain(row.id)}
                              disabled={postingId === row.id || !isPinterestReady}
                            >
                              {postingId === row.id ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              ) : (
                                'Post again'
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

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {previewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-sm font-medium text-white truncate max-w-[80%]" title={previewPost.product_title}>
                  {previewPost.product_title}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewPost(null)}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                  aria-label="Close preview"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-muted border border-border shadow-2xl flex-1 min-h-0 flex items-center justify-center">
                {previewPost.product_thumbnail_url ? (
                  <img
                    src={previewPost.product_thumbnail_url}
                    alt={previewPost.product_title}
                    className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                  />
                ) : (
                  <div className="py-24 text-muted-foreground">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>No image available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailsPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setDetailsPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Error details</h3>
                <button
                  type="button"
                  onClick={() => setDetailsPost(null)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-2 truncate" title={detailsPost.product_title}>
                {detailsPost.product_title}
              </p>
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive dark:text-destructive/95 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {detailsPost.error_message || 'No error message stored.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
