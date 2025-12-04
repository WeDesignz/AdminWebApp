'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Dropdown } from '@/components/common/Dropdown';
import { 
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
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
  caption: string;
}

export default function InstagramPostsPage() {
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
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
    enabled: isReady && showProductSelector,
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

    // Check if product is already selected
    if (selectedProducts.find(p => p.id === product.id)) {
      toast.error('Product already selected');
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
      caption: '',
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    toast.success('Product added to selection');
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    toast.success('Product removed from selection');
  };

  const handleMediaTypeChange = (productId: string, mediaType: 'mockup' | 'jpg' | 'png') => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id === productId ? { ...p, selectedMediaType: mediaType } : p
    ));
  };

  const handleCaptionChange = (productId: string, caption: string) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id === productId ? { ...p, caption } : p
    ));
  };

  const handleBulkPost = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    // Validate all have captions
    const missingCaptions = selectedProducts.filter(p => !p.caption.trim());
    if (missingCaptions.length > 0) {
      toast.error(`Please add captions for all products (${missingCaptions.length} missing)`);
      return;
    }

    setIsPosting(true);
    try {
      const posts = selectedProducts.map(p => ({
        productId: p.id,
        mediaType: p.selectedMediaType,
        caption: p.caption,
        postType, // 'post' or 'story'
      }));

      const response = await API.postToInstagram(posts);
      
      if (response.success) {
        toast.success(`Successfully queued ${selectedProducts.length} ${postType}(s) for Instagram posting`);
        setSelectedProducts([]);
        queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
      } else {
        toast.error(response.error || 'Failed to post to Instagram');
      }
    } catch (error) {
      toast.error('An error occurred while posting to Instagram');
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleClearAll = () => {
    if (selectedProducts.length === 0) return;
    if (confirm(`Clear all ${selectedProducts.length} selected products?`)) {
      setSelectedProducts([]);
      toast.success('Selection cleared');
    }
  };

  const getSelectedImageUrl = (product: SelectedProduct) => {
    const mediaFile = product.mediaFiles.find(f => f.type === product.selectedMediaType);
    return mediaFile?.url || product.thumbnailUrl;
  };

  const getAvailableMediaTypes = (product: SelectedProduct) => {
    const types = new Set(product.mediaFiles.map(f => f.type));
    return Array.from(types) as ('mockup' | 'jpg' | 'png')[];
  };

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagram Posts
            </h1>
            <p className="text-muted mt-1">Create and manage Instagram posts and stories from your designs</p>
          </div>
          <div className="flex gap-3">
            {selectedProducts.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button
              onClick={() => setShowProductSelector(true)}
              variant="primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Select Products
            </Button>
          </div>
        </div>

        {/* Instagram Status Banner */}
        {instagramStatus?.data && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              instagramStatus.data.is_configured && instagramStatus.data.is_token_valid
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {instagramStatus.data.is_configured && instagramStatus.data.is_token_valid ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Instagram Connected</p>
                      <p className="text-sm text-green-700 dark:text-green-300 opacity-80">
                        Ready to post! Your posts will be published to Instagram.
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
              {(!instagramStatus.data.is_configured || !instagramStatus.data.is_token_valid) && (
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

        {/* Post Type Selector */}
        <div className="card p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <CameraIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Post Type</label>
                <p className="text-xs text-muted">Choose between regular posts or stories</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={postType === 'post' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPostType('post')}
                className="min-w-[100px]"
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                Post
              </Button>
              <Button
                variant={postType === 'story' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPostType('story')}
                className="min-w-[100px]"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Story
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Products */}
        <AnimatePresence>
          {selectedProducts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Selected Products ({selectedProducts.length})
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Configure each product&apos;s image type and caption before posting
                  </p>
                </div>
                <Button
                  onClick={handleBulkPost}
                  variant="primary"
                  disabled={isPosting}
                  isLoading={isPosting}
                  size="lg"
                  className="shadow-lg"
                >
                  <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                  Post {postType === 'post' ? 'Posts' : 'Stories'} to Instagram
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card p-4 space-y-3 hover:shadow-lg transition-shadow duration-200 border-2 border-transparent hover:border-primary/20"
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                      <img
                        src={getSelectedImageUrl(product)}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-medium truncate">{product.title}</p>
                          <p className="text-white/80 text-xs truncate">{product.category}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveProduct(product.id)}
                        className="absolute top-2 right-2 p-2 bg-error/90 text-white rounded-full hover:bg-error shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove product"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-lg">
                        {product.selectedMediaType.toUpperCase()}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div>
                      <h3 className="font-semibold text-sm truncate mb-1">{product.title}</h3>
                      <p className="text-xs text-muted mb-3">{product.category}</p>
                      
                      {/* Media Type Selector */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-muted mb-2 block">Image Type:</label>
                        <div className="flex gap-2 flex-wrap">
                          {getAvailableMediaTypes(product).map((type) => (
                            <button
                              key={type}
                              onClick={() => handleMediaTypeChange(product.id, type)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                product.selectedMediaType === type
                                  ? 'bg-primary text-white shadow-md'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {type === 'mockup' ? '📱 Mockup' : type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caption Input */}
                      <div>
                        <label className="text-xs font-medium text-muted mb-2 block">
                          Caption {postType === 'story' ? '(Story)' : '(Post)'}:
                          {!product.caption.trim() && (
                            <span className="text-error ml-1">*</span>
                          )}
                        </label>
                        <textarea
                          value={product.caption}
                          onChange={(e) => handleCaptionChange(product.id, e.target.value)}
                          placeholder={`Enter caption for Instagram ${postType}...`}
                          className="input-field w-full min-h-[100px] text-sm resize-none"
                          maxLength={postType === 'story' ? 2200 : 2200}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted">
                            {product.caption.length} / 2200 characters
                          </p>
                          {!product.caption.trim() && (
                            <p className="text-xs text-error flex items-center gap-1">
                              <ExclamationTriangleIcon className="w-3 h-3" />
                              Required
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-12 text-center"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                  <CameraIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Products Selected</h3>
                <p className="text-muted mb-6">
                  Select products from your catalog to create Instagram posts or stories. 
                  Choose the image type (mockup, JPG, or PNG) and add captions for each.
                </p>
                <Button onClick={() => setShowProductSelector(true)} variant="primary" size="lg">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Select Products
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Selector Modal */}
        <Modal
          isOpen={showProductSelector}
          onClose={() => {
            setShowProductSelector(false);
            setSearchQuery('');
            setPage(1);
          }}
          title="Select Products for Instagram"
          size="xl"
        >
          <div className="space-y-4">
            {/* Search and Filter */}
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
              <div className="w-48">
                <Dropdown
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter by status"
                />
              </div>
            </div>

            {/* Products Grid */}
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
                    const isSelected = selectedProducts.some(p => p.id === product.id);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`card-hover cursor-pointer relative overflow-hidden rounded-xl ${
                          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                        onClick={() => !isSelected && handleSelectProduct(product)}
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
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-white rounded-full p-2">
                              <CheckIcon className="w-6 h-6" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {productsData?.pagination && productsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
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
        </Modal>
      </div>
    </DashboardLayout>
  );
}

