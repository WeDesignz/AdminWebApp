'use client';

import { useState } from 'react';
import { Menu } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import {
  BellIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MockAPI } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils/cn';

export function Navbar() {
  const { admin, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch recent notifications (last 5)
  const { data: notificationsData } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: () => MockAPI.getNotifications(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const recentNotifications = (notificationsData?.data || []).slice(0, 5);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await MockAPI.logout();
      toast.success('Logged out successfully');
    } catch (error) {
      // Even if API call fails, we should still logout locally
      console.warn('Logout API call failed, but clearing local auth state:', error);
    } finally {
      // Always clear auth state and redirect, regardless of API call result
      logout();
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      router.push('/login');
    }
  };

  return (
    <>
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-end px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/20 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <MoonIcon className="w-5 h-5" />
              ) : (
                <SunIcon className="w-5 h-5" />
              )}
            </button>

            <Menu as="div" className="relative">
              <Menu.Button className="p-2 rounded-lg hover:bg-muted/20 transition-colors relative">
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
                )}
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg p-2 focus:outline-none bg-white dark:bg-gray-800 z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="px-3 py-2">
                  <h3 className="text-sm font-semibold">Recent Notifications</h3>
                </div>
                <div className="overflow-y-auto flex-1">
                  {recentNotifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted">
                      No notifications
                    </div>
                  ) : (
                    <div className="py-1">
                      {recentNotifications.map((notification) => (
                        <Menu.Item key={notification.id}>
                          {({ active }) => (
                            <div
                              className={`${
                                active ? 'bg-muted/10' : ''
                              } px-3 py-2.5 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-primary/5' : ''
                              }`}
                              onClick={() => router.push('/notifications')}
                            >
                              <div className="flex items-start gap-2">
                                {!notification.read && (
                                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${
                                    !notification.read ? 'font-semibold' : ''
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-muted line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted mt-1">
                                    {formatRelativeTime(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/notifications')}
                    className="w-full"
                  >
                    Show All Notifications
                  </Button>
                </div>
              </Menu.Items>
            </Menu>

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                <div className="text-right">
                  <p className="text-sm font-medium">{admin?.name}</p>
                  <p className="text-xs text-muted">{admin?.role}</p>
                </div>
                {admin?.avatar ? (
                  <img
                    src={admin.avatar}
                    alt={admin.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="w-8 h-8" />
                )}
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg p-2 focus:outline-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => router.push('/settings')}
                      className={`${
                        active ? 'bg-muted/10' : ''
                      } flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors`}
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      <span>Profile Settings</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className={`${
                        active ? 'bg-muted/10' : ''
                      } flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-error`}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </header>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        size="sm"
      >
        <p className="text-muted mb-6">Are you sure you want to logout?</p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowLogoutModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
            isLoading={isLoggingOut}
          >
            Logout
          </Button>
        </div>
      </Modal>
    </>
  );
}
