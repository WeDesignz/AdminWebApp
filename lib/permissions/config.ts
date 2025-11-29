/**
 * Permission System Configuration
 * 
 * This file defines all available permissions in the AdminWebApp.
 * Permissions follow a hierarchical naming pattern: resource.action
 * 
 * Examples:
 * - 'designs.view' - View designs
 * - 'designs.approve' - Approve designs
 * - 'designs.reject' - Reject designs
 */

export type Permission =
  // Dashboard
  | 'dashboard.view'
  
  // Designers
  | 'designers.view'
  | 'designers.approve'
  | 'designers.reject'
  | 'designers.suspend'
  | 'designers.wallet.manage'
  | 'designers.onboarding.verify'
  
  // Customers
  | 'customers.view'
  | 'customers.activate'
  | 'customers.deactivate'
  | 'customers.history.view'
  
  // Designs
  | 'designs.view'
  | 'designs.approve'
  | 'designs.reject'
  | 'designs.flag'
  | 'designs.delete'
  
  // Orders
  | 'orders.view'
  | 'orders.update_status'
  | 'orders.refund'
  | 'orders.view_details'
  
  // Custom Orders
  | 'custom_orders.view'
  | 'custom_orders.approve'
  | 'custom_orders.reject'
  | 'custom_orders.upload_deliverables'
  | 'custom_orders.update_status'
  
  // Plans
  | 'plans.view'
  | 'plans.create'
  | 'plans.update'
  | 'plans.delete'
  
  // Coupons
  | 'coupons.view'
  | 'coupons.create'
  | 'coupons.update'
  | 'coupons.delete'
  
  // Bundles
  | 'bundles.view'
  | 'bundles.create'
  | 'bundles.update'
  | 'bundles.delete'
  
  // Notifications
  | 'notifications.view'
  | 'notifications.create'
  | 'notifications.send'
  
  // System Configs
  | 'system_configs.view'
  | 'system_configs.update'
  
  // Activity Log
  | 'activity_log.view'
  
  // Admin Users (Super Admin only)
  | 'admin_users.manage'
  
  // Settings
  | 'settings.view'
  | 'settings.update'
  
  // Support
  | 'support.view'
  | 'support.respond'
  
  // Contract Workers
  | 'contract_workers.view'
  | 'contract_workers.manage'
  
  // Reports/Analytics
  | 'reports.view'
  | 'analytics.view';

/**
 * Default permissions for Moderators
 * These are the permissions granted to moderators by default
 */
export const MODERATOR_DEFAULT_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'designers.view',
  'designers.approve',
  'designers.reject',
  'designers.onboarding.verify',
  'customers.view',
  'customers.history.view',
  'designs.view',
  'designs.approve',
  'designs.reject',
  'designs.flag',
  'orders.view',
  'orders.view_details',
  'custom_orders.view',
  'custom_orders.approve',
  'custom_orders.reject',
  'custom_orders.upload_deliverables',
  'custom_orders.update_status',
  'plans.view',
  'coupons.view',
  'notifications.view',
  'notifications.create',
  'notifications.send',
  'activity_log.view',
  'support.view',
  'support.respond',
  'contract_workers.view',
];

/**
 * Permission groups for easy management
 * Groups related permissions together
 */
export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  dashboard: ['dashboard.view'],
  
  designers: [
    'designers.view',
    'designers.approve',
    'designers.reject',
    'designers.suspend',
    'designers.wallet.manage',
    'designers.onboarding.verify',
  ],
  
  customers: [
    'customers.view',
    'customers.activate',
    'customers.deactivate',
    'customers.history.view',
  ],
  
  designs: [
    'designs.view',
    'designs.approve',
    'designs.reject',
    'designs.flag',
    'designs.delete',
  ],
  
  orders: [
    'orders.view',
    'orders.update_status',
    'orders.refund',
    'orders.view_details',
  ],
  
  custom_orders: [
    'custom_orders.view',
    'custom_orders.approve',
    'custom_orders.reject',
    'custom_orders.upload_deliverables',
    'custom_orders.update_status',
  ],
  
  plans: [
    'plans.view',
    'plans.create',
    'plans.update',
    'plans.delete',
  ],
  
  coupons: [
    'coupons.view',
    'coupons.create',
    'coupons.update',
    'coupons.delete',
  ],
  
  bundles: [
    'bundles.view',
    'bundles.create',
    'bundles.update',
    'bundles.delete',
  ],
  
  notifications: [
    'notifications.view',
    'notifications.create',
    'notifications.send',
  ],
  
  system: [
    'system_configs.view',
    'system_configs.update',
  ],
  
  activity_log: [
    'activity_log.view',
  ],
  
  admin_users: [
    'admin_users.manage',
  ],
  
  settings: [
    'settings.view',
    'settings.update',
  ],
  
  support: [
    'support.view',
    'support.respond',
  ],
  
  contract_workers: [
    'contract_workers.view',
    'contract_workers.manage',
  ],
  
  reports: [
    'reports.view',
    'analytics.view',
  ],
};

/**
 * Get all available permissions
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSION_GROUPS).flat();
}

/**
 * Get permissions for a specific group
 */
export function getPermissionsByGroup(group: string): Permission[] {
  return PERMISSION_GROUPS[group] || [];
}

/**
 * Get all permission groups
 */
export function getPermissionGroups(): string[] {
  return Object.keys(PERMISSION_GROUPS);
}

