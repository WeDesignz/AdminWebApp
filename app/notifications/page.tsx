'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
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
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => MockAPI.getNotifications(),
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
      const response = await MockAPI.markNotificationAsRead(notificationId);
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
      const response = await MockAPI.deleteNotification(notificationId);
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
      const response = await MockAPI.markAllNotificationsAsRead();
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
    });
  };

  const handleSubmitCreate = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Please fill in title and message');
      return;
    }

    if (!formData.recipients.designers && !formData.recipients.customers) {
      toast.error('Please select at least one recipient type');
      return;
    }

    if (formData.sendType === 'scheduled' && !formData.scheduledDateTime) {
      toast.error('Please select a scheduled date and time');
      return;
    }

    setIsCreating(true);
    try {
      const notificationData = {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipients: formData.recipients,
        sendType: formData.sendType,
        scheduledAt: formData.sendType === 'scheduled' ? formData.scheduledDateTime : undefined,
      };

      const response = await MockAPI.createNotification(notificationData);
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
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-error">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter notification title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Message <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input-field w-full min-h-[100px] resize-none"
              placeholder="Enter notification message"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Priority <span className="text-error">*</span>
            </label>
            <Dropdown
              options={priorityOptions}
              value={formData.priority}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  priority: value as 'low' | 'medium' | 'high' | 'critical',
                })
              }
              placeholder="Select Priority"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Recipients <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.recipients.designers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recipients: {
                        ...formData.recipients,
                        designers: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Designers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.recipients.customers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recipients: {
                        ...formData.recipients,
                        customers: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Customers</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Send Type <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="immediate"
                  checked={formData.sendType === 'immediate'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sendType: e.target.value as 'immediate' | 'scheduled',
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Send Immediately</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="scheduled"
                  checked={formData.sendType === 'scheduled'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sendType: e.target.value as 'immediate' | 'scheduled',
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Schedule Notification</span>
              </label>
            </div>
          </div>

          {formData.sendType === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Scheduled Date & Time <span className="text-error">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduledDateTime}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledDateTime: e.target.value })
                }
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCloseCreateModal}
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
              <CheckIcon className="w-4 h-4" />
              {formData.sendType === 'immediate' ? 'Send Notification' : 'Schedule Notification'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
