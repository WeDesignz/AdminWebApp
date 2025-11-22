'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { 
  ClockIcon, 
  EyeIcon, 
  XMarkIcon, 
  PaperClipIcon, 
  XCircleIcon, 
  CheckIcon, 
  MagnifyingGlassIcon, 
  ShoppingCartIcon, 
  ClockIcon as ClockIconSolid, 
  CheckCircleIcon, 
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import { CustomOrder } from '@/types';
import { Input } from '@/components/common/Input';
import { KpiCard } from '@/components/common/KpiCard';
import { Dropdown } from '@/components/common/Dropdown';
import { OrderCommentModal } from '@/components/orders/OrderCommentModal';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import toast from 'react-hot-toast';

interface UploadedFile {
  file: File | null;
  preview?: string;
}

// Custom Order Card with Unread Counter
function CustomOrderCardWithUnread({
  order,
  orderIdForUnread,
  onOpenChat,
  onViewDetails,
  onUploadDeliverable,
  onRejectOrder,
  onStatusChange,
  updatingOrderId,
  orderStatusOptions,
  currentTime,
  getTimeRemainingShort,
  formatCurrency,
  formatDate,
  isExpanded,
  onToggleExpand,
  onPreviewImage,
  onDownloadFile,
}: {
  order: CustomOrder;
  orderIdForUnread: string;
  onOpenChat: (order: CustomOrder) => void;
  onViewDetails: (order: CustomOrder) => void;
  onUploadDeliverable: (order: CustomOrder) => void;
  onRejectOrder: (order: CustomOrder) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  updatingOrderId: string | null;
  orderStatusOptions: Array<{ value: string; label: string; disabled?: boolean; tooltip?: string }>;
  currentTime: number;
  getTimeRemainingShort: (deadline: string, status: string, createdAt: string, completedAt?: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPreviewImage: (url: string, fileName: string, allImages: Array<{ url: string; fileName: string }>, index: number) => void;
  onDownloadFile?: (url: string, fileName: string) => void;
}) {
  const unreadCount = useUnreadMessages(orderIdForUnread, undefined);

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-lg">Order #{order.id}</h3>
            {order.designTitle && (
              <span className="text-muted text-sm">• {order.designTitle}</span>
            )}
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
              order.status === 'completed' ? 'bg-success/20 text-success' :
              order.status === 'in_progress' ? 'bg-primary/20 text-primary' :
              order.status === 'pending' ? 'bg-warning/20 text-warning' :
              order.status === 'cancelled' ? 'bg-error/20 text-error' :
              order.status === 'delayed' ? 'bg-error/20 text-error' :
              'bg-muted/20 text-muted'
            }`}>
              {order.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-muted mb-2">{order.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">Customer: <span className="font-medium text-primary">{order.customerName}</span></span>
            {order.designerName && (
              <span className="text-muted">Designer: <span className="font-medium text-primary">{order.designerName}</span></span>
            )}
            <span className="font-bold">{formatCurrency(order.budget)}</span>
          </div>
          
          {/* Deliverables Section */}
          {order.deliverables && order.deliverables.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckIcon className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Deliverables Uploaded ({order.deliverables.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(isExpanded ? order.deliverables : order.deliverables.slice(0, 3)).map((file) => {
                  const fileNameLower = file.fileName?.toLowerCase() || '';
                  const isImage = fileNameLower.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                                  fileNameLower.includes('mockup');
                  const isCDR = fileNameLower.endsWith('.cdr');
                  const isEPS = fileNameLower.endsWith('.eps');
                  
                  if (isImage) {
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          const imageFiles = order.deliverables?.filter(f => {
                            const fNameLower = f.fileName?.toLowerCase() || '';
                            return fNameLower.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                                   fNameLower.includes('mockup');
                          }) || [];
                          const imageIndex = imageFiles.findIndex(f => f.id === file.id);
                          onPreviewImage(file.url, file.fileName || 'file', imageFiles.map(f => ({ url: f.url, fileName: f.fileName || 'file' })), imageIndex >= 0 ? imageIndex : 0);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg text-xs font-medium transition-colors border border-success/20 cursor-pointer"
                        title={`Preview ${file.fileName}`}
                      >
                        <EyeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{file.fileName}</span>
                      </button>
                    );
                  } else if (isCDR || isEPS) {
                    return (
                      <button
                        key={file.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onDownloadFile) {
                            onDownloadFile(file.url, file.fileName || 'file');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg text-xs font-medium transition-colors border border-success/20 cursor-pointer"
                        title={`Download ${file.fileName}`}
                      >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{file.fileName}</span>
                      </button>
                    );
                  } else {
                    return (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg text-xs font-medium transition-colors border border-success/20"
                        title={file.fileName}
                      >
                        <PaperClipIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{file.fileName}</span>
                      </a>
                    );
                  }
                })}
                {order.deliverables.length > 3 && (
                  <button
                    onClick={onToggleExpand}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/10 hover:bg-muted/20 text-muted rounded-lg text-xs font-medium transition-colors border border-border cursor-pointer"
                    title={isExpanded ? 'Show less' : 'Show all'}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                        <span>Show less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                        <span>+{order.deliverables.length - 3} more</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="text-right ml-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${
            order.status === 'completed'
              ? 'bg-success/20 text-success'
              : order.status === 'cancelled'
              ? 'bg-error/20 text-error'
              : order.status === 'delayed'
              ? 'bg-error/20 text-error'
              : new Date(order.slaDeadline).getTime() - currentTime < 1800000
              ? 'bg-error/20 text-error'
              : 'bg-warning/20 text-warning'
          }`}>
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {getTimeRemainingShort(order.slaDeadline, order.status, order.createdAt, order.completedAt)}
            </span>
          </div>
          <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
        </div>
      </div>
      
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative inline-block">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onOpenChat(order)}
            title="Reply to Chat"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            Reply to Chat
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 z-50 shadow-lg ring-2 ring-white dark:ring-gray-900 pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onUploadDeliverable(order)}
          title="Upload Deliverable"
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <PaperClipIcon className="w-4 h-4" />
          Upload Deliverable
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onViewDetails(order)}
          title="View Details"
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <EyeIcon className="w-4 h-4" />
          View Details
        </Button>
        <div style={{ width: '180px' }}>
          <Dropdown
            options={orderStatusOptions}
            value={order.status}
            onChange={(value) => onStatusChange(order.id, value)}
            buttonClassName={updatingOrderId === order.id ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </div>
        <Button 
          size="sm" 
          variant="danger"
          onClick={() => onRejectOrder(order)}
          title="Reject Order"
          className="whitespace-nowrap"
        >
          Reject Order
        </Button>
      </div>
    </div>
  );
}

export default function CustomOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    jpg: UploadedFile;
    png: UploadedFile;
    mockup: UploadedFile;
    eps: UploadedFile;
    cdr: UploadedFile;
  }>({
    jpg: { file: null },
    png: { file: null },
    mockup: { file: null },
    eps: { file: null },
    cdr: { file: null },
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string } | null>(null);
  const [previewImagesList, setPreviewImagesList] = useState<Array<{ url: string; fileName: string }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['custom-orders', search, statusFilter],
    queryFn: () => MockAPI.getCustomOrders({ search, status: statusFilter }),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['custom-order-stats'],
    queryFn: () => MockAPI.getCustomOrderStats(),
  });

  // Note: OrderCommentModal handles its own data fetching

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  const getTimeRemainingShort = (deadline: string, status: string, createdAt: string, completedAt?: string) => {
    if (status === 'completed') {
      const completionTime = completedAt ? new Date(completedAt).getTime() : currentTime;
      const deadlineTime = new Date(deadline).getTime();
      const timeLeftWhenCompleted = deadlineTime - completionTime;
      const oneHour = 3600000;
      const timeTaken = oneHour - timeLeftWhenCompleted;
      const clampedTime = Math.max(0, Math.min(timeTaken, oneHour));
      
      const hours = Math.floor(clampedTime / (1000 * 60 * 60));
      const minutes = Math.floor((clampedTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((clampedTime % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        return `Completed in ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `Completed in ${minutes}m ${seconds}s`;
      } else {
        return `Completed in ${seconds}s`;
      }
    }
    
    const diff = new Date(deadline).getTime() - currentTime;
    if (diff <= 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleViewDetails = (order: CustomOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleOpenChat = (order: CustomOrder) => {
    setSelectedOrder(order);
    setShowChatModal(true);
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setSelectedOrder(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleUploadDeliverable = (order: CustomOrder) => {
    setSelectedOrder(order);
    setShowUploadModal(true);
    setUploadedFiles({
      jpg: { file: null },
      png: { file: null },
      mockup: { file: null },
      eps: { file: null },
      cdr: { file: null },
    });
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedOrder(null);
    setUploadedFiles({
      jpg: { file: null },
      png: { file: null },
      mockup: { file: null },
      eps: { file: null },
      cdr: { file: null },
    });
  };

  const handleFileSelect = (type: 'jpg' | 'png' | 'mockup' | 'eps' | 'cdr', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFile: UploadedFile = { file };

    // Create preview for jpg, png and mockup files
    if (type === 'jpg' || type === 'png' || type === 'mockup') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFiles((prev) => ({
          ...prev,
          [type]: { file, preview: reader.result as string },
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedFiles((prev) => ({
        ...prev,
        [type]: newFile,
      }));
    }

    e.target.value = '';
  };

  const handleRemoveFile = (type: 'jpg' | 'png' | 'mockup' | 'eps' | 'cdr') => {
    setUploadedFiles((prev) => ({
      ...prev,
      [type]: { file: null },
    }));
  };

  const handleSubmitUpload = async () => {
    if (!selectedOrder) return;
    const hasFiles = uploadedFiles.jpg?.file || uploadedFiles.png?.file || uploadedFiles.mockup?.file || uploadedFiles.eps?.file || uploadedFiles.cdr?.file;
    if (!hasFiles) {
      toast.error('Please select at least one file to upload');
      return;
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      const files: File[] = [];
      if (uploadedFiles.jpg?.file) {
        files.push(uploadedFiles.jpg.file);
        formData.append('files', uploadedFiles.jpg.file);
      }
      if (uploadedFiles.png?.file) {
        files.push(uploadedFiles.png.file);
        formData.append('files', uploadedFiles.png.file);
      }
      if (uploadedFiles.mockup?.file) {
        files.push(uploadedFiles.mockup.file);
        formData.append('files', uploadedFiles.mockup.file);
      }
      if (uploadedFiles.eps?.file) {
        files.push(uploadedFiles.eps.file);
        formData.append('files', uploadedFiles.eps.file);
      }
      if (uploadedFiles.cdr?.file) {
        files.push(uploadedFiles.cdr.file);
        formData.append('files', uploadedFiles.cdr.file);
      }

      // Upload files using API
      const response = await MockAPI.uploadDeliverables(selectedOrder.id, formData);
      if (response.success) {
        toast.success('Deliverables uploaded successfully');
        handleCloseUploadModal();
        refetch();
        refetchStats(); // Refetch stats to update deliveryFilesUploaded flag
      } else {
        toast.error(response.error || 'Failed to upload deliverables');
      }
    } catch (error: any) {
      toast.error(error?.error || error?.message || 'Failed to upload deliverables');
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRejectOrder = (order: CustomOrder) => {
    setSelectedOrder(order);
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedOrder(null);
    setRejectionReason('');
  };

  const handleSubmitRejection = async () => {
    if (!selectedOrder || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await MockAPI.updateCustomOrderStatus(selectedOrder.id, 'cancelled');
      toast.success('Order rejected successfully');
      handleCloseRejectModal();
      refetch();
      refetchStats();
    } catch (error) {
      toast.error('Failed to reject order');
      console.error('Error rejecting order:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await MockAPI.updateCustomOrderStatus(orderId, newStatus as CustomOrder['status']);
      toast.success('Status updated successfully');
      refetch();
      refetchStats();
    } catch (error: any) {
      // Show more specific error message if deliverables are not uploaded
      const errorMessage = error?.error || error?.details || error?.message || 'Failed to update status';
      if (errorMessage.includes('deliverables') || errorMessage.includes('Deliverables')) {
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage || 'Failed to update status');
      }
      console.error('Error updating status:', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleToggleExpandDeliverables = (orderId: string) => {
    setExpandedDeliverables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Helper function to get auth token for file access
  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return parsed?.state?.accessToken || null;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return null;
  };

  // Helper function to fetch image as blob URL with authentication
  const getAuthenticatedImageUrl = async (url: string): Promise<string> => {
    if (!url) return url;
    const token = getAuthToken();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching authenticated image:', error);
      // Fallback to original URL
      return url;
    }
  };

  // Helper function to download file with authentication
  const downloadFile = async (url: string, fileName: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(url, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file. Please try again.');
    }
  };

  const handlePreviewImage = async (url: string, fileName: string, allImages: Array<{ url: string; fileName: string }>, index: number) => {
    try {
      // Fetch the main image with authentication
      const authUrl = await getAuthenticatedImageUrl(url);
      setPreviewImage({ url: authUrl, fileName });
      
      // Fetch all images with authentication
      const authImagePromises = allImages.map(async (img) => {
        const imgUrl = await getAuthenticatedImageUrl(img.url);
        return { ...img, url: imgUrl };
      });
      const authImages = await Promise.all(authImagePromises);
      setPreviewImagesList(authImages);
      setCurrentImageIndex(index);
    } catch (error) {
      console.error('Error loading preview image:', error);
      toast.error('Failed to load image. Please try again.');
    }
  };

  const handleCloseImagePreview = () => {
    setPreviewImage(null);
    setPreviewImagesList([]);
    setCurrentImageIndex(0);
  };

  const handlePreviousImage = () => {
    if (previewImagesList.length > 0 && currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setPreviewImage(previewImagesList[newIndex]);
    }
  };

  const handleNextImage = () => {
    if (previewImagesList.length > 0 && currentImageIndex < previewImagesList.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setPreviewImage(previewImagesList[newIndex]);
    }
  };

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'delayed', label: 'Delayed' },
  ];

  // Generate status options with disabled state for 'completed' if deliverables not uploaded
  const getOrderStatusOptions = (deliveryFilesUploaded: boolean = false) => [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { 
      value: 'completed', 
      label: 'Completed',
      disabled: !deliveryFilesUploaded,
      tooltip: !deliveryFilesUploaded ? 'Deliverables must be uploaded before marking as completed. Please use the "Upload Deliverable" button to upload files first.' : undefined
    },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'delayed', label: 'Delayed' },
  ];

  const orderStatusOptions = getOrderStatusOptions(false); // Default for filter dropdown

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Custom Orders</h1>
            <p className="text-muted mt-1">Manage custom order requests and track SLA deadlines</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm">Live Updates Active</span>
          </div>
        </div>

        {/* Statistics Tiles */}
        {statsData?.data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard
              title="Total Orders"
              value={statsData.data.total}
              icon={<ShoppingCartIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Pending Orders"
              value={statsData.data.pending}
              icon={<ClockIconSolid className="w-6 h-6" />}
            />
            <KpiCard
              title="In Progress Orders"
              value={statsData.data.inProgress}
              icon={<ArrowPathIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="Completed Orders"
              value={statsData.data.completed}
              icon={<CheckCircleIcon className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Search and Filter */}
        <div className="card">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <Input
                placeholder="Search by order ID, design title, or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Custom Orders Cards - 1 card per row */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted mt-4">Loading custom orders...</p>
            </div>
          ) : !data || !data.success || (data.data || []).length === 0 ? (
            <div className="card text-center py-12">
              <ShoppingCartIcon className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-lg font-medium text-muted">No custom orders found</p>
              <p className="text-sm text-muted mt-2">Try adjusting your search or filter criteria</p>
              {data && !data.success && data.error && (
                <p className="text-sm text-error mt-2">Error: {data.error}</p>
              )}
            </div>
          ) : (
            (data.data || []).map((order) => {
              const orderIdForUnread = order.orderId || order.id;
              // Generate status options specific to this order, disabling "completed" if deliverables not uploaded
              const orderSpecificStatusOptions = getOrderStatusOptions(order.deliveryFilesUploaded || false);
              const isExpanded = expandedDeliverables.has(order.id);
              return (
                <CustomOrderCardWithUnread
                  key={order.id}
                  order={order}
                  orderIdForUnread={orderIdForUnread}
                  onOpenChat={handleOpenChat}
                  onViewDetails={handleViewDetails}
                  onUploadDeliverable={handleUploadDeliverable}
                  onRejectOrder={handleRejectOrder}
                  onStatusChange={handleStatusChange}
                  updatingOrderId={updatingOrderId}
                  orderStatusOptions={orderSpecificStatusOptions}
                  currentTime={currentTime}
                  getTimeRemainingShort={getTimeRemainingShort}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  isExpanded={isExpanded}
                  onToggleExpand={() => handleToggleExpandDeliverables(order.id)}
                  onPreviewImage={(url, fileName, allImages, index) => handlePreviewImage(url, fileName, allImages, index)}
                  onDownloadFile={downloadFile}
                />
              );
            })
          )}
        </div>

      {/* Order Details Modal - Keep existing implementation */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        title="Order Details"
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* Order Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">Order Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted">Order ID</p>
                  <p className="font-medium">{selectedOrder.id}</p>
                </div>
                {selectedOrder.designTitle && (
                  <div>
                    <p className="text-muted">Design Title</p>
                    <p className="font-medium">{selectedOrder.designTitle}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-muted">Description</p>
                  <p className="font-medium">{selectedOrder.description}</p>
                </div>
                <div>
                  <p className="text-muted">Budget</p>
                  <p className="font-medium">{formatCurrency(selectedOrder.budget)}</p>
                </div>
                <div>
                  <p className="text-muted">Status</p>
                  <p className="font-medium">{selectedOrder.status.replace('_', ' ')}</p>
                </div>
                {selectedOrder.paymentStatus && (
                  <div>
                    <p className="text-muted">Payment Status</p>
                    <p className="font-medium">{selectedOrder.paymentStatus}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted">Created At</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                {selectedOrder.completedAt && (
                  <div>
                    <p className="text-muted">Completed At</p>
                    <p className="font-medium">{formatDate(selectedOrder.completedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted">SLA Deadline</p>
                  <p className="font-medium">{formatDate(selectedOrder.slaDeadline)}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b border-border pb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted">Customer ID</p>
                  <p className="font-medium">{selectedOrder.customerId}</p>
                </div>
                <div>
                  <p className="text-muted">Customer Name</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
              </div>
            </div>

            {/* Designer Information */}
            {selectedOrder.designerId && selectedOrder.designerName && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Designer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted">Designer ID</p>
                    <p className="font-medium">{selectedOrder.designerId}</p>
                  </div>
                  <div>
                    <p className="text-muted">Designer Name</p>
                    <p className="font-medium">{selectedOrder.designerName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reference Files */}
            {selectedOrder.referenceFiles && selectedOrder.referenceFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Reference Files</h3>
                <div className="space-y-2">
                  {selectedOrder.referenceFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 text-sm">
                      <PaperClipIcon className="w-4 h-4 text-muted" />
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {file.fileName}
                      </a>
                      <span className="text-muted text-xs">({formatDate(file.uploadedAt)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            {selectedOrder.deliverables && selectedOrder.deliverables.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Deliverables</h3>
                <div className="space-y-2">
                  {selectedOrder.deliverables.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 text-sm">
                      <CheckIcon className="w-4 h-4 text-success" />
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {file.fileName}
                      </a>
                      <span className="text-muted text-xs">({formatDate(file.uploadedAt)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Deliverable Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedOrder(null);
          setUploadedFiles({
            jpg: { file: null },
            png: { file: null },
            mockup: { file: null },
            eps: { file: null },
            cdr: { file: null },
          });
        }}
        title="Upload Deliverable"
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <p className="text-sm text-muted mb-4">
              Upload deliverable files for Order #{selectedOrder.id}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* JPG File Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">JPG File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.JPG,.JPEG"
                    onChange={(e) => handleFileSelect('jpg', e)}
                    className="hidden"
                    id="file-jpg"
                  />
                  <label htmlFor="file-jpg" className="cursor-pointer flex flex-col items-center gap-2">
                    <PaperClipIcon className="w-8 h-8 text-muted" />
                    <span className="text-sm text-primary font-medium">Click to upload JPG</span>
                  </label>
                </div>
                {uploadedFiles.jpg?.file && (
                  <div className="p-3 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      {uploadedFiles.jpg.preview && (
                        <img
                          src={uploadedFiles.jpg.preview}
                          alt={uploadedFiles.jpg.file.name}
                          className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{uploadedFiles.jpg.file.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(uploadedFiles.jpg.file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile('jpg')}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-error transition-colors"
                        title="Remove file"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PNG File Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">PNG File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".png,.PNG"
                    onChange={(e) => handleFileSelect('png', e)}
                    className="hidden"
                    id="file-png"
                  />
                  <label htmlFor="file-png" className="cursor-pointer flex flex-col items-center gap-2">
                    <PaperClipIcon className="w-8 h-8 text-muted" />
                    <span className="text-sm text-primary font-medium">Click to upload PNG</span>
                  </label>
                </div>
                {uploadedFiles.png?.file && (
                  <div className="p-3 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      {uploadedFiles.png?.preview && (
                        <img
                          src={uploadedFiles.png.preview}
                          alt={uploadedFiles.png.file.name}
                          className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{uploadedFiles.png.file.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(uploadedFiles.png.file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile('png')}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-error transition-colors"
                        title="Remove file"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mockup File Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Mockup File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".mockup,.jpg,.jpeg,.png,.JPG,.JPEG,.PNG"
                    onChange={(e) => handleFileSelect('mockup', e)}
                    className="hidden"
                    id="file-mockup"
                  />
                  <label htmlFor="file-mockup" className="cursor-pointer flex flex-col items-center gap-2">
                    <PaperClipIcon className="w-8 h-8 text-muted" />
                    <span className="text-sm text-primary font-medium">Click to upload Mockup</span>
                  </label>
                </div>
                {uploadedFiles.mockup?.file && (
                  <div className="p-3 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      {uploadedFiles.mockup.preview && (
                        <img
                          src={uploadedFiles.mockup.preview}
                          alt={uploadedFiles.mockup.file.name}
                          className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{uploadedFiles.mockup.file.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(uploadedFiles.mockup.file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile('mockup')}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-error transition-colors"
                        title="Remove file"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* EPS File Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">EPS File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".eps,.EPS"
                    onChange={(e) => handleFileSelect('eps', e)}
                    className="hidden"
                    id="file-eps"
                  />
                  <label htmlFor="file-eps" className="cursor-pointer flex flex-col items-center gap-2">
                    <PaperClipIcon className="w-8 h-8 text-muted" />
                    <span className="text-sm text-primary font-medium">Click to upload EPS</span>
                  </label>
                </div>
                {uploadedFiles.eps?.file && (
                  <div className="p-3 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{uploadedFiles.eps.file.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(uploadedFiles.eps.file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile('eps')}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-error transition-colors"
                        title="Remove file"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CDR File Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">CDR File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".cdr,.CDR"
                    onChange={(e) => handleFileSelect('cdr', e)}
                    className="hidden"
                    id="file-cdr"
                  />
                  <label htmlFor="file-cdr" className="cursor-pointer flex flex-col items-center gap-2">
                    <PaperClipIcon className="w-8 h-8 text-muted" />
                    <span className="text-sm text-primary font-medium">Click to upload CDR</span>
                  </label>
                </div>
                {uploadedFiles.cdr?.file && (
                  <div className="p-3 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{uploadedFiles.cdr.file.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(uploadedFiles.cdr.file.size)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile('cdr')}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-error/20 text-error transition-colors"
                        title="Remove file"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedOrder(null);
                  setUploadedFiles({
                    jpg: { file: null },
                    png: { file: null },
                    mockup: { file: null },
                    eps: { file: null },
                    cdr: { file: null },
                  });
                }}
                disabled={isUploading}
                title="Cancel"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSubmitUpload}
                disabled={!Object.values(uploadedFiles).some(f => f?.file) || isUploading}
                isLoading={isUploading}
                title="Upload"
              >
                <CheckIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Order Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={handleCloseRejectModal}
        title="Reject Order"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Please provide a reason for rejecting Order #{selectedOrder.id}.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field w-full min-h-[120px] resize-none"
                placeholder="Enter the reason for rejecting this order..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCloseRejectModal}
                disabled={isRejecting}
                title="Cancel"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="danger"
                onClick={handleSubmitRejection}
                disabled={!rejectionReason.trim() || isRejecting}
                isLoading={isRejecting}
                title="Submit Rejection"
              >
                <CheckIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* OrderComment Modal */}
      {selectedOrder && selectedOrder.orderId && (
        <OrderCommentModal
          isOpen={showChatModal}
          onClose={handleCloseChatModal}
          orderId={selectedOrder.orderId}
          orderTitle={selectedOrder.designTitle || `Order #${selectedOrder.id}`}
          orderType="custom"
        />
      )}

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={handleCloseImagePreview}
        title={previewImage?.fileName || 'Image Preview'}
        size="lg"
        zIndex={60}
        static={true}
      >
        {previewImage && previewImagesList.length > 0 && (
          <div className="space-y-4">
            <div className="relative w-full flex items-center justify-center bg-muted/10 rounded-lg p-4 min-h-[400px]">
              {/* Previous Button */}
              {previewImagesList.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviousImage();
                  }}
                  disabled={currentImageIndex === 0}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors"
                  title="Previous Image"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
              )}
              
              {/* Image */}
              <img
                src={previewImage.url}
                alt={previewImage.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                crossOrigin="anonymous"
                onError={async (e) => {
                  const img = e.target as HTMLImageElement;
                  // If the image failed to load and it's not already a blob URL, try fetching with auth
                  if (img.src && !img.src.startsWith('blob:') && !img.src.startsWith('data:')) {
                    try {
                      const token = getAuthToken();
                      const response = await fetch(img.src, {
                        method: 'GET',
                        headers: token ? {
                          'Authorization': `Bearer ${token}`,
                        } : {},
                      });

                      if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        img.src = blobUrl;
                        return;
                      }
                    } catch (fetchError) {
                      console.error('Error fetching image with auth:', fetchError);
                    }
                  }
                  
                  // If still fails, show error message
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent && !parent.querySelector('.error-message')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message w-full h-full flex items-center justify-center text-muted';
                    errorDiv.textContent = 'Image not available';
                    parent.appendChild(errorDiv);
                  }
                }}
              />
              
              {/* Next Button */}
              {previewImagesList.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  disabled={currentImageIndex === previewImagesList.length - 1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors"
                  title="Next Image"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              )}
            </div>
            
            {/* Image Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">Image {currentImageIndex + 1} of {previewImagesList.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const token = getAuthToken();
                    try {
                      const response = await fetch(previewImage.url, {
                        method: 'GET',
                        headers: token ? {
                          'Authorization': `Bearer ${token}`,
                        } : {},
                      });

                      if (!response.ok) {
                        throw new Error('Failed to download image');
                      }

                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = previewImage.fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                      console.error('Error downloading image:', error);
                      toast.error('Failed to download image. Please try again.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium transition-colors"
                  title="Download Image"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {previewImagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {previewImagesList.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setPreviewImage(img);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    title={img.fileName}
                  >
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
      </div>
    </DashboardLayout>
  );
}

