'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { 
  CameraIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectedProduct {
  id: string;
  title: string;
  thumbnailUrl: string;
  category: string;
  mediaFiles: {
    id: string;
    url: string;
    type: 'mockup' | 'jpg' | 'png';
    fileName: string;
  }[];
  selectedMediaType: 'mockup' | 'jpg';
}

const PAGE_SIZE_STORAGE_KEY = 'instagram-posts-pageSize';
const INSTAGRAM_FILTER_STORAGE_KEY = 'instagram-posts-instagramFilter';
const VALID_PAGE_SIZES = [20, 50, 100, 200, 500];

function getDefaultPostedFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function getDefaultPostedToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStoredPageSize(): number {
  if (typeof window === 'undefined') return 20;
  try {
    const v = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (v !== null) {
      const n = Number(v);
      if (VALID_PAGE_SIZES.includes(n)) return n;
    }
  } catch {}
  return 20;
}

function getStoredInstagramFilter(): 'all' | 'posted' | 'not_posted' {
  if (typeof window === 'undefined') return 'all';
  try {
    const v = localStorage.getItem(INSTAGRAM_FILTER_STORAGE_KEY);
    if (v === 'all' || v === 'posted' || v === 'not_posted') return v;
  } catch {}
  return 'all';
}

export default function InstagramPostsPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'posted'>('create');
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(getStoredPageSize);
  const [statusFilter, setStatusFilter] = useState('approved');
  const [instagramFilter, setInstagramFilter] = useState<'all' | 'posted' | 'not_posted'>(getStoredInstagramFilter);
  const [postedFromDate, setPostedFromDate] = useState(getDefaultPostedFromDate);
  const [postedToDate, setPostedToDate] = useState(getDefaultPostedToDate);
  const [postedPage, setPostedPage] = useState(1);
  const queryClient = useQueryClient();

  // Bulk upload state
  const [bulkPostType, setBulkPostType] = useState<'post' | 'story'>('post');
  const [bulkCaption, setBulkCaption] = useState('');
  const [bulkMediaType, setBulkMediaType] = useState<'mockup' | 'jpg'>('mockup');
  const [isBulkPosting, setIsBulkPosting] = useState(false);
  const [bulkPostProgress, setBulkPostProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
  }>({ total: 0, completed: 0, failed: 0 });

  // Wait for auth store to hydrate
  const { isAuthenticated, accessToken } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isReady = isHydrated && isAuthenticated && !!accessToken;

  // Fetch products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-for-instagram', searchQuery, page, pageSize, statusFilter],
    queryFn: () => API.getDesigns({ 
      status: statusFilter || 'approved',
      search: searchQuery,
      page,
      limit: pageSize
    }),
    enabled: isReady,
  });

  // Fetch Instagram status
  const { data: instagramStatus } = useQuery({
    queryKey: ['instagram-status'],
    queryFn: () => API.getInstagramStatus(),
    enabled: isReady,
    refetchInterval: 60000,
  });
  const statusData = instagramStatus?.data;
  const lastPostCreatedAt = statusData?.last_post_created_at;
  const minDelaySeconds = statusData?.min_delay_seconds ?? 10;
  const postsToday = statusData?.posts_today ?? 0;
  const postsTodayLimit = statusData?.posts_today_limit ?? 25;
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  useEffect(() => {
    if (!lastPostCreatedAt || !minDelaySeconds) {
      setCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(lastPostCreatedAt).getTime()) / 1000;
      const remaining = Math.ceil(minDelaySeconds - elapsed);
      setCooldownSeconds(remaining > 0 ? remaining : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastPostCreatedAt, minDelaySeconds]);

  // Product numbers that have at least one success in instagram_post table = posted (any 1 success counts)
  const { data: instagramPostsData } = useQuery({
    queryKey: ['instagram-posted-product-numbers'],
    queryFn: async () => {
      const res = await API.getInstagramPostedProductNumbers();
      if (!res.success || !res.data) return [];
      const payload = res.data as { product_numbers?: string[] };
      const list = Array.isArray(payload?.product_numbers) ? payload.product_numbers : [];
      return list.map((pn) => String(pn).trim()).filter(Boolean);
    },
    enabled: isReady,
  });

  const postedProductNumbers = useMemo(() => {
    if (!instagramPostsData || !Array.isArray(instagramPostsData)) return new Set<string>();
    return new Set(instagramPostsData);
  }, [instagramPostsData]);

  // Check selected product image size for Meta 8 MB limit (only when connected and product selected)
  const { data: imageCheck } = useQuery({
    queryKey: ['instagram-check-image', selectedProduct?.id, selectedProduct?.selectedMediaType],
    queryFn: () => API.getInstagramCheckImage(selectedProduct!.id, selectedProduct!.selectedMediaType),
    enabled: isReady && !!selectedProduct && !!instagramStatus?.data?.is_configured,
  });

  // Posted tab: fetch success posts in date range, sorted by posted_at (recent first)
  const { data: postedPostsData, isLoading: isLoadingPostedPosts } = useQuery({
    queryKey: ['instagram-posts', 'posted', postedFromDate, postedToDate, postedPage],
    queryFn: () =>
      API.getInstagramPosts({
        status: 'success',
        from_date: postedFromDate,
        to_date: postedToDate,
        page: postedPage,
        limit: 20,
      }),
    enabled: isReady && activeTab === 'posted',
  });

  const handleSelectProduct = (product: any) => {
    // Extract media files - check both files and media_files (raw API response)
    // Also check if there's a preview_files or other file arrays
    const productFiles = product.files || product.media_files || product.preview_files || [];
    
    // Extract media files and categorize them
    const mediaFiles = productFiles.map((file: any) => {
      let type: 'mockup' | 'jpg' | 'png' = 'jpg';
      
      // Check if it's a mockup - check multiple sources
      // Get filename from multiple possible sources
      let fileName = file.name || file.fileName || file.file_name || '';
      const fileUrl = file.url || file.file || '';
      
      // If filename is empty, try to extract from URL
      if (!fileName && fileUrl) {
        const urlParts = fileUrl.split('/');
        fileName = urlParts[urlParts.length - 1] || '';
        // Remove query parameters if any
        fileName = fileName.split('?')[0];
      }
      
      const fileNameLower = fileName.toLowerCase();
      const urlLower = fileUrl.toLowerCase();
      
      // Check isMockup flag (from API) - check both camelCase and snake_case
      const isMockupFlag = file.isMockup === true || 
                          file.isMockup === 'true' || 
                          file.isMockup === 1 ||
                          file.is_mockup === true ||
                          file.is_mockup === 'true' ||
                          file.is_mockup === 1;
      
      // Check filename for mockup - handle patterns like "WDG00000002_MOCKUP.jpg"
      // This should catch: mockup.jpg, WDG00000002_MOCKUP.jpg, product_mockup.png, etc.
      const baseName = fileNameLower.split('.')[0];
      // More comprehensive mockup detection - check for various patterns
      const isMockupFromName = 
        // Exact match
        baseName === 'mockup' || 
        // Ends with _mockup (e.g., WDG00000002_mockup)
        baseName.endsWith('_mockup') ||
        // Contains _mockup anywhere (e.g., product_mockup_v2)
        baseName.includes('_mockup') ||
        // Full filename contains _mockup. (with extension)
        fileNameLower.includes('_mockup.') ||
        // URL path contains mockup (but not in AVIF conversion paths)
        (urlLower.includes('/mockup') || urlLower.includes('_mockup')) && !urlLower.includes('_mockup.avif') ||
        // Filename contains "mockup" (but exclude AVIF files and other non-mockup patterns)
        (fileNameLower.includes('mockup') && 
         !fileNameLower.includes('avif') && 
         !fileNameLower.includes('_png') && 
         !fileNameLower.includes('_jpg'));
      
      const isMockup = isMockupFlag || isMockupFromName;
      
      if (isMockup) {
        type = 'mockup';
      } else if (fileNameLower.endsWith('.png')) {
        type = 'png';
      } else if (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
        type = 'jpg';
      }

      return {
        id: file.id || String(file.id),
        url: file.url || file.file,
        type,
        fileName: fileName,
      };
    }).filter((f: any) => ['mockup', 'jpg', 'png'].includes(f.type));

    // Filter to only include mockup and jpg files
    const filteredMediaFiles = mediaFiles.filter((f: any) => f.type === 'mockup' || f.type === 'jpg');
    
    if (filteredMediaFiles.length === 0) {
      toast.error('This product has no suitable images (mockup or jpg)');
      return;
    }
    
    // Use filtered media files
    const finalMediaFiles = filteredMediaFiles;

    // Determine default media type (prefer mockup, then jpg)
    let defaultMediaType: 'mockup' | 'jpg' = 'jpg';
    const hasMockup = finalMediaFiles.find((f: any) => f.type === 'mockup');
    const hasJpg = finalMediaFiles.find((f: any) => f.type === 'jpg');
    
    if (hasMockup) {
      defaultMediaType = 'mockup';
    } else if (hasJpg) {
      defaultMediaType = 'jpg';
    }

    const newProduct: SelectedProduct = {
      id: product.id,
      title: product.title,
      thumbnailUrl: product.thumbnailUrl,
      category: product.category,
      mediaFiles: finalMediaFiles,
      selectedMediaType: defaultMediaType,
    };

    if (uploadMode === 'single') {
      setSelectedProduct(newProduct);
      setCaption(''); // Reset caption when selecting new product
      toast.success('Product selected');
    } else {
      // Bulk mode: add to selected products list
      setSelectedProducts(prev => {
        // Check if already selected
        if (prev.find(p => p.id === newProduct.id)) {
          toast.error('Product already selected');
          return prev;
        }
        toast.success('Product added to bulk upload');
        return [...prev, newProduct];
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedProduct(null);
    setCaption('');
    setPostType('post'); // Reset to post type
  };

  const handleMediaTypeChange = (mediaType: 'mockup' | 'jpg') => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, selectedMediaType: mediaType });
    }
  };

  const handlePost = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }

    // Only require caption for posts, not stories
    if (postType === 'post' && !caption.trim()) {
      toast.error('Please add a caption for your Instagram post');
      return;
    }

    setIsPosting(true);
    try {
      const post = {
        productId: selectedProduct.id,
        mediaType: selectedProduct.selectedMediaType,
        caption: postType === 'post' ? caption.trim() : '', // Empty caption for stories
        postType,
      };

      const response = await API.postToInstagram(post);
      
      if (response.success) {
        toast.success(`Successfully queued ${postType} for Instagram!`, {
          icon: '✅',
          duration: 4000,
        });
        handleClearSelection();
        queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-posted-product-numbers'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-status'] });
      } else {
        toast.error(response.error || 'Failed to post to Instagram');
        queryClient.invalidateQueries({ queryKey: ['instagram-status'] });
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while posting to Instagram');
      queryClient.invalidateQueries({ queryKey: ['instagram-status'] });
    } finally {
      setIsPosting(false);
    }
  };

  const handleBulkPost = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    if (bulkPostType === 'post' && !bulkCaption.trim()) {
      toast.error('Please add a caption for Instagram posts');
      return;
    }

    setIsBulkPosting(true);
    setBulkPostProgress({
      total: selectedProducts.length,
      completed: 0,
      failed: 0,
    });

    const results: { success: boolean; productId: string; error?: string }[] = [];

    // Post each product sequentially (to avoid rate limiting)
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      
      try {
        const post = {
          productId: product.id,
          mediaType: bulkMediaType, // Use global media type
          caption: bulkPostType === 'post' ? bulkCaption.trim() : '',
          postType: bulkPostType,
        };

        const response = await API.postToInstagram(post);
        
        if (response.success) {
          results.push({ success: true, productId: product.id });
          setBulkPostProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
          }));
        } else {
          results.push({
            success: false,
            productId: product.id,
            error: response.error || 'Unknown error',
          });
          setBulkPostProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        }
      } catch (error: any) {
        results.push({
          success: false,
          productId: product.id,
          error: error.message || 'An error occurred',
        });
        setBulkPostProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
        }));
      }

      // Small delay between posts to avoid rate limiting
      if (i < selectedProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsBulkPosting(false);

    // Show summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount === selectedProducts.length) {
      toast.success(`Successfully queued all ${successCount} posts!`, {
        icon: '✅',
        duration: 5000,
      });
    } else if (successCount > 0) {
      toast.success(
        `Queued ${successCount} posts successfully. ${failCount} failed.`,
        {
          icon: '⚠️',
          duration: 5000,
        }
      );
    } else {
      toast.error('All posts failed. Please try again.', {
        duration: 5000,
      });
    }

    // Clear selections and refresh
    setSelectedProducts([]);
    queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
    queryClient.invalidateQueries({ queryKey: ['instagram-posted-product-numbers'] });
    queryClient.invalidateQueries({ queryKey: ['instagram-status'] });
  };

  const getSelectedImageUrl = () => {
    if (!selectedProduct) return '';
    const mediaFile = selectedProduct.mediaFiles.find(f => f.type === selectedProduct.selectedMediaType);
    return mediaFile?.url || selectedProduct.thumbnailUrl;
  };

  const getAvailableMediaTypes = () => {
    if (!selectedProduct) return [];
    const types = new Set(selectedProduct.mediaFiles.map(f => f.type));
    // Filter to only show mockup and jpg options (exclude png)
    const availableTypes = Array.from(types).filter(t => t === 'mockup' || t === 'jpg') as ('mockup' | 'jpg')[];
    // If no mockup or jpg available, return empty array
    return availableTypes;
  };

  const statusFilterOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
  ];

  const filteredProducts = useMemo(() => {
    const list = productsData?.data ?? [];
    if (instagramFilter === 'all') return list;
    return list.filter((p: { productNumber?: string; product_number?: string }) => {
      const pn = String((p.productNumber ?? p.product_number ?? '')).trim();
      const isPosted = pn !== '' && postedProductNumbers.has(pn);
      return instagramFilter === 'posted' ? isPosted : !isPosted;
    });
  }, [productsData?.data, instagramFilter, postedProductNumbers]);

  // Calculate counts from Instagram post table: success → posted (by product_number)
  const instagramCounts = useMemo(() => {
    const list = productsData?.data ?? [];
    let posted = 0;
    let notPosted = 0;
    list.forEach((p: { productNumber?: string; product_number?: string }) => {
      const pn = String((p.productNumber ?? p.product_number ?? '')).trim();
      if (pn !== '' && postedProductNumbers.has(pn)) {
        posted++;
      } else {
        notPosted++;
      }
    });
    return { posted, notPosted, total: list.length };
  }, [productsData?.data, postedProductNumbers]);

  if (!isHydrated || !isReady) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isInstagramReady = instagramStatus?.data?.is_configured && instagramStatus?.data?.is_token_valid;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
              Instagram Posts
            </h1>
            <p className="text-muted mt-1">Create and share your designs on Instagram</p>
          </div>
          {/* Right: Instagram connection status */}
          {instagramStatus?.data && (
            <div className="flex items-center gap-2 shrink-0">
              {isInstagramReady ? (
                <div
                  className="inline-flex items-center rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-3 py-1.5"
                  title="Your content will be published to Instagram"
                >
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">🟢 Connected</span>
                </div>
              ) : (
                <div
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5"
                  title="Connect Instagram in Settings to enable posting"
                >
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">🔴 Not connected</span>
                  <span className="w-px h-4 bg-amber-200 dark:bg-amber-700" aria-hidden />
                  <button
                    type="button"
                    onClick={() => window.location.href = '/settings?tab=instagram'}
                    className="text-sm font-semibold text-amber-800 dark:text-amber-200 hover:text-amber-600 dark:hover:text-amber-100 underline underline-offset-2 decoration-amber-400 dark:decoration-amber-600 hover:decoration-amber-600 dark:hover:decoration-amber-400 transition-colors"
                  >
                    Connect Instagram
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instagram status & rate limit card */}
        {instagramStatus?.data && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              isInstagramReady
                ? 'bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {isInstagramReady ? (
                    <>
                      <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-semibold text-purple-900 dark:text-purple-100">Instagram Connected</p>
                        <p className="text-sm text-purple-700 dark:text-purple-300 opacity-80">
                          {instagramStatus.data.username
                            ? `@${instagramStatus.data.username}`
                            : 'Ready to post to Instagram'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">Instagram Not Configured</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 opacity-80">
                          Configure in Settings to enable posting.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {!isInstagramReady && (
                  <Button
                    onClick={() => (window.location.href = '/settings?tab=instagram')}
                    size="sm"
                    variant="outline"
                  >
                    Configure Instagram
                  </Button>
                )}
              </div>
              {isInstagramReady && (
                <div className="pt-3 border-t border-purple-200 dark:border-purple-800 space-y-4">
                  {/* Meta rate limits */}
                  <div>
                    <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-2 uppercase tracking-wide">
                      Meta limits
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-700 px-3 py-2">
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Posts today</span>
                        <span className={`text-sm font-bold tabular-nums ${postsToday >= postsTodayLimit ? 'text-red-600 dark:text-red-400' : 'text-purple-900 dark:text-purple-100'}`}>
                          {postsToday}/{postsTodayLimit}
                        </span>
                      </div>
                      {cooldownSeconds > 0 && (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 px-3 py-2">
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Next post in</span>
                          <span className="text-sm font-bold tabular-nums text-amber-900 dark:text-amber-100">{cooldownSeconds}s</span>
                        </div>
                      )}
                      <span className="text-xs text-purple-600 dark:text-purple-400">Min 10s between posts · Image &lt; 8 MB</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-3 uppercase tracking-wide">
                      API rate limit
                    </p>
                  {instagramStatus.data.rate_limit_retry_after_at ? (
                    <div className="flex flex-wrap gap-3">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 px-3 py-2">
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Rate limited</span>
                        <span className="text-sm text-amber-700 dark:text-amber-300">
                          Retry after {new Date(instagramStatus.data.rate_limit_retry_after_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : instagramStatus.data.rate_limit_limit != null && instagramStatus.data.rate_limit_remaining != null ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-purple-200 dark:border-purple-700 bg-white/60 dark:bg-purple-950/40 p-3">
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">Limit</p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                          {instagramStatus.data.rate_limit_limit}
                        </p>
                        <p className="text-xs text-muted">requests per window</p>
                      </div>
                      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-white/60 dark:bg-green-950/40 p-3">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-0.5">Remaining</p>
                        <p className="text-lg font-bold text-green-900 dark:text-green-100 tabular-nums">
                          {instagramStatus.data.rate_limit_remaining}
                        </p>
                        <p className="text-xs text-muted">available</p>
                      </div>
                      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-white/60 dark:bg-blue-950/40 p-3">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">Used</p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                          {Math.max(0, instagramStatus.data.rate_limit_limit - instagramStatus.data.rate_limit_remaining)}
                        </p>
                        <p className="text-xs text-muted">sent this window</p>
                      </div>
                      {instagramStatus.data.rate_limit_reset_at && (
                        <div className="rounded-lg border border-purple-200 dark:border-purple-700 bg-white/60 dark:bg-purple-950/40 p-3">
                          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">Resets at</p>
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                            {new Date(instagramStatus.data.rate_limit_reset_at).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(instagramStatus.data.rate_limit_reset_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-purple-700/80 dark:text-purple-300/80">
                      Rate limit stats will appear after the next Instagram API request.
                    </p>
                  )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Create | Posted tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posted')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'posted'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            Posted
          </button>
        </div>

        {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Search & Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Bar + Upload Mode */}
            <div className="card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[160px] relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <Input
                    placeholder="Search by title, designer, or product number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-8 h-9 text-sm py-1.5 rounded-lg"
                  />
                </div>
                <div className="w-[7.5rem] shrink-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="input-field w-full h-9 text-sm py-1.5 rounded-lg min-w-0"
                  >
                    {statusFilterOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[11rem] shrink-0" title="Filter by Instagram post status">
                  <select
                    value={instagramFilter}
                    onChange={(e) => {
                      const value = e.target.value as 'all' | 'posted' | 'not_posted';
                      setInstagramFilter(value);
                      try {
                        localStorage.setItem(INSTAGRAM_FILTER_STORAGE_KEY, value);
                      } catch {}
                    }}
                    className="input-field w-full h-9 text-sm py-1.5 rounded-lg"
                  >
                    <option value="all">All designs ({instagramCounts.total})</option>
                    <option value="not_posted">Not posted ({instagramCounts.notPosted})</option>
                    <option value="posted">Posted ({instagramCounts.posted})</option>
                  </select>
                </div>
                {/* Upload Mode - right side of search bar */}
                <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setUploadMode('single');
                      setSelectedProducts([]);
                      setSelectedProduct(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      uploadMode === 'single'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => {
                      setUploadMode('bulk');
                      setSelectedProduct(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      uploadMode === 'bulk'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Bulk
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="card p-4">
              {isLoadingProducts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted mt-4">Loading products...</p>
                </div>
              ) : !productsData?.data || productsData.data.length === 0 ? (
                <div className="text-center py-12">
                  <PhotoIcon className="w-16 h-16 mx-auto text-muted mb-4 opacity-50" />
                  <p className="text-muted">No products found</p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="mt-4"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-16 h-16 mx-auto text-muted mb-4 opacity-50" />
                  <p className="text-muted">
                    {instagramFilter === 'posted'
                      ? 'No designs on this page have been posted to Instagram yet.'
                      : 'All designs on this page have already been posted to Instagram.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setInstagramFilter('all')}
                    className="text-sm font-medium text-primary hover:underline mt-2"
                  >
                    Show all designs
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                    {filteredProducts.map((product: any) => {
                      const isSelected = uploadMode === 'single'
                        ? selectedProduct?.id === product.id
                        : selectedProducts.some(p => p.id === product.id);
                      const productNum = String((product.productNumber ?? product.product_number ?? '')).trim();
                      const isPosted = productNum !== '' && postedProductNumbers.has(productNum);
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`card-hover cursor-pointer relative overflow-hidden rounded-xl transition-all ${
                            isSelected 
                              ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleSelectProduct(product)}
                        >
                          <div className="aspect-square rounded-t-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img
                              src={product.thumbnailUrl}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                            {isPosted && (
                              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-green-600/90 text-white text-xs font-medium flex items-center gap-1 shadow-lg">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Posted
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium truncate">{product.title}</p>
                            <p className="text-xs text-muted truncate">{product.category}</p>
                          </div>
                          {isSelected && uploadMode === 'single' && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                              <div className="bg-primary text-white rounded-full p-2 shadow-lg">
                                <CheckCircleIcon className="w-6 h-6" />
                              </div>
                            </div>
                          )}
                          {isSelected && uploadMode === 'bulk' && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1.5 shadow-lg z-10">
                              <CheckCircleIcon className="w-4 h-4" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {productsData?.pagination && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-border">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-muted">
                          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, productsData.pagination.total)} of {productsData.pagination.total}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setPageSize(value);
                              setPage(1);
                              try {
                                localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(value));
                              } catch {}
                            }}
                            className="input-field h-8 text-sm py-1 px-2.5 rounded-lg w-[5rem] min-w-0"
                            title="Results per page"
                          >
                            {VALID_PAGE_SIZES.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {productsData.pagination.totalPages > 1 && (
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
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= productsData.pagination.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column: Post Configuration */}
          <div className="space-y-4">
            {uploadMode === 'single' ? (
              <AnimatePresence mode="wait">
                {selectedProduct ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-6 space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Post Configuration</h2>
                    <button
                      onClick={handleClearSelection}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Clear selection"
                    >
                      <XMarkIcon className="w-5 h-5 text-muted" />
                    </button>
                  </div>

                  {/* Product Preview */}
                  <div className="space-y-3">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                      <img
                        src={getSelectedImageUrl()}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{selectedProduct.title}</h3>
                      <p className="text-xs text-muted">{selectedProduct.category}</p>
                    </div>
                  </div>

                  {/* Media Type Selector */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Image Type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(['mockup', 'jpg'] as const).map((type) => {
                        // Check if this type is available in the product's media files
                        const isAvailable = selectedProduct.mediaFiles.some(f => f.type === type);
                        
                        return (
                          <button
                            key={type}
                            onClick={() => handleMediaTypeChange(type)}
                            disabled={!isAvailable}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedProduct.selectedMediaType === type
                                ? 'bg-primary text-white shadow-md scale-105'
                                : isAvailable
                                ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                : 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed opacity-50'
                            }`}
                            title={!isAvailable ? `${type === 'mockup' ? 'Mockup' : 'JPG'} not available for this product` : ''}
                          >
                            {type === 'mockup' ? 'Mockup' : 'JPG'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image size (Meta 8 MB limit) */}
                  {imageCheck?.data !== undefined && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${
                      imageCheck.data.ok
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                      {imageCheck.data.ok ? (
                        <span>
                          Image OK ({(imageCheck.data.size_bytes != null ? (imageCheck.data.size_bytes / (1024 * 1024)).toFixed(2) : '—')} MB, under 8 MB limit)
                        </span>
                      ) : (
                        <span>
                          {imageCheck.data.error ?? (imageCheck.data.size_bytes != null
                            ? `Image too large (${(imageCheck.data.size_bytes / (1024 * 1024)).toFixed(2)} MB). Max 8 MB.`
                            : 'Image size could not be checked.')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Post Type Selector */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Post Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setPostType('post');
                          // Don't clear caption when switching to post (user might want to keep it)
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          postType === 'post'
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <PhotoIcon className={`w-6 h-6 mx-auto mb-2 ${postType === 'post' ? 'text-primary' : 'text-muted'}`} />
                        <p className={`text-sm font-medium ${postType === 'post' ? 'text-primary' : 'text-muted'}`}>
                          Post
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          setPostType('story');
                          // Clear caption when switching to story (stories don't support captions)
                          setCaption('');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          postType === 'story'
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <SparklesIcon className={`w-6 h-6 mx-auto mb-2 ${postType === 'story' ? 'text-primary' : 'text-muted'}`} />
                        <p className={`text-sm font-medium ${postType === 'story' ? 'text-primary' : 'text-muted'}`}>
                          Story
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Caption Input - Only show for posts, not stories */}
                  {postType === 'post' && (
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">
                        Caption <span className="text-error">*</span>
                      </label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Enter caption for Instagram post..."
                        className="input-field w-full min-h-[120px] text-sm resize-none"
                        maxLength={2200}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted">
                          {caption.length} / 2200 characters
                        </p>
                        {!caption.trim() && (
                          <p className="text-xs text-error flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            Required
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Info message for stories */}
                  {postType === 'story' && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <SparklesIcon className="w-4 h-4 inline mr-2" />
                        Stories don&apos;t support captions. Your image will be posted as a story.
                      </p>
                    </div>
                  )}

                  {/* Post Button */}
                  {(() => {
                    const atDailyLimit = postsToday >= postsTodayLimit;
                    const inCooldown = cooldownSeconds > 0;
                    const imageOverLimit = imageCheck?.data && !imageCheck.data.ok;
                    const disabled = isPosting || !isInstagramReady || (postType === 'post' && !caption.trim()) || atDailyLimit || inCooldown || imageOverLimit;
                    const reason = atDailyLimit ? 'Daily limit reached (25 posts)' : inCooldown ? `Wait ${cooldownSeconds}s (Meta limit)` : imageOverLimit ? 'Image over 8 MB' : null;
                    return (
                      <div className="space-y-2">
                        {reason && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 text-center">{reason}</p>
                        )}
                        <Button
                          onClick={handlePost}
                          variant="primary"
                          disabled={disabled}
                          isLoading={isPosting}
                          size="lg"
                          className="w-full shadow-lg"
                        >
                          <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                          {isPosting ? 'Posting...' : `Post ${postType === 'post' ? 'Post' : 'Story'} to Instagram`}
                        </Button>
                      </div>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-12 text-center"
                >
                  <div className="max-w-sm mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                      <CameraIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Product Selected</h3>
                    <p className="text-muted mb-6">
                      Search and select a product from the left to create an Instagram post or story.
                    </p>
                  </div>
                </motion.div>
                )}
              </AnimatePresence>
            ) : (
              // Bulk Upload UI - Enhanced
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card p-6 space-y-6"
              >
                {/* Header with Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Bulk Upload Configuration
                    </h2>
                    <p className="text-xs text-muted mt-1">Configure settings for multiple posts at once</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-pink-500/10 rounded-full border border-primary/20">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-primary">
                      {selectedProducts.length} {selectedProducts.length === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>
                </div>

                {/* Global Settings for Bulk Upload - Enhanced */}
                <div className="space-y-5 p-5 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 rounded-2xl border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-primary to-pink-500 rounded-full"></div>
                    <h3 className="text-base font-bold text-foreground">Global Settings</h3>
                    <span className="text-xs text-muted ml-auto">Applied to all selected products</span>
                  </div>
                  
                  {/* Post Type - Enhanced */}
                  <div>
                    <label className="text-sm font-bold text-foreground mb-3 block flex items-center gap-2">
                      <PhotoIcon className="w-4 h-4 text-primary" />
                      Post Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBulkPostType('post')}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                          bulkPostType === 'post'
                            ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20 scale-[1.02]'
                            : 'border-border hover:border-primary/50 bg-card hover:bg-muted/50'
                        }`}
                      >
                        {bulkPostType === 'post' && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                        )}
                        <div className="relative">
                          <PhotoIcon className={`w-6 h-6 mx-auto mb-2 ${bulkPostType === 'post' ? 'text-primary' : 'text-muted'} transition-colors`} />
                          <p className={`text-sm font-semibold ${bulkPostType === 'post' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Post
                          </p>
                          {bulkPostType === 'post' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setBulkPostType('story');
                          setBulkCaption('');
                        }}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                          bulkPostType === 'story'
                            ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20 scale-[1.02]'
                            : 'border-border hover:border-primary/50 bg-card hover:bg-muted/50'
                        }`}
                      >
                        {bulkPostType === 'story' && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                        )}
                        <div className="relative">
                          <SparklesIcon className={`w-6 h-6 mx-auto mb-2 ${bulkPostType === 'story' ? 'text-primary' : 'text-muted'} transition-colors`} />
                          <p className={`text-sm font-semibold ${bulkPostType === 'story' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Story
                          </p>
                          {bulkPostType === 'story' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Media Type - Enhanced */}
                  <div>
                    <label className="text-sm font-bold text-foreground mb-3 block flex items-center gap-2">
                      <PhotoIcon className="w-4 h-4 text-primary" />
                      Default Media Type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(['mockup', 'jpg'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setBulkMediaType(type)}
                          className={`relative px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            bulkMediaType === type
                              ? 'bg-gradient-to-r from-primary to-pink-500 text-white shadow-lg shadow-primary/30 scale-105'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:scale-105 border border-border'
                          }`}
                        >
                          {type === 'mockup' ? 'Mockup' : type.toUpperCase()}
                          {bulkMediaType === type && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption (only for posts) - Enhanced */}
                  {bulkPostType === 'post' && (
                    <div>
                      <label className="text-sm font-bold text-foreground mb-3 block flex items-center gap-2">
                        <span>Default Caption</span>
                        <span className="text-error text-xs">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={bulkCaption}
                          onChange={(e) => setBulkCaption(e.target.value)}
                          placeholder="Enter default caption for all posts..."
                          className="input-field w-full min-h-[110px] text-sm resize-none pr-12 focus:ring-2 focus:ring-primary/20 transition-all"
                          maxLength={2200}
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                            bulkCaption.length > 2000 
                              ? 'bg-error/10 text-error' 
                              : bulkCaption.length > 1500 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {bulkCaption.length} / 2200
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted">This caption will be used for all posts</p>
                        {!bulkCaption.trim() && (
                          <p className="text-xs text-error flex items-center gap-1 font-medium">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            Required
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {bulkPostType === 'story' && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                          <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Instagram Stories
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Stories don&apos;t support captions. Your images will be posted as stories.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Products List - Enhanced */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-primary" />
                      Selected Products
                    </h3>
                    {selectedProducts.length > 0 && (
                      <button
                        onClick={() => setSelectedProducts([])}
                        className="text-xs font-medium text-error hover:text-error/80 hover:underline transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-error/10"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-gradient-to-br from-muted/20 to-muted/10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/10 to-pink-500/10 flex items-center justify-center">
                        <PhotoIcon className="w-8 h-8 text-primary opacity-60" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">No products selected</p>
                      <p className="text-xs text-muted">
                        Select products from the grid to add them to bulk upload
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
                      {selectedProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group flex items-center gap-3 p-3.5 bg-gradient-to-r from-card to-muted/30 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                            <img
                              src={product.thumbnailUrl}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{product.title}</p>
                            <p className="text-xs text-muted truncate mt-0.5">{product.category}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                                {bulkMediaType === 'mockup' ? 'Mockup' : 'JPG'}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                                {bulkPostType === 'post' ? 'Post' : 'Story'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                            }}
                            className="p-2 hover:bg-error/10 rounded-lg transition-all duration-200 flex-shrink-0 group/btn"
                            title="Remove"
                          >
                            <XMarkIcon className="w-4 h-4 text-error group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk Post Button - Enhanced */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <Button
                    onClick={handleBulkPost}
                    variant="primary"
                    disabled={
                      isBulkPosting ||
                      !isInstagramReady ||
                      selectedProducts.length === 0 ||
                      (bulkPostType === 'post' && !bulkCaption.trim())
                    }
                    isLoading={isBulkPosting}
                    size="lg"
                    className="w-full shadow-lg bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 transition-all duration-200"
                  >
                    <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                    {isBulkPosting
                      ? `Posting... (${bulkPostProgress.completed}/${bulkPostProgress.total})`
                      : `Post ${selectedProducts.length} ${bulkPostType === 'post' ? 'Post' : 'Story'}${selectedProducts.length !== 1 ? 's' : ''} to Instagram`}
                  </Button>

                  {/* Progress Indicator - Enhanced */}
                  {isBulkPosting && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 p-4 bg-gradient-to-r from-primary/5 to-pink-500/5 rounded-xl border border-primary/20"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          Progress
                        </span>
                        <span className="font-bold">
                          <span className="text-primary">{bulkPostProgress.completed}</span>
                          <span className="text-muted"> / </span>
                          <span className="text-foreground">{bulkPostProgress.total}</span>
                          {bulkPostProgress.failed > 0 && (
                            <span className="text-error ml-2">
                              ({bulkPostProgress.failed} failed)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden shadow-inner">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-pink-500 rounded-full shadow-lg"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(bulkPostProgress.completed / bulkPostProgress.total) * 100}%`,
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </div>
                      {bulkPostProgress.completed > 0 && (
                        <p className="text-xs text-muted text-center">
                          {Math.round((bulkPostProgress.completed / bulkPostProgress.total) * 100)}% complete
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'posted' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-xl font-bold">Recently posted</h2>
            <p className="text-muted text-sm">Posts successfully published to Instagram, sorted by post date (recent first).</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">From</label>
                <input
                  type="date"
                  value={postedFromDate}
                  onChange={(e) => {
                    setPostedFromDate(e.target.value);
                    setPostedPage(1);
                  }}
                  className="input-field h-9 px-3 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">To</label>
                <input
                  type="date"
                  value={postedToDate}
                  onChange={(e) => {
                    setPostedToDate(e.target.value);
                    setPostedPage(1);
                  }}
                  className="input-field h-9 px-3 rounded-lg text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPostedFromDate(getDefaultPostedFromDate());
                  setPostedToDate(getDefaultPostedToDate());
                  setPostedPage(1);
                }}
              >
                Last 7 days
              </Button>
            </div>
            {isLoadingPostedPosts ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : !(Array.isArray(postedPostsData?.data?.data) && postedPostsData.data.data.length > 0) ? (
              <div className="text-center py-16">
                <CheckCircleIcon className="w-16 h-16 mx-auto text-muted mb-4 opacity-50" />
                <p className="text-muted">No posts in this date range.</p>
                <p className="text-sm text-muted mt-1">Adjust the from/to dates or post from the Create tab.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                  {(postedPostsData.data.data as any[]).map((post: {
                    id: number;
                    product_title: string;
                    product_thumbnail_url?: string | null;
                    post_type: string;
                    post_url: string | null;
                    posted_at: string | null;
                    product_number?: string | null;
                  }) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        {post.product_thumbnail_url ? (
                          <img
                            src={post.product_thumbnail_url}
                            alt={post.product_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PhotoIcon className="w-8 h-8 text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.product_title}</p>
                        {post.product_number && (
                          <p className="text-xs text-muted truncate">{post.product_number}</p>
                        )}
                        <p className="text-xs text-muted mt-0.5">
                          {post.posted_at
                            ? new Date(post.posted_at).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '—'}
                          {' · '}
                          <span className="capitalize">{post.post_type}</span>
                        </p>
                      </div>
                      {post.post_url && (
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Open on Instagram"
                        >
                          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
                {postedPostsData.data.pagination && (postedPostsData.data.pagination.totalPages ?? postedPostsData.data.pagination.total_pages) > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-sm text-muted">
                      Showing page {postedPage} of {postedPostsData.data.pagination.totalPages ?? postedPostsData.data.pagination.total_pages} ({postedPostsData.data.pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPostedPage((p) => Math.max(1, p - 1))}
                        disabled={postedPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPostedPage((p) => p + 1)}
                        disabled={postedPage >= (postedPostsData.data.pagination.totalPages ?? postedPostsData.data.pagination.total_pages)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
