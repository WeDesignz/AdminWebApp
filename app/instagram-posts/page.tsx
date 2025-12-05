'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
import { useState, useEffect } from 'react';
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
  selectedMediaType: 'mockup' | 'jpg' | 'png';
}

export default function InstagramPostsPage() {
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('approved');
  const queryClient = useQueryClient();

  // Bulk upload state
  const [bulkPostType, setBulkPostType] = useState<'post' | 'story'>('post');
  const [bulkCaption, setBulkCaption] = useState('');
  const [bulkMediaType, setBulkMediaType] = useState<'mockup' | 'jpg' | 'png'>('mockup');
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
    queryKey: ['products-for-instagram', searchQuery, page, statusFilter],
    queryFn: () => API.getDesigns({ 
      status: statusFilter || 'approved',
      search: searchQuery,
      page,
      limit: 20
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

  const handleSelectProduct = (product: any) => {
    // Extract media files and categorize them
    const mediaFiles = (product.files || []).map((file: any) => {
      let type: 'mockup' | 'jpg' | 'png' = 'jpg';
      if (file.isMockup) {
        type = 'mockup';
      } else if (file.name?.toLowerCase().endsWith('.png')) {
        type = 'png';
      } else if (file.name?.toLowerCase().endsWith('.jpg') || file.name?.toLowerCase().endsWith('.jpeg')) {
        type = 'jpg';
      }

      return {
        id: file.id,
        url: file.url,
        type,
        fileName: file.name,
      };
    }).filter((f: any) => ['mockup', 'jpg', 'png'].includes(f.type));

    if (mediaFiles.length === 0) {
      toast.error('This product has no suitable images (mockup, jpg, or png)');
      return;
    }

    // Determine default media type (prefer mockup, then png, then jpg)
    let defaultMediaType: 'mockup' | 'jpg' | 'png' = 'jpg';
    if (mediaFiles.find((f: any) => f.type === 'mockup')) {
      defaultMediaType = 'mockup';
    } else if (mediaFiles.find((f: any) => f.type === 'png')) {
      defaultMediaType = 'png';
    }

    const newProduct: SelectedProduct = {
      id: product.id,
      title: product.title,
      thumbnailUrl: product.thumbnailUrl,
      category: product.category,
      mediaFiles,
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

  const handleMediaTypeChange = (mediaType: 'mockup' | 'jpg' | 'png') => {
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
      } else {
        toast.error(response.error || 'Failed to post to Instagram');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while posting to Instagram');
      console.error(error);
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
  };

  const getSelectedImageUrl = () => {
    if (!selectedProduct) return '';
    const mediaFile = selectedProduct.mediaFiles.find(f => f.type === selectedProduct.selectedMediaType);
    return mediaFile?.url || selectedProduct.thumbnailUrl;
  };

  const getAvailableMediaTypes = () => {
    if (!selectedProduct) return [];
    const types = new Set(selectedProduct.mediaFiles.map(f => f.type));
    return Array.from(types) as ('mockup' | 'jpg' | 'png')[];
  };

  const statusFilterOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
  ];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
              Instagram Posts
            </h1>
            <p className="text-muted mt-1">Create and share your designs on Instagram</p>
          </div>
        </div>

        {/* Upload Mode Toggle */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Upload Mode</h3>
              <p className="text-xs text-muted">Choose between single or bulk upload</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setUploadMode('single');
                  setSelectedProducts([]);
                  setSelectedProduct(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === 'single'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Single Upload
              </button>
              <button
                onClick={() => {
                  setUploadMode('bulk');
                  setSelectedProduct(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === 'bulk'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Bulk Upload
              </button>
            </div>
          </div>
        </div>

        {/* Instagram Status Banner */}
        {instagramStatus?.data && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              isInstagramReady
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isInstagramReady ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Instagram Connected</p>
                      <p className="text-sm text-green-700 dark:text-green-300 opacity-80">
                        Ready to post! Your content will be published to Instagram.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100">Instagram Not Configured</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 opacity-80">
                        {!instagramStatus.data.is_configured 
                          ? 'Please configure Instagram integration in Settings to enable posting.'
                          : 'Instagram token expired. Please re-authorize in Settings.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {!isInstagramReady && (
                <Button
                  onClick={() => window.location.href = '/settings?tab=instagram'}
                  size="sm"
                  variant="outline"
                >
                  Configure Instagram
                </Button>
              )}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Search & Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Bar */}
            <div className="card p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <Input
                    placeholder="Search products by title or designer..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="w-40">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="input-field w-full"
                  >
                    {statusFilterOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                    {productsData.data.map((product: any) => {
                      const isSelected = uploadMode === 'single'
                        ? selectedProduct?.id === product.id
                        : selectedProducts.some(p => p.id === product.id);
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
                  {productsData?.pagination && productsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                      <p className="text-sm text-muted">
                        Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, productsData.pagination.total)} of {productsData.pagination.total}
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
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= productsData.pagination.totalPages}
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
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-lg">
                        {selectedProduct.selectedMediaType.toUpperCase()}
                      </div>
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
                      {getAvailableMediaTypes().map((type) => (
                        <button
                          key={type}
                          onClick={() => handleMediaTypeChange(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedProduct.selectedMediaType === type
                              ? 'bg-primary text-white shadow-md scale-105'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {type === 'mockup' ? '📱 Mockup' : type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

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
                  <Button
                    onClick={handlePost}
                    variant="primary"
                    disabled={isPosting || !isInstagramReady || (postType === 'post' && !caption.trim())}
                    isLoading={isPosting}
                    size="lg"
                    className="w-full shadow-lg"
                  >
                    <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                    {isPosting ? 'Posting...' : `Post ${postType === 'post' ? 'Post' : 'Story'} to Instagram`}
                  </Button>
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
                      {['mockup', 'png', 'jpg'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setBulkMediaType(type as 'mockup' | 'jpg' | 'png')}
                          className={`relative px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            bulkMediaType === type
                              ? 'bg-gradient-to-r from-primary to-pink-500 text-white shadow-lg shadow-primary/30 scale-105'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:scale-105 border border-border'
                          }`}
                        >
                          {type === 'mockup' ? '📱 Mockup' : type.toUpperCase()}
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
                                {bulkMediaType === 'mockup' ? '📱 Mockup' : bulkMediaType.toUpperCase()}
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
      </div>
    </DashboardLayout>
  );
}
