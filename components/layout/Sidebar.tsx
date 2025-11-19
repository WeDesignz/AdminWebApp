'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Designers', href: '/designers', icon: UserGroupIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Designs', href: '/designs', icon: PhotoIcon },
  { name: 'Bundles', href: '/bundles', icon: Squares2X2Icon },
  { name: 'Coupons', href: '/coupons', icon: TicketIcon },
  { name: 'Orders', href: '/orders', icon: ShoppingCartIcon },
  { name: 'Custom Orders', href: '/orders/custom', icon: ShoppingCartIcon },
  { name: 'Transactions', href: '/transactions', icon: CreditCardIcon },
  { name: 'Plans', href: '/plans', icon: CubeIcon },
  { name: 'Reports', href: '/reports', icon: ClipboardDocumentListIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
  { name: 'System Configs', href: '/system/configs', icon: Cog6ToothIcon },
  { name: 'Activity Log', href: '/activity-log', icon: ClipboardDocumentListIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 80 : 256 }}
      className="glass border-r border-border h-screen sticky top-0 flex flex-col"
    >
      <div className="p-6 flex items-center justify-between">
        {!sidebarCollapsed ? (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-primary"
            style={{
              background: 'linear-gradient(135deg, #6C5CE7 0%, #8B7FE8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WeDesignz
          </motion.h1>
        ) : (
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-muted/20 transition-colors ml-auto"
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          // Check exact match first
          let isActive = pathname === item.href;
          
          // For parent routes, check if pathname starts with href + '/'
          // But exclude if there's a more specific route that matches
          if (!isActive && pathname.startsWith(item.href + '/')) {
            // Check if there's a more specific route in navigation that also matches
            const hasMoreSpecificMatch = navigation.some(
              (otherItem) =>
                otherItem.href !== item.href &&
                pathname.startsWith(otherItem.href) &&
                otherItem.href.length > item.href.length
            );
            // Only mark as active if there's no more specific match
            isActive = !hasMoreSpecificMatch;
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary text-white font-medium shadow-lg'
                  : 'hover:bg-muted/10 text-muted hover:text-primary'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
