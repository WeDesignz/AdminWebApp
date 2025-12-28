'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  UsersIcon,
  PhotoIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CubeIcon,
  BellIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CameraIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils/cn';

// Categorized navigation structure
const navigationCategories = [
  {
    name: 'Overview',
    items: [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    ],
  },
  {
    name: 'User Management',
    items: [
  { name: 'Designers', href: '/designers', icon: UserGroupIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
    ],
  },
  {
    name: 'Content Management',
    items: [
  { name: 'Designs', href: '/designs', icon: PhotoIcon },
  { name: 'Coupons', href: '/coupons', icon: TicketIcon },
      { 
        name: 'Instagram Posts', 
        href: '/instagram-posts', 
        icon: CameraIcon,
      },
      { 
        name: 'Plans', 
        href: '/plans', 
        icon: CubeIcon,
        restrictedTo: ['Super Admin'],
      },
    ],
  },
  {
    name: 'Orders & Payments',
    items: [
      { 
        name: 'Orders & Transactions', 
        href: '/orders', 
        icon: ShoppingCartIcon,
        restrictedTo: ['Super Admin'],
      },
      { name: 'Custom Orders', href: '/custom-orders', icon: WrenchScrewdriverIcon },
      { 
        name: 'Settlements', 
        href: '/settlements', 
        icon: CreditCardIcon,
        restrictedTo: ['Super Admin'],
      },
      { 
        name: 'TDS', 
        href: '/tds', 
        icon: DocumentTextIcon,
        restrictedTo: ['Super Admin'],
      },
    ],
  },
  {
    name: 'Support & Communication',
    items: [
  { name: 'Support', href: '/support', icon: ChatBubbleLeftRightIcon },
  { name: 'FAQ', href: '/faq', icon: QuestionMarkCircleIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
    ],
  },
  {
    name: 'Reports & Analytics',
    items: [
      { 
        name: 'Reports', 
        href: '/reports', 
        icon: ClipboardDocumentListIcon,
        restrictedTo: ['Super Admin'],
      },
    ],
  },
  {
    name: 'Administration',
    items: [
      { 
        name: 'Moderator', 
        href: '/admin-users', 
        icon: ShieldCheckIcon, 
        restrictedTo: ['Super Admin'],
      },
      { 
        name: 'Permission Groups', 
        href: '/permission-groups', 
        icon: ShieldCheckIcon, 
        restrictedTo: ['Super Admin'],
        disabled: true, // Locked for now - will be enabled when micro-permissions are needed
      },
      { 
        name: 'System Configs', 
        href: '/system/configs', 
        icon: Cog6ToothIcon, 
        restrictedTo: ['Super Admin'],
      },
      { 
        name: 'Activity Log', 
        href: '/activity-log', 
        icon: ClipboardDocumentListIcon,
        restrictedTo: ['Super Admin'],
      },
  { name: 'Settings', href: '/settings', icon: CogIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, theme } = useUIStore();
  const { hasRole } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Ensure consistent initial render to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use static initial values for server render, then update after mount
  const displayCollapsed = mounted ? sidebarCollapsed : false;
  const displayTheme = mounted ? theme : 'light';
  const displayWidth = displayCollapsed ? 80 : 256;

  // Check if user has access to a menu item
  // On server, return true for all items to prevent hydration mismatch
  // After mount, check actual role permissions
  const hasAccess = (item: any) => {
    if (!item.restrictedTo) return true;
    // Before mount (server-side), show all items to ensure consistent rendering
    if (!mounted) return true;
    return hasRole(item.restrictedTo);
  };

  // Check if item should be shown (including disabled items for Super Admins)
  const shouldShowItem = (item: any) => {
    // If item is disabled, only show to Super Admins
    if (item.disabled) {
      if (!mounted) return true; // Show on server to prevent hydration mismatch
      return hasRole('Super Admin');
    }
    return hasAccess(item);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: displayWidth }}
      className="bg-card border-r border-border/50 h-screen sticky top-0 flex flex-col shadow-sm"
    >
      {/* Logo Section */}
      <div className="p-5 flex items-center border-b border-border/50">
        {!displayCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <img
              src="/Logos/ONLY LOGO.png"
              alt="WeDesignz Logo"
              className={`h-8 w-8 object-contain ${displayTheme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`}
            />
            <img
              src="/Logos/ONLY TEXT.png"
              alt="WeDesignz"
              className={`h-5 w-auto object-contain ${displayTheme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`}
            />
          </motion.div>
        ) : (
          <div className="flex justify-center w-full">
            <img
              src="/Logos/ONLY LOGO.png"
              alt="WeDesignz"
              className={`w-8 h-8 object-contain ${displayTheme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto scrollbar-thin">
        {navigationCategories.map((category, categoryIndex) => {
          // Filter items based on access - include disabled items for Super Admins
          // Only filter after mount to prevent hydration mismatch
          const visibleItems = mounted 
            ? category.items.filter(shouldShowItem)
            : category.items; // Show all items on server
          
          // Don't render category if no visible items (only check after mount)
          if (mounted && visibleItems.length === 0) return null;

          return (
            <div key={category.name} className="space-y-1.5">
              {/* Category Header - Only show when not collapsed */}
              {!displayCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: categoryIndex * 0.03 }}
                  className="px-3 py-1.5"
                >
                  <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    {category.name}
                  </h3>
                </motion.div>
              )}
              
              {/* Category Items */}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  // Check exact match first
                  let isActive = pathname === item.href;
                  
                  // For parent routes, check if pathname starts with href + '/'
                  if (!isActive && pathname.startsWith(item.href + '/')) {
                    const hasMoreSpecificMatch = navigationCategories.some(
                      (cat) => cat.items.some(
                        (otherItem) =>
                          otherItem.href !== item.href &&
                          pathname.startsWith(otherItem.href) &&
                          otherItem.href.length > item.href.length
                      )
                    );
                    isActive = !hasMoreSpecificMatch;
                  }

                  // If item is disabled, show locked state
                  if (item.disabled && mounted) {
                    return (
                      <div
                        key={item.name}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                          'opacity-40 cursor-not-allowed',
                          'text-muted-foreground/50'
                        )}
                        title={displayCollapsed ? `${item.name} (Locked)` : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!displayCollapsed && (
                          <>
                            <span className="truncate flex-1 text-sm">{item.name}</span>
                            <LockClosedIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
                          </>
                        )}
                      </div>
                    );
                  }

                  // Normal accessible item
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                        isActive
                          ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                      title={displayCollapsed ? item.name : undefined}
                    >
                      <item.icon className={cn(
                        'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                        isActive ? 'text-white' : 'group-hover:scale-110'
                      )} />
                      {!displayCollapsed && (
                        <span className="truncate text-sm font-medium">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );
}
