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
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import { CustomOrder } from '@/types';
import { Input } from '@/components/common/Input';
import { KpiCard } from '@/components/common/KpiCard';
import { Dropdown } from '@/components/common/Dropdown';
import toast from 'react-hot-toast';

interface UploadedFile {
  file: File | null;
  preview?: string;
}

interface OrderComment {
  id: string;
  message: string;
  comment_type: 'customer' | 'admin' | 'system';
  created_by: {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  is_admin_response: boolean;
  media?: any[];
}

export default function CustomOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    jpg: UploadedFile;
    mockup: UploadedFile;
    eps: UploadedFile;
    crd: UploadedFile;
  }>({
    jpg: { file: null },
    mockup: { file: null },
    eps: { file: null },
    crd: { file: null },
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['custom-orders', search, statusFilter],
    queryFn: () => MockAPI.getCustomOrders({ search, status: statusFilter }),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['custom-order-stats'],
    queryFn: () => MockAPI.getCustomOrderStats(),
  });

  // Get order comments when chat modal is open
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['order-comments', selectedOrder?.id],
    queryFn: () => {
      if (!selectedOrder?.id) return Promise.resolve(null);
      // For custom orders, we need to get the associated Order ID
      // For now, using the custom order ID - may need to adjust based on backend
      return MockAPI.getOrderComments(selectedOrder.id);
    },
    enabled: showChatModal && !!selectedOrder?.id,
  });

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commentsData]);

  const getTimeRemainingShort = (deadline: string, status: string, createdAt: string, completedAt?: string) => {
    if (status === 'completed' || status === 'delivered') {
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
    setChatMessage('');
  };

  const handleSendMessage = async () => {
    if (!selectedOrder || !chatMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      // For custom orders, we need the associated Order ID
      // This might need adjustment based on your backend structure
      const orderId = selectedOrder.id;
      await MockAPI.addOrderComment(orderId, chatMessage.trim());
      setChatMessage('');
      refetchComments();
      toast.success('Message sent successfully');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setIsSendingMessage(false);
    }
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
      mockup: { file: null },
      eps: { file: null },
      crd: { file: null },
    });
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedOrder(null);
    setUploadedFiles({
      jpg: { file: null },
      mockup: { file: null },
      eps: { file: null },
      crd: { file: null },
    });
  };

  const handleFileSelect = (type: 'jpg' | 'mockup' | 'eps' | 'crd', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFile: UploadedFile = { file };

    if (type === 'jpg' || type === 'mockup') {
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

  const handleRemoveFile = (type: 'jpg' | 'mockup' | 'eps' | 'crd') => {
    setUploadedFiles((prev) => ({
      ...prev,
      [type]: { file: null },
    }));
  };

  const handleSubmitUpload = async () => {
    if (!selectedOrder) return;
    const hasFiles = uploadedFiles.jpg.file || uploadedFiles.mockup.file || uploadedFiles.eps.file || uploadedFiles.crd.file;
    if (!hasFiles) {
      toast.error('Please select at least one file to upload');
      return;
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (uploadedFiles.jpg.file) formData.append('jpg', uploadedFiles.jpg.file);
      if (uploadedFiles.mockup.file) formData.append('mockup', uploadedFiles.mockup.file);
      if (uploadedFiles.eps.file) formData.append('eps', uploadedFiles.eps.file);
      if (uploadedFiles.crd.file) formData.append('crd', uploadedFiles.crd.file);

      // TODO: Implement actual upload API call
      // await API.customOrders.uploadDeliverables(selectedOrder.id, formData);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate upload
      toast.success('Deliverables uploaded successfully');
      handleCloseUploadModal();
      refetch();
    } catch (error) {
      toast.error('Failed to upload deliverables');
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
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In-Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'success', label: 'Success' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Failed' },
  ];

  const orderStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In-Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'success', label: 'Success' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Failed' },
  ];

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
            (data.data || []).map((order) => (
              <div key={order.id} className="card hover:shadow-lg transition-shadow">
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
                        'bg-error/20 text-error'
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
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${
                      order.status === 'completed' || order.status === 'delivered'
                        ? 'bg-success/20 text-success'
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
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOpenChat(order)}
                    title="Reply to Chat"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Reply to Chat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUploadDeliverable(order)}
                    title="Upload Deliverable"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <PaperClipIcon className="w-4 h-4" />
                    Upload Deliverable
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewDetails(order)}
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
                      onChange={(value) => handleStatusChange(order.id, value)}
                      buttonClassName={updatingOrderId === order.id ? 'opacity-50 cursor-not-allowed' : ''}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="danger"
                    onClick={() => handleRejectOrder(order)}
                    title="Reject Order"
                    className="whitespace-nowrap"
                  >
                    Reject Order
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Order ID</label>
                  <p className="text-muted">#{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    selectedOrder.status === 'completed' ? 'bg-success/20 text-success' :
                    selectedOrder.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                    selectedOrder.status === 'pending' ? 'bg-warning/20 text-warning' :
                    'bg-error/20 text-error'
                  }`}>
                    {selectedOrder.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer</label>
                  <p className="text-muted">{selectedOrder.customerName}</p>
                </div>
                {selectedOrder.designerName && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Designer</label>
                    <p className="text-muted">{selectedOrder.designerName}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Budget</label>
                  <p className="text-muted font-semibold">{formatCurrency(selectedOrder.budget)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SLA Deadline</label>
                  <p className="text-muted">{formatDate(selectedOrder.slaDeadline)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Created At</label>
                  <p className="text-muted">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Design Title */}
            {selectedOrder.designTitle && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Design Title</h3>
                <p className="text-muted">{selectedOrder.designTitle}</p>
              </div>
            )}

            {/* Specification */}
            {selectedOrder.specification && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Specification</h3>
                <p className="text-muted whitespace-pre-wrap">{selectedOrder.specification}</p>
              </div>
            )}

            {/* Reference Files */}
            {selectedOrder.referenceFiles && selectedOrder.referenceFiles.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Reference Files</h3>
                <div className="space-y-3">
                  {selectedOrder.referenceFiles.map((file) => (
                    <div key={file.id} className="p-3 bg-muted/10 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{file.fileName}</p>
                        <p className="text-sm text-muted">{formatDate(file.uploadedAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                            View
                          </a>
                        )}
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            {selectedOrder.deliverables && selectedOrder.deliverables.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Deliverables</h3>
                <div className="space-y-3">
                  {selectedOrder.deliverables.map((file) => (
                    <div key={file.id} className="p-3 bg-muted/10 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{file.fileName}</p>
                        <p className="text-sm text-muted">{formatDate(file.uploadedAt)}</p>
                      </div>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedOrder.description && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Description</h3>
                <p className="text-muted">{selectedOrder.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Chat/OrderComment Modal */}
      <Modal
        isOpen={showChatModal}
        onClose={handleCloseChatModal}
        title={`Chat - Order #${selectedOrder?.id}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="flex flex-col h-[600px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
              {commentsData?.data?.comments && commentsData.data.comments.length > 0 ? (
                commentsData.data.comments.map((comment: OrderComment) => (
                  <div
                    key={comment.id}
                    className={`flex ${comment.comment_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        comment.comment_type === 'admin'
                          ? 'bg-primary text-white'
                          : comment.comment_type === 'system'
                          ? 'bg-muted/20 text-muted'
                          : 'bg-muted/10 text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {comment.created_by.first_name && comment.created_by.last_name
                            ? `${comment.created_by.first_name} ${comment.created_by.last_name}`
                            : comment.created_by.username}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                      {comment.media && comment.media.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {comment.media.map((media: any) => (
                            <a
                              key={media.id}
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline block"
                            >
                              {media.file_name || 'Attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-border pt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isSendingMessage}
                  isLoading={isSendingMessage}
                  title="Send Message"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Deliverable Modal - Keep existing implementation */}
      <Modal
        isOpen={showUploadModal}
        onClose={handleCloseUploadModal}
        title="Upload Deliverable"
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div>
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
                      accept=".jpg,.jpeg"
                      onChange={(e) => handleFileSelect('jpg', e)}
                      className="hidden"
                      id="file-jpg"
                    />
                    <label htmlFor="file-jpg" className="cursor-pointer flex flex-col items-center gap-2">
                      <PaperClipIcon className="w-8 h-8 text-muted" />
                      <span className="text-sm text-primary font-medium">Click to upload JPG</span>
                    </label>
                  </div>
                  {uploadedFiles.jpg.file && (
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

                {/* Mockup File Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Mockup File</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept=".mockup,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect('mockup', e)}
                      className="hidden"
                      id="file-mockup"
                    />
                    <label htmlFor="file-mockup" className="cursor-pointer flex flex-col items-center gap-2">
                      <PaperClipIcon className="w-8 h-8 text-muted" />
                      <span className="text-sm text-primary font-medium">Click to upload Mockup</span>
                    </label>
                  </div>
                  {uploadedFiles.mockup.file && (
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
                      accept=".eps"
                      onChange={(e) => handleFileSelect('eps', e)}
                      className="hidden"
                      id="file-eps"
                    />
                    <label htmlFor="file-eps" className="cursor-pointer flex flex-col items-center gap-2">
                      <PaperClipIcon className="w-8 h-8 text-muted" />
                      <span className="text-sm text-primary font-medium">Click to upload EPS</span>
                    </label>
                  </div>
                  {uploadedFiles.eps.file && (
                    <div className="p-3 bg-muted/10 rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-20 h-20 bg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <PaperClipIcon className="w-8 h-8 text-muted" />
                        </div>
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

                {/* CRD File Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">CRD File</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept=".crd"
                      onChange={(e) => handleFileSelect('crd', e)}
                      className="hidden"
                      id="file-crd"
                    />
                    <label htmlFor="file-crd" className="cursor-pointer flex flex-col items-center gap-2">
                      <PaperClipIcon className="w-8 h-8 text-muted" />
                      <span className="text-sm text-primary font-medium">Click to upload CRD</span>
                    </label>
                  </div>
                  {uploadedFiles.crd.file && (
                    <div className="p-3 bg-muted/10 rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-20 h-20 bg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <PaperClipIcon className="w-8 h-8 text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{uploadedFiles.crd.file.name}</p>
                          <p className="text-xs text-muted">{formatFileSize(uploadedFiles.crd.file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFile('crd')}
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
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseUploadModal} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitUpload}
                disabled={(!uploadedFiles.jpg.file && !uploadedFiles.mockup.file && !uploadedFiles.eps.file && !uploadedFiles.crd.file) || isUploading}
                isLoading={isUploading}
              >
                Upload
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
              <Button variant="outline" onClick={handleCloseRejectModal} disabled={isRejecting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleSubmitRejection}
                disabled={!rejectionReason.trim() || isRejecting}
                isLoading={isRejecting}
              >
                <CheckIcon className="w-4 h-4" />
                Submit Rejection
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

