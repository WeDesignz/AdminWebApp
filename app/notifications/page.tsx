'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils/cn';
import { Button } from '@/components/common/Button';
import { Notification } from '@/types';
import { useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Dropdown } from '@/components/common/Dropdown';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    message?: string;
    recipients?: string;
    scheduledDateTime?: string;
  }>({});
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    recipients: {
      designers: false,
      customers: false,
    },
    sendType: 'immediate' as 'immediate' | 'scheduled',
    scheduledDateTime: '',
    deliveryMethod: 'in_app' as 'in_app' | 'email' | 'both',
  });

  // Character limits
  const TITLE_MAX_LENGTH = 100;
  const MESSAGE_MAX_LENGTH = 500;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => RealAPI.getNotifications(),
  });

  const notifications = data?.data || [];

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true; // 'all'
  });

  // Count unread and read
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const handleMarkAsRead = async (notificationId: string) => {
    setProcessingIds((prev) => new Set(prev).add(notificationId));
    try {
      const response = await RealAPI.markNotificationAsRead(notificationId);
      if (response.success) {
        toast.success('Notification marked as read');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error(response.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    setProcessingIds((prev) => new Set(prev).add(notificationId));
    try {
      const response = await RealAPI.deleteNotification(notificationId);
      if (response.success) {
        toast.success('Notification deleted');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error(response.error || 'Failed to delete notification');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const response = await RealAPI.markAllNotificationsAsRead();
      if (response.success) {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error('Failed to mark all notifications as read');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      message: '',
      priority: 'medium',
      recipients: {
        designers: false,
        customers: false,
      },
      sendType: 'immediate',
      scheduledDateTime: '',
      deliveryMethod: 'in_app',
    });
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: '',
      message: '',
      priority: 'medium',
      recipients: {
        designers: false,
        customers: false,
      },
      sendType: 'immediate',
      scheduledDateTime: '',
      deliveryMethod: 'in_app',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > TITLE_MAX_LENGTH) {
      errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or less`;
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.length > MESSAGE_MAX_LENGTH) {
      errors.message = `Message must be ${MESSAGE_MAX_LENGTH} characters or less`;
    }

    if (!formData.recipients.designers && !formData.recipients.customers) {
      errors.recipients = 'Please select at least one recipient type';
    }

    if (formData.sendType === 'scheduled' && !formData.scheduledDateTime) {
      errors.scheduledDateTime = 'Please select a scheduled date and time';
    } else if (formData.sendType === 'scheduled' && formData.scheduledDateTime) {
      const scheduledDate = new Date(formData.scheduledDateTime);
      const now = new Date();
      if (scheduledDate <= now) {
        errors.scheduledDateTime = 'Scheduled time must be in the future';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        recipients: formData.recipients,
        sendType: formData.sendType,
        scheduledAt: formData.sendType === 'scheduled' ? formData.scheduledDateTime : undefined,
        deliveryMethod: formData.deliveryMethod,
      };

      const response = await RealAPI.createNotification(notificationData);
      if (response.success) {
        toast.success(
          formData.sendType === 'immediate'
            ? 'Notification sent successfully'
            : 'Notification scheduled successfully'
        );
        handleCloseCreateModal();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error(response.error || 'Failed to create notification');
      }
    } catch (error) {
      toast.error('An error occurred while creating notification');
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-error/20 text-error';
      case 'high':
        return 'bg-warning/20 text-warning';
      case 'medium':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted/20 text-muted';
    }
  };

  const getPriorityCardColor = (priority: string, isSelected: boolean) => {
    const baseClasses = 'border-2 transition-all duration-200 cursor-pointer rounded-xl p-4 hover:shadow-md';
    const selectedClasses = isSelected ? 'ring-2 ring-offset-2' : '';
    
    switch (priority) {
      case 'critical':
        return `${baseClasses} ${selectedClasses} ${
          isSelected 
            ? 'bg-error/10 border-error ring-error/50' 
            : 'bg-error/5 border-error/30 hover:border-error/60'
        }`;
      case 'high':
        return `${baseClasses} ${selectedClasses} ${
          isSelected 
            ? 'bg-warning/10 border-warning ring-warning/50' 
            : 'bg-warning/5 border-warning/30 hover:border-warning/60'
        }`;
      case 'medium':
        return `${baseClasses} ${selectedClasses} ${
          isSelected 
            ? 'bg-primary/10 border-primary ring-primary/50' 
            : 'bg-primary/5 border-primary/30 hover:border-primary/60'
        }`;
      default:
        return `${baseClasses} ${selectedClasses} ${
          isSelected 
            ? 'bg-muted/20 border-muted ring-muted/50' 
            : 'bg-muted/10 border-muted/30 hover:border-muted/60'
        }`;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5" />;
      default:
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted mt-1">Real-time alerts and updates</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Notification
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || unreadCount === 0}
              isLoading={isMarkingAll}
              className="flex items-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
            Mark All as Read
          </Button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted/20 text-muted hover:bg-muted/30'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-muted/20 text-muted hover:bg-muted/30'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-muted/20 text-muted hover:bg-muted/30'
            }`}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="card text-center py-12">
              <BellIcon className="w-12 h-12 mx-auto text-muted mb-3" />
              <p className="text-muted">
                {filter === 'all'
                  ? 'No notifications yet'
                  : filter === 'unread'
                  ? 'No unread notifications'
                  : 'No read notifications'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isProcessing = processingIds.has(notification.id);
              return (
              <div
                key={notification.id}
                  className={`card ${
                    !notification.read ? 'ring-2 ring-primary/20' : ''
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{notification.title}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityColor(
                            notification.priority
                          )}`}
                        >
                        {notification.priority}
                      </span>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                        )}
                    </div>
                    <p className="text-muted text-sm mb-2">{notification.message}</p>
                      <p className="text-xs text-muted">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                  </div>
                  
                    {/* Action Icons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.read && (
                    <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={isProcessing}
                          className="p-2 hover:bg-success/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mark as read"
                    >
                          <CheckIcon className="w-5 h-5 text-success" />
                    </button>
                  )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={isProcessing}
                        className="p-2 hover:bg-error/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete notification"
                      >
                        <TrashIcon className="w-5 h-5 text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create Notification"
        size="xl"
      >
        <div className="space-y-6">
          {/* Title Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">
                Title <span className="text-error">*</span>
              </label>
              <span className={`text-xs ${
                formData.title.length > TITLE_MAX_LENGTH 
                  ? 'text-error' 
                  : 'text-muted'
              }`}>
                {formData.title.length}/{TITLE_MAX_LENGTH}
              </span>
            </div>
            <Input
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
              }}
              onBlur={() => validateForm()}
              placeholder="e.g., System Maintenance Notice"
              error={formErrors.title}
              helperText="A concise title that clearly describes the notification"
              maxLength={TITLE_MAX_LENGTH}
              required
            />
          </div>

          {/* Message Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">
                Message <span className="text-error">*</span>
              </label>
              <span className={`text-xs ${
                formData.message.length > MESSAGE_MAX_LENGTH 
                  ? 'text-error' 
                  : 'text-muted'
              }`}>
                {formData.message.length}/{MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              value={formData.message}
              onChange={(e) => {
                setFormData({ ...formData, message: e.target.value });
                if (formErrors.message) setFormErrors({ ...formErrors, message: undefined });
              }}
              onBlur={() => validateForm()}
              className={`input-field w-full min-h-[120px] resize-y ${
                formErrors.message ? 'ring-2 ring-error' : ''
              }`}
              placeholder="Enter the full notification message here..."
              maxLength={MESSAGE_MAX_LENGTH}
              required
            />
            {formErrors.message && (
              <p className="mt-1 text-sm text-error">{formErrors.message}</p>
            )}
            {!formErrors.message && (
              <p className="mt-1 text-xs text-muted">
                Provide detailed information that recipients need to know
              </p>
            )}
          </div>

          {/* Priority Section */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Priority Level <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priorityOptions.map((option) => {
                const isSelected = formData.priority === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        priority: option.value as 'low' | 'medium' | 'high' | 'critical',
                      })
                    }
                    className={getPriorityCardColor(option.value, isSelected)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`${isSelected ? getPriorityColor(option.value as Notification['priority']).split(' ')[1] : 'text-muted'}`}>
                        {getPriorityIcon(option.value)}
                      </div>
                      <span className={`text-sm font-medium ${
                        isSelected ? 'font-semibold' : ''
                      }`}>
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              Select the urgency level for this notification
            </p>
          </div>

          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Recipients <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    recipients: {
                      ...formData.recipients,
                      designers: !formData.recipients.designers,
                    },
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
                  formData.recipients.designers
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                } ${formErrors.recipients ? 'border-error' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.recipients.designers
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.recipients.designers && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Designers</span>
                    </div>
                    <p className="text-xs text-muted mt-1">Send to all designers</p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    recipients: {
                      ...formData.recipients,
                      customers: !formData.recipients.customers,
                    },
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
                  formData.recipients.customers
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                } ${formErrors.recipients ? 'border-error' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.recipients.customers
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.recipients.customers && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Customers</span>
                    </div>
                    <p className="text-xs text-muted mt-1">Send to all customers</p>
                  </div>
                </div>
              </button>
            </div>
            {formErrors.recipients && (
              <p className="mt-2 text-sm text-error">{formErrors.recipients}</p>
            )}
            {!formErrors.recipients && (
              <p className="mt-2 text-xs text-muted">
                Select one or more recipient groups
              </p>
            )}
          </div>

          {/* Send Type Section */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Delivery Option <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sendType: 'immediate',
                    scheduledDateTime: '',
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md text-left ${
                  formData.sendType === 'immediate'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.sendType === 'immediate'
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.sendType === 'immediate' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PaperAirplaneIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Send Immediately</span>
                    </div>
                    <p className="text-xs text-muted">
                      Notification will be sent right away
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sendType: 'scheduled',
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md text-left ${
                  formData.sendType === 'scheduled'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.sendType === 'scheduled'
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.sendType === 'scheduled' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDaysIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Schedule Later</span>
                    </div>
                    <p className="text-xs text-muted">
                      Send at a specific date and time
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Method Section */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Notification Method <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    deliveryMethod: 'in_app',
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md text-left ${
                  formData.deliveryMethod === 'in_app'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.deliveryMethod === 'in_app'
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.deliveryMethod === 'in_app' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BellIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">In-App Only</span>
                    </div>
                    <p className="text-xs text-muted">
                      Create in-app notification (visible in dashboard, no email)
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    deliveryMethod: 'email',
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md text-left ${
                  formData.deliveryMethod === 'email'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.deliveryMethod === 'email'
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.deliveryMethod === 'email' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <EnvelopeIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Email Only</span>
                    </div>
                    <p className="text-xs text-muted">
                      Create in-app notification + send email
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    deliveryMethod: 'both',
                  })
                }
                className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md text-left ${
                  formData.deliveryMethod === 'both'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2'
                    : 'border-border bg-muted/5 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.deliveryMethod === 'both'
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {formData.deliveryMethod === 'both' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <DevicePhoneMobileIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium">Both</span>
                    </div>
                    <p className="text-xs text-muted">
                      Create in-app notification + send email
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Choose how to deliver the notification to recipients
            </p>
          </div>

          {/* Scheduled Date & Time */}
          {formData.sendType === 'scheduled' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold mb-2">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Scheduled Date & Time <span className="text-error">*</span>
                </div>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduledDateTime}
                onChange={(e) => {
                  setFormData({ ...formData, scheduledDateTime: e.target.value });
                  if (formErrors.scheduledDateTime) {
                    setFormErrors({ ...formErrors, scheduledDateTime: undefined });
                  }
                }}
                onBlur={() => validateForm()}
                error={formErrors.scheduledDateTime}
                helperText="Select a future date and time for delivery"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCloseCreateModal}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitCreate}
              disabled={isCreating}
              isLoading={isCreating}
              className="flex items-center gap-2"
            >
              {formData.sendType === 'immediate' ? (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Send Now
                </>
              ) : (
                <>
                  <CalendarDaysIcon className="w-4 h-4" />
                  Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
