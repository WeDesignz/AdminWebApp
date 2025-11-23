/**
 * API Index
 * Exports the real API with MockAPI-compatible interface for gradual migration
 */

import API from './api';
import type {
  ApiResponse,
  KPIData,
  Notification,
  Admin,
  Designer,
  PaginatedResponse,
  Design,
  Customer,
  Order,
  CustomOrder,
  Plan,
  Bundle,
  Transaction,
  ActivityLog,
  SystemConfig,
} from '@/types';
import type { ListApiResponse } from './types';

/**
 * MockAPI-compatible interface using real API
 * This allows gradual migration from MockAPI to real API
 */
class RealAPI {
  // Auth methods
  static async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ requires2FA: boolean; tempToken?: string; user?: any }>> {
    const response = await API.auth.login(email, password);
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          requires2FA: response.data.requires2FA,
          tempToken: response.data.tempToken,
          user: response.data.user,
        },
      };
    }
    return response;
  }

  static async verify2FA(
    tempToken: string,
    code: string,
    userId?: number
  ): Promise<ApiResponse<{ admin: Admin; accessToken: string; refreshToken: string }>> {
    return API.auth.verify2FA(tempToken, code, userId);
  }

  static async logout(): Promise<ApiResponse<void>> {
    return API.auth.logout();
  }

  static async setup2FA(): Promise<ApiResponse<{
    user_id: number;
    email: string;
    secret_key: string;
    qr_code: string;
    backup_codes: string[];
  }>> {
    return API.auth.setup2FA();
  }

  static async enable2FA(code: string): Promise<ApiResponse<{
    message: string;
    backup_codes: string[];
  }>> {
    return API.auth.enable2FA(code);
  }

  static async disable2FA(password: string): Promise<ApiResponse<{
    message: string;
  }>> {
    return API.auth.disable2FA(password);
  }

  // Dashboard methods
  static async getKPIData(): Promise<ApiResponse<KPIData>> {
    return API.dashboard.getKPIData();
  }

  static async getRevenueAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    report_type?: string;
    include_refunds?: boolean;
    group_by?: string;
  }): Promise<ApiResponse<any>> {
    const response = await API.dashboard.getRevenueAnalytics(params);
    if (response.success && response.data) {
      return response;
    }

    return {
      success: false,
      data: {
        total_revenue: 0,
        period_breakdown: [],
      },
      error: response.error || 'Failed to fetch revenue analytics',
    };
  }

  static async getTopDesigners(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    sort_by?: string;
  }): Promise<ApiResponse<any>> {
    const response = await API.dashboard.getTopDesigners(params?.limit ?? 10);
    if (response.success && response.data) {
      return response;
    }

    return {
      success: false,
      data: {
        top_designers: [],
      },
      error: response.error || 'Failed to fetch top designers',
    };
  }

  // Notification methods
  static async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return API.notifications.getNotifications();
  }

  static async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return API.notifications.markNotificationAsRead(notificationId);
  }

  static async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return API.notifications.markAllNotificationsAsRead();
  }

  static async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return API.notifications.deleteNotification(notificationId);
  }

  static async createNotification(data: {
    title: string;
    message: string;
    priority: Notification['priority'];
    recipients: { designers?: boolean; customers?: boolean };
    sendType: 'immediate' | 'scheduled';
    scheduledAt?: string;
  }): Promise<ApiResponse<Notification>> {
    return API.notifications.createNotification(data);
  }

  // Designer methods
  static async getDesigners(params: {
    page?: number;
    limit?: number;
    search?: string;
    onboardingStatus?: string;
  }): Promise<ListApiResponse<Designer>> {
    const response = await API.designers.getDesigners(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch designers',
    };
  }

  static async getDesignerStats(): Promise<
    ApiResponse<{
      totalDesigners: number;
      pendingApproval: number;
      razorpayPending: number;
      rejected: number;
    }>
  > {
    return API.designers.getDesignerStats();
  }

  static async createDesigner(data: {
    step1: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      password: string;
      confirmPassword: string;
      profilePhoto?: string;
    };
    step2: {
      businessEmail: string;
      businessPhoneNumber: string;
      legalBusinessName: string;
      businessType: string;
      category: string;
      subcategory: string;
      businessModel: string;
      streetAddress: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
      panNumber: string;
      panDocumentFile?: string;
      gstNumber?: string;
      msmeNumber?: string;
    };
  }): Promise<ApiResponse<{ userId: number; designerProfileId: number; studioId?: number }>> {
    return API.designers.createDesigner(data);
  }

  // Design methods
  static async getDesigns(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ListApiResponse<Design>> {
    const response = await API.designs.getDesigns(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch designs',
    };
  }

  static async getDesign(designId: string): Promise<ApiResponse<Design>> {
    return API.designs.getDesign(designId);
  }

  static async getDesignStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>
  > {
    return API.designs.getDesignStats();
  }

  static async approveDesign(designId: string, data: { approved: boolean; reason?: string }): Promise<ApiResponse<void>> {
    return API.designs.approveDesign(designId, data);
  }

  static async flagDesign(designId: string, reason: string): Promise<ApiResponse<void>> {
    return API.designs.flagDesign(designId, reason);
  }

  static async resolveFlag(designId: string): Promise<ApiResponse<void>> {
    return API.designs.resolveFlag(designId);
  }

  // Customer methods
  static async getCustomers(params: {
    page?: number;
    limit?: number;
    status?: string;
    planStatus?: string;
    search?: string;
  }): Promise<ListApiResponse<Customer>> {
    const response = await API.customers.getCustomers(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch customers',
    };
  }

  static async getCustomerStats(): Promise<
    ApiResponse<{
      total: number;
      active: number;
      inactive: number;
      suspended: number;
    }>
  > {
    return API.customers.getCustomerStats();
  }

  static async updateCustomerStatus(
    customerId: string,
    status: Customer['status'],
    reason?: string
  ): Promise<ApiResponse<void>> {
    return API.customers.updateCustomerStatus(customerId, status, reason);
  }

  // Order methods
  static async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<ListApiResponse<Order>> {
    const response = await API.orders.getOrders(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch orders',
    };
  }

  static async getOrderStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      completed: number;
      cancelled: number;
    }>
  > {
    return API.orders.getOrderStats();
  }

  static async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return API.orders.getOrder(orderId);
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<ApiResponse<void>> {
    return API.orders.updateOrderStatus(orderId, status);
  }

  static async reconcileOrder(orderId: string): Promise<ApiResponse<void>> {
    return API.orders.reconcileOrder(orderId);
  }

  // Custom Order methods
  static async getCustomOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ListApiResponse<CustomOrder>> {
    const response = await API.customOrders.getCustomOrders(params);
    console.log('[RealAPI.getCustomOrders] Full Response:', JSON.stringify(response, null, 2));
    if (response.success && response.data) {
      // The getPaginated method already returns { data: { data: [...], pagination: {...} } }
      // So response.data is already the PaginatedResponse structure
      const paginatedData = response.data;
      
      // Transform API response (snake_case) to frontend format (camelCase)
      const transformedData = (paginatedData.data ?? []).map((order: any) => {
        const orderId = order.order_id ? String(order.order_id) : undefined;
        console.log('[RealAPI.getCustomOrders] Transforming order:', {
          customOrderId: order.id,
          order_id: order.order_id,
          orderId,
        });
        return {
          id: String(order.id),
          orderId, // Associated Order ID for comments
        customerId: String(order.created_by?.id || ''),
        customerName: order.created_by?.first_name && order.created_by?.last_name
          ? `${order.created_by.first_name} ${order.created_by.last_name}`.trim()
          : order.created_by?.username || order.created_by?.email || 'Unknown',
        designerId: order.assigned_to?.id ? String(order.assigned_to.id) : undefined,
        designerName: order.assigned_to?.first_name && order.assigned_to?.last_name
          ? `${order.assigned_to.first_name} ${order.assigned_to.last_name}`.trim()
          : order.assigned_to?.username || order.assigned_to?.email || undefined,
        description: order.description || '',
        budget: parseFloat(order.budget || 0),
        status: order.status || 'pending',
        paymentStatus: order.payment_status || undefined,
        slaDeadline: order.sla_deadline || order.slaDeadline || '',
        createdAt: order.created_at || order.createdAt || '',
        completedAt: order.completed_at || order.completedAt || undefined,
        designTitle: order.title || undefined,
        specification: order.description || undefined,
        referenceFiles: [], // TODO: Map from media if needed
        deliverables: (order.deliverables || []).map((d: any) => ({
          id: String(d.id),
          fileName: d.fileName || d.file_name || 'file',
          url: d.url || d.file_url || '',
          uploadedAt: d.uploadedAt || d.uploaded_at || new Date().toISOString(),
        })),
        deliveryFilesUploaded: order.delivery_files_uploaded || false,
        };
      });
      
      // Handle the paginated response structure
      const result = {
        success: true,
        data: transformedData,
        pagination: paginatedData.pagination,
      };
      console.log('[RealAPI.getCustomOrders] Result:', result);
      console.log('[RealAPI.getCustomOrders] Data length:', result.data.length);
      return result;
    }

    console.error('[RealAPI.getCustomOrders] Error:', response.error);
    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch custom orders',
    };
  }

  static async getCustomOrderStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
    }>
  > {
    return API.customOrders.getCustomOrderStats();
  }

  static async updateCustomOrderStatus(orderId: string, status: CustomOrder['status']): Promise<ApiResponse<void>> {
    return API.customOrders.updateCustomOrderStatus(orderId, status);
  }

  static async uploadDeliverables(orderId: string, files: FormData): Promise<ApiResponse<void>> {
    return API.customOrders.uploadDeliverables(orderId, files);
  }

  // Order Comments methods
  static async getOrderComments(orderId: string): Promise<ApiResponse<{
    order_id: number;
    order_type: string;
    order_title: string;
    comments: any[];
    total_comments: number;
  }>> {
    return API.orderComments.getOrderComments(orderId);
  }

  static async addOrderComment(orderId: string, message: string, isInternal?: boolean, mediaIds?: number[]): Promise<ApiResponse<any>> {
    return API.orderComments.addOrderComment(orderId, message, isInternal, mediaIds);
  }

  static async markOrderCommentsAsRead(orderId: string): Promise<ApiResponse<any>> {
    return API.orderComments.markOrderCommentsAsRead(orderId);
  }

  // Plan methods
  static async getPlans(): Promise<ApiResponse<Plan[]>> {
    return API.plans.getPlans();
  }

  static async createPlan(data: {
    planName: string;
    description: string | string[];
    price: number;
    duration: 'Monthly' | 'Annually';
    status: 'Active' | 'Inactive';
  }): Promise<ApiResponse<Plan & { was_reactivated?: boolean }>> {
    return API.plans.createPlan(data);
  }

  static async updatePlan(planId: string, data: Partial<Plan>): Promise<ApiResponse<Plan>> {
    return API.plans.updatePlan(planId, data);
  }

  static async deletePlan(planId: string): Promise<ApiResponse<void>> {
    return API.plans.deletePlan(planId);
  }

  // Bundle methods
  static async getBundles(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ListApiResponse<Bundle>> {
    const response = await API.bundles.getBundles(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch bundles',
    };
  }

  static async createBundle(data: {
    name: string;
    description?: string;
    designIds: string[];
    price: number;
    status: 'active' | 'inactive' | 'draft';
  }): Promise<ApiResponse<Bundle>> {
    return API.bundles.createBundle(data);
  }

  static async updateBundle(bundleId: string, data: Partial<Bundle>): Promise<ApiResponse<Bundle>> {
    return API.bundles.updateBundle(bundleId, data);
  }

  static async deleteBundle(bundleId: string): Promise<ApiResponse<void>> {
    return API.bundles.deleteBundle(bundleId);
  }

  // Transaction methods
  static async getTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ListApiResponse<Transaction>> {
    const response = await API.transactions.getTransactions(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch transactions',
    };
  }

  static async getTransactionStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      completed: number;
      failed: number;
    }>
  > {
    return API.transactions.getTransactionStats();
  }

  static async initiateRefund(transactionId: string, reason: string): Promise<ApiResponse<void>> {
    return API.transactions.initiateRefund(transactionId, reason);
  }

  static async getDesigner(designerId: string): Promise<ApiResponse<Designer>> {
    return API.transactions.getDesigner(designerId);
  }

  static async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    return API.transactions.getCustomer(customerId);
  }

  // System Config methods
  static async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    return API.systemConfig.getSystemConfig();
  }

  static async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    return API.systemConfig.updateSystemConfig(data);
  }

  static async getBusinessConfig(): Promise<ApiResponse<{
    commission_rate: number;
    gst_percentage: number;
    custom_order_time_slot_hours: number;
    minimum_required_designs_onboard: number;
  }>> {
    return API.systemConfig.getBusinessConfig();
  }

  // Admin Profile methods
  static async getAdminProfile(): Promise<ApiResponse<Admin>> {
    return API.settings.getAdminProfile();
  }

  static async updateAdminProfile(data: Partial<Admin>): Promise<ApiResponse<Admin>> {
    return API.settings.updateAdminProfile(data);
  }

  static async updateAdminPassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    return API.settings.updateAdminPassword(data);
  }

  // Activity Log methods
  static async getActivityLogs(params: {
    page?: number;
    limit?: number;
  }): Promise<ListApiResponse<ActivityLog>> {
    const response = await API.activityLogs.getActivityLogs(params);
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data ?? [],
        pagination: response.data.pagination,
      };
    }

    return {
      success: false,
      data: [],
      error: response.error || 'Failed to fetch activity logs',
    };
  }
}

// Export RealAPI as MockAPI for backward compatibility
// In production, you can switch this to use the real API
export const MockAPI = RealAPI;

// Export RealAPI directly
export { RealAPI };

// Also export the structured API
export { API };
export default API;

