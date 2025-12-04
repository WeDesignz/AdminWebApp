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
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('approved');
  const queryClient = useQueryClient();

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

    setSelectedProduct(newProduct);
    setCaption(''); // Reset caption when selecting new product
    toast.success('Product selected');
  };

  const handleClearSelection = () => {
    setSelectedProduct(null);
    setCaption('');
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

    if (!caption.trim()) {
      toast.error('Please add a caption for your Instagram post');
      return;
    }

    setIsPosting(true);
    try {
      const post = {
        productId: selectedProduct.id,
        mediaType: selectedProduct.selectedMediaType,
        caption: caption.trim(),
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
                      const isSelected = selectedProduct?.id === product.id;
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
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                              <div className="bg-primary text-white rounded-full p-2 shadow-lg">
                                <CheckCircleIcon className="w-6 h-6" />
                              </div>
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
                        onClick={() => setPostType('post')}
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
                        onClick={() => setPostType('story')}
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

                  {/* Caption Input */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Caption <span className="text-error">*</span>
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={`Enter caption for Instagram ${postType}...`}
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

                  {/* Post Button */}
                  <Button
                    onClick={handlePost}
                    variant="primary"
                    disabled={isPosting || !isInstagramReady || !caption.trim()}
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
