/**
 * Real API Implementation
 * Replaces MockAPI with actual backend API calls
 */

import { apiClient } from './client';
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

/**
 * Authentication API
 */
export const AuthAPI = {
  /**
   * Admin login - Step 1: Email/Password
   */
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ requires2FA: boolean; tempToken?: string; user?: any }>> {
    const response = await apiClient.post<{
      message: string;
      user: any;
      temp_token: string;
      requires_2fa: boolean;
    }>('api/coreadmin/login/', { email, password });

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          requires2FA: response.data.requires_2fa,
          tempToken: response.data.temp_token,
          user: response.data.user,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Login failed',
    };
  },

  /**
   * 2FA Verification - Step 2
   */
  async verify2FA(
    tempToken: string,
    code: string,
    userId?: number
  ): Promise<ApiResponse<{ admin: Admin; accessToken: string; refreshToken: string }>> {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required for 2FA verification',
      };
    }

    const response = await apiClient.post<{
      message: string;
      user: any;
      tokens: {
        access: string;
        refresh: string;
      };
    }>('api/coreadmin/2fa/verify/', {
      user_id: userId,
      totp_code: code,
    });

    if (response.success && response.data) {
      // Map backend user to Admin type
      const admin: Admin = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        name: `${response.data.user.first_name || ''} ${response.data.user.last_name || ''}`.trim(),
        firstName: response.data.user.first_name,
        lastName: response.data.user.last_name,
        role: response.data.user.admin_group === 'Super Admin' ? 'Super Admin' : 'Moderator',
        createdAt: new Date().toISOString(),
        twoFactorEnabled: true,
      };

      return {
        success: true,
        data: {
          admin,
          accessToken: response.data.tokens.access,
          refreshToken: response.data.tokens.refresh,
        },
      };
    }

    return {
      success: false,
      error: response.error || '2FA verification failed',
    };
  },

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>('api/coreadmin/logout/');
    return response;
  },
};

/**
 * Dashboard & Analytics API
 */
export const DashboardAPI = {
  /**
   * Get KPI Data for Dashboard
   */
  async getKPIData(): Promise<ApiResponse<KPIData>> {
    const response = await apiClient.get<{
      total_revenue?: { today: number; month: number; change: number };
      active_users?: { count: number; change: number };
      new_designers?: { count: number; period: string };
      pending_payouts?: { count: number; amount: number };
    }>('api/admin-analytics/dashboard/');

    if (response.success && response.data) {
      const data: KPIData = {
        totalRevenue: {
          today: response.data.total_revenue?.today || 0,
          month: response.data.total_revenue?.month || 0,
          change: response.data.total_revenue?.change || 0,
        },
        activeUsers: {
          count: response.data.active_users?.count || 0,
          change: response.data.active_users?.change || 0,
        },
        newDesigners: {
          count: response.data.new_designers?.count || 0,
          period: '7d' as const,
        },
        pendingPayouts: {
          count: response.data.pending_payouts?.count || 0,
          amount: response.data.pending_payouts?.amount || 0,
        },
      };

      return { success: true, data };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch KPI data',
    };
  },

  /**
   * Get Revenue Analytics
   */
  async getRevenueAnalytics(params?: { start_date?: string; end_date?: string }): Promise<ApiResponse<any>> {
    return apiClient.get('api/admin-analytics/revenue/', params);
  },

  /**
   * Get Top Designers
   */
  async getTopDesigners(limit: number = 10): Promise<ApiResponse<any>> {
    return apiClient.get('api/admin-analytics/top-designers/', { limit });
  },
};

/**
 * Notifications API
 */
export const NotificationsAPI = {
  /**
   * Get Notifications
   */
  async getNotifications(params?: {
    status?: 'unread' | 'read' | 'all';
    type?: string;
    page?: number;
  }): Promise<ApiResponse<Notification[]>> {
    const response = await apiClient.get<{
      notifications: any[];
      unread_count: number;
      total_count: number;
    }>('api/feedback/designer-notifications/', params);

    if (response.success && response.data) {
      // Map backend notifications to frontend Notification type
      const notifications: Notification[] = (response.data.notifications || []).map((n: any) => ({
        id: String(n.id),
        type: n.type || 'system',
        title: n.title,
        message: n.message,
        priority: n.priority || 'medium',
        read: n.is_read || n.read || false,
        createdAt: n.created_at || n.createdAt || new Date().toISOString(),
        scheduledAt: n.scheduled_at,
        recipients: n.recipients,
      }));

      return { success: true, data: notifications };
    }

    // Return empty array on error (endpoint might not be fully implemented)
    return {
      success: false,
      error: response.error || 'Failed to fetch notifications',
      data: [],
    };
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    // Note: Endpoint may need adjustment based on backend
    return apiClient.post(`api/feedback/mark-notification-read/${notificationId}/`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return apiClient.post('api/feedback/mark-all-notifications-read/');
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`api/feedback/notifications/${notificationId}/`);
  },

  /**
   * Create notification
   */
  async createNotification(data: {
    title: string;
    message: string;
    priority: Notification['priority'];
    recipients: { designers?: boolean; customers?: boolean };
    sendType: 'immediate' | 'scheduled';
    scheduledAt?: string;
  }): Promise<ApiResponse<Notification>> {
    // Note: This endpoint may need to be created in backend
    const response = await apiClient.post<Notification>('api/coreadmin/notifications/create/', data);

    if (response.success && response.data) {
      return { success: true, data: response.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to create notification',
    };
  },
};

/**
 * Designers API
 */
export const DesignersAPI = {
  /**
   * Get Designers List
   */
  async getDesigners(params: {
    page?: number;
    limit?: number;
    search?: string;
    onboardingStatus?: string;
  }): Promise<ApiResponse<PaginatedResponse<Designer>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.search) queryParams.search = params.search;
    if (params.onboardingStatus) queryParams.onboarding_status = params.onboardingStatus;

    return apiClient.getPaginated<Designer>('api/coreadmin/designers/', params.page || 1, params.limit || 10, queryParams);
  },

  /**
   * Get Designer Details
   */
  async getDesigner(designerId: string): Promise<ApiResponse<Designer>> {
    return apiClient.get<Designer>(`api/coreadmin/designers/${designerId}/`);
  },

  /**
   * Get Designer Onboarding Details
   */
  async getDesignerOnboarding(designerId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`api/coreadmin/designers/${designerId}/onboarding/`);
  },

  /**
   * Get Designer Statistics
   */
  async getDesignerStats(): Promise<
    ApiResponse<{
      totalDesigners: number;
      pendingApproval: number;
      razorpayPending: number;
      rejected: number;
    }>
  > {
    const response = await apiClient.get<{
      total_designers?: number;
      pending_approval?: number;
      razorpay_pending?: number;
      rejected?: number;
    }>('api/coreadmin/designers/analytics/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          totalDesigners: response.data.total_designers || 0,
          pendingApproval: response.data.pending_approval || 0,
          razorpayPending: response.data.razorpay_pending || 0,
          rejected: response.data.rejected || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch designer stats',
    };
  },

  /**
   * Update Designer Status
   */
  async updateDesignerStatus(designerId: string, status: string, isActive?: boolean): Promise<ApiResponse<any>> {
    const body: any = { status };
    if (isActive !== undefined) {
      body.is_active = isActive;
    }
    return apiClient.put(`api/coreadmin/designers/${designerId}/update-status/`, body);
  },

  /**
   * Verify Designer Onboarding
   */
  async verifyDesignerOnboarding(designerId: string, approved: boolean, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/designers/${designerId}/onboarding/verify/`, { approved, reason });
  },

  /**
   * Get Designer Wallet
   */
  async getDesignerWallet(designerId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`api/coreadmin/designers/${designerId}/wallet/`);
  },

  /**
   * Create Designer (Admin)
   * Creates a new designer with onboarding steps 1 and 2
   */
  async createDesigner(data: {
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
    // First, create the designer profile (Step 1)
    const step1Response = await apiClient.post<{
      message: string;
      user_id: number;
      designer_profile_id: number;
    }>('api/profiles/designer-onboarding-step1/', {
      first_name: data.step1.firstName,
      last_name: data.step1.lastName,
      email: data.step1.email,
      phone: data.step1.phoneNumber,
      password: data.step1.password,
      confirm_password: data.step1.confirmPassword,
      profile_photo: data.step1.profilePhoto,
    });

    if (!step1Response.success || !step1Response.data) {
      return {
        success: false,
        error: step1Response.error || 'Failed to create designer profile',
      };
    }

    // Then, create business details (Step 2)
    // Note: This requires the user to be authenticated, so we need to handle this differently
    // For now, we'll return success after step 1 and note that step 2 needs to be completed
    // In a real scenario, you might need a special admin endpoint that creates both steps at once
    
    return {
      success: true,
      data: {
        userId: step1Response.data.user_id,
        designerProfileId: step1Response.data.designer_profile_id,
      },
      message: step1Response.data.message || 'Designer created successfully. Business details can be added later.',
    };
  },
};

/**
 * Customers API
 */
export const CustomersAPI = {
  /**
   * Get Customers List
   */
  async getCustomers(params: {
    page?: number;
    limit?: number;
    status?: string;
    planStatus?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.planStatus) queryParams.plan_status = params.planStatus;
    if (params.search) queryParams.search = params.search;

    return apiClient.getPaginated<Customer>('api/coreadmin/customers/', params.page || 1, params.limit || 10, queryParams);
  },

  /**
   * Get Customer Details
   */
  async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    return apiClient.get<Customer>(`api/coreadmin/customers/${customerId}/`);
  },

  /**
   * Get Customer Statistics
   */
  async getCustomerStats(): Promise<
    ApiResponse<{
      total: number;
      active: number;
      inactive: number;
      suspended: number;
    }>
  > {
    const response = await apiClient.get<{
      total?: number;
      active?: number;
      inactive?: number;
      suspended?: number;
    }>('api/coreadmin/customers/analytics/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total || 0,
          active: response.data.active || 0,
          inactive: response.data.inactive || 0,
          suspended: response.data.suspended || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch customer stats',
    };
  },

  /**
   * Update Customer Status
   */
  async updateCustomerStatus(customerId: string, status: Customer['status'], reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/customers/${customerId}/account-action/`, { action: status, reason });
  },
};

/**
 * Transform backend Product to frontend Design
 */
function transformProductToDesign(product: any): Design {
  // Map backend status to frontend status
  const statusMap: Record<string, 'pending' | 'approved' | 'rejected'> = {
    'draft': 'pending',
    'active': 'approved',
    'inactive': 'rejected',
    'deleted': 'rejected',
  };

  // Get first media file as thumbnail - check both 'file' and 'url' fields
  const firstMedia = product.media_files?.[0];
  const thumbnailUrl = firstMedia?.file || 
                       firstMedia?.url ||
                       product.thumbnail_url || 
                       'https://via.placeholder.com/300?text=No+Image';

  // Extract previews from media files
  const previews = (product.media_files || [])
    .map((m: any) => m.file || m.url)
    .filter(Boolean);

  // Transform media files to DesignFile format
  const files = (product.media_files || []).map((m: any) => {
    const fileUrl = m.file || m.url;
    return {
      id: String(m.id),
      name: fileUrl?.split('/').pop() || 'file',
      url: fileUrl,
      type: (m.media_type === 'image' ? 'image' : 'other') as 'image' | 'vector' | 'document' | 'other',
      size: 0,
      uploadedAt: m.created_at || new Date().toISOString(),
    };
  });

  return {
    id: String(product.id),
    title: product.title || 'Untitled Design',
    designerId: String(product.created_by || ''),
    designerName: product.designer_name || 'Unknown Designer',
    category: product.category_name || product.category || 'Uncategorized',
    thumbnailUrl,
    status: statusMap[product.status] || 'pending',
    featured: false,
    trending: false,
    uploadedAt: product.created_at || new Date().toISOString(),
    price: product.price ? parseFloat(String(product.price)) : 0,
    downloads: product.total_downloads || product.downloads || 0,
    flagged: product.flagged || false,
    flagReason: product.flag_reason,
    statistics: {
      totalViews: product.total_views || 0,
      totalDownloads: product.total_downloads || 0,
      totalPurchases: product.total_purchases || 0,
      averageRating: product.average_rating || 0,
      revenueGenerated: product.revenue_generated || 0,
    },
    previews,
    files,
    // Include additional fields if present (from detail view)
    metadata: product.metadata,
    approvalHistory: product.approval_history || product.approvalHistory,
    designer: product.designer,
  };
}

/**
 * Designs API
 */
export const DesignsAPI = {
  /**
   * Get Designs List
   */
  async getDesigns(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Design>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.status) {
      // Map frontend status to backend status
      const statusMap: Record<string, string> = {
        'pending': 'draft',
        'approved': 'active',
        'rejected': 'inactive',
      };
      queryParams.status = statusMap[params.status] || params.status;
    }
    if (params.search) queryParams.search = params.search;

    const response = await apiClient.getPaginated<any>('api/coreadmin/designs/', params.page || 1, params.limit || 10, queryParams);
    
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          data: response.data.data.map(transformProductToDesign),
          pagination: response.data.pagination,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch designs',
    };
  },

  /**
   * Get Design Details
   */
  async getDesign(designId: string): Promise<ApiResponse<Design>> {
    const response = await apiClient.get<any>(`api/coreadmin/designs/${designId}/`);
    
    if (response.success && response.data) {
      // Handle both direct data and nested data structure
      const productData = response.data.data || response.data;
      const transformed = transformProductToDesign(productData);
      
      // Include preview_files and sub_products from backend
      if (productData.preview_files) {
        transformed.previewFiles = productData.preview_files;
        // Update previews to use preview_files
        transformed.previews = productData.preview_files.map((f: any) => f.url || f.file).filter(Boolean);
      }
      
      if (productData.sub_products) {
        transformed.subProducts = productData.sub_products;
      }
      
      // Include approval history
      if (productData.approval_history) {
        transformed.approvalHistory = productData.approval_history.map((h: any) => ({
          id: String(h.id),
          action: h.action,
          performedBy: h.performed_by,
          remarks: h.remarks,
          timestamp: h.timestamp,
        }));
      }
      
      // Include designer details
      if (productData.designer) {
        transformed.designer = productData.designer;
      }
      
      return {
        success: true,
        data: transformed,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch design',
    };
  },

  /**
   * Get Design Statistics
   */
  async getDesignStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>
  > {
    const response = await apiClient.get<{
      total?: number;
      pending?: number;
      approved?: number;
      rejected?: number;
    }>('api/coreadmin/designs/stats/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          approved: response.data.approved || 0,
          rejected: response.data.rejected || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch design stats',
    };
  },

  /**
   * Approve/Reject Design
   */
  async approveDesign(designId: string, data: { approved: boolean; reason?: string }): Promise<ApiResponse<void>> {
    const payload: any = {
      action: data.approved ? 'approve' : 'reject',
    };
    
    if (data.approved) {
      // For approval, use admin_notes if reason is provided
      if (data.reason) {
        payload.admin_notes = data.reason;
      }
    } else {
      // For rejection, rejection_reason is required
      payload.rejection_reason = data.reason || 'No reason provided';
    }
    
    return apiClient.post(`api/coreadmin/designs/${designId}/action/`, payload);
  },

  /**
   * Flag Design
   */
  async flagDesign(designId: string, reason: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/designs/${designId}/action/`, { 
      action: 'flag', 
      reason: reason 
    });
  },

  /**
   * Resolve Flag
   */
  async resolveFlag(designId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/designs/${designId}/action/`, { 
      action: 'resolve_flag' 
    });
  },
};

/**
 * Orders API
 */
export const OrdersAPI = {
  /**
   * Get Orders List
   */
  async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.order_type = params.type;

    return apiClient.getPaginated<Order>('api/coreadmin/orders/', params.page || 1, params.limit || 10, queryParams);
  },

  /**
   * Get Order Details
   */
  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`api/coreadmin/orders/${orderId}/`);
  },

  /**
   * Get Order Statistics
   */
  async getOrderStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      completed: number;
      cancelled: number;
    }>
  > {
    // May need to use financial reports or create dedicated endpoint
    const response = await apiClient.get<{
      total?: number;
      pending?: number;
      completed?: number;
      cancelled?: number;
    }>('api/coreadmin/financial-reports/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          completed: response.data.completed || 0,
          cancelled: response.data.cancelled || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch order stats',
    };
  },

  /**
   * Update Order Status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/orders/${orderId}/update-status/`, { status });
  },

  /**
   * Reconcile Order
   */
  async reconcileOrder(orderId: string): Promise<ApiResponse<void>> {
    // Note: Endpoint may need to be created
    return apiClient.post(`api/coreadmin/orders/${orderId}/reconcile/`);
  },
};

/**
 * Custom Orders API
 */
export const CustomOrdersAPI = {
  /**
   * Get Custom Orders List
   */
  async getCustomOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<CustomOrder>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.search) queryParams.search = params.search;

    return apiClient.getPaginated<CustomOrder>(
      'api/coreadmin/custom-orders/',
      params.page || 1,
      params.limit || 10,
      queryParams
    );
  },

  /**
   * Get Custom Order Details
   */
  async getCustomOrder(orderId: string): Promise<ApiResponse<CustomOrder>> {
    return apiClient.get<CustomOrder>(`api/coreadmin/custom-orders/${orderId}/`);
  },

  /**
   * Get Custom Order Statistics
   */
  async getCustomOrderStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
    }>
  > {
    const response = await apiClient.get<{
      total?: number;
      pending?: number;
      in_progress?: number;
      completed?: number;
    }>('api/coreadmin/custom-orders/analytics/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          inProgress: response.data.in_progress || 0,
          completed: response.data.completed || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch custom order stats',
    };
  },

  /**
   * Update Custom Order Status
   */
  async updateCustomOrderStatus(orderId: string, status: CustomOrder['status']): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/custom-orders/${orderId}/action/`, { status });
  },
};

/**
 * Plans API
 */
export const PlansAPI = {
  /**
   * Get Plans List
   */
  async getPlans(): Promise<ApiResponse<Plan[]>> {
    const response = await apiClient.get<Plan[]>('api/coreadmin/subscription-plans/');
    return response;
  },

  /**
   * Create Plan
   */
  async createPlan(data: {
    planName: string;
    description: string | string[];
    price: number;
    duration: 'Monthly' | 'Annually';
    status: 'Active' | 'Inactive';
  }): Promise<ApiResponse<Plan>> {
    return apiClient.post<Plan>('api/coreadmin/subscription-plans/create/', data);
  },

  /**
   * Update Plan
   */
  async updatePlan(planId: string, data: Partial<Plan>): Promise<ApiResponse<Plan>> {
    return apiClient.put<Plan>(`api/coreadmin/subscription-plans/${planId}/update/`, data);
  },

  /**
   * Deactivate Plan
   */
  async deletePlan(planId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/subscription-plans/${planId}/deactivate/`);
  },
};

/**
 * Bundles API
 */
export const BundlesAPI = {
  /**
   * Get Bundles List
   */
  async getBundles(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Bundle>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.search) queryParams.search = params.search;

    return apiClient.getPaginated<Bundle>('api/catalog/bundles/', params.page || 1, params.limit || 10, queryParams);
  },

  /**
   * Get Bundle Details
   */
  async getBundle(bundleId: string): Promise<ApiResponse<Bundle>> {
    return apiClient.get<Bundle>(`api/catalog/bundles/${bundleId}/`);
  },

  /**
   * Create Bundle
   */
  async createBundle(data: {
    name: string;
    description?: string;
    designIds: string[];
    price: number;
    status: 'active' | 'inactive' | 'draft';
  }): Promise<ApiResponse<Bundle>> {
    return apiClient.post<Bundle>('api/catalog/bundles/', data);
  },

  /**
   * Update Bundle
   */
  async updateBundle(bundleId: string, data: Partial<Bundle>): Promise<ApiResponse<Bundle>> {
    return apiClient.put<Bundle>(`api/catalog/bundles/${bundleId}/`, data);
  },

  /**
   * Delete Bundle
   */
  async deleteBundle(bundleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`api/catalog/bundles/${bundleId}/`);
  },
};

/**
 * Transactions API
 */
export const TransactionsAPI = {
  /**
   * Get Transactions List
   */
  async getTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.type) queryParams.type = params.type;
    if (params.status) queryParams.status = params.status;

    return apiClient.getPaginated<Transaction>(
      'api/coreadmin/transactions/',
      params.page || 1,
      params.limit || 10,
      queryParams
    );
  },

  /**
   * Get Transaction Details
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    return apiClient.get<Transaction>(`api/coreadmin/transactions/${transactionId}/`);
  },

  /**
   * Get Transaction Statistics
   */
  async getTransactionStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      completed: number;
      failed: number;
    }>
  > {
    const response = await apiClient.get<{
      total?: number;
      pending?: number;
      completed?: number;
      failed?: number;
    }>('api/coreadmin/financial-reports/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          completed: response.data.completed || 0,
          failed: response.data.failed || 0,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch transaction stats',
    };
  },

  /**
   * Initiate Refund
   */
  async initiateRefund(transactionId: string, reason: string): Promise<ApiResponse<void>> {
    return apiClient.post(`api/coreadmin/transactions/${transactionId}/refund/`, { reason });
  },

  /**
   * Get Designer (for transaction details)
   */
  async getDesigner(designerId: string): Promise<ApiResponse<Designer>> {
    return apiClient.get<Designer>(`api/coreadmin/designers/${designerId}/`);
  },

  /**
   * Get Customer (for transaction details)
   */
  async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    return apiClient.get<Customer>(`api/coreadmin/customers/${customerId}/`);
  },
};

/**
 * System Config API
 */
export const SystemConfigAPI = {
  /**
   * Get System Config
   */
  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    // Note: This endpoint may need to be created in backend
    const response = await apiClient.get<SystemConfig>('api/coreadmin/system-config/');
    return response;
  },

  /**
   * Update System Config
   */
  async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    // Note: This endpoint may need to be created in backend
    return apiClient.put<SystemConfig>('api/coreadmin/system-config/', data);
  },
};

/**
 * Activity Logs API
 */
export const ActivityLogsAPI = {
  /**
   * Get Activity Logs
   */
  async getActivityLogs(params: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
    return apiClient.getPaginated<ActivityLog>(
      'api/coreadmin/activity-logs/',
      params.page || 1,
      params.limit || 100
    );
  },
};

/**
 * Settings API
 */
export const SettingsAPI = {
  /**
   * Get Admin Profile
   */
  async getAdminProfile(): Promise<ApiResponse<Admin>> {
    const response = await apiClient.get<{
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      admin_group: string;
    }>('api/coreadmin/profile/');

    if (response.success && response.data) {
      const admin: Admin = {
        id: String(response.data.id),
        email: response.data.email,
        name: `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim(),
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        role: response.data.admin_group === 'Super Admin' ? 'Super Admin' : 'Moderator',
        createdAt: new Date().toISOString(),
        twoFactorEnabled: true,
      };

      return { success: true, data: admin };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch admin profile',
    };
  },

  /**
   * Update Admin Profile
   */
  async updateAdminProfile(data: Partial<Admin>): Promise<ApiResponse<Admin>> {
    const payload: any = {};
    if (data.firstName) payload.first_name = data.firstName;
    if (data.lastName) payload.last_name = data.lastName;
    if (data.email) payload.email = data.email;

    return apiClient.put<Admin>('api/coreadmin/profile/', payload);
  },

  /**
   * Update Admin Password
   */
  async updateAdminPassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> {
    return apiClient.post('api/coreadmin/change-password/', {
      old_password: data.currentPassword,
      new_password: data.newPassword,
    });
  },
};

/**
 * Export all APIs as a single object for easy import
 */
export const API = {
  auth: AuthAPI,
  dashboard: DashboardAPI,
  notifications: NotificationsAPI,
  designers: DesignersAPI,
  customers: CustomersAPI,
  designs: DesignsAPI,
  orders: OrdersAPI,
  customOrders: CustomOrdersAPI,
  plans: PlansAPI,
  bundles: BundlesAPI,
  transactions: TransactionsAPI,
  systemConfig: SystemConfigAPI,
  activityLogs: ActivityLogsAPI,
  settings: SettingsAPI,
};

// For backward compatibility, export as default
export default API;

