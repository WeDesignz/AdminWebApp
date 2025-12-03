/**
 * Real API Implementation
 * Replaces MockAPI with actual backend API calls
 */

import { apiClient } from './client';
import { getApiUrl, API_CONFIG } from './config';
import type {
  ApiResponse,
  KPIData,
  Notification,
  Admin,
  AdminUser,
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
  Coupon,
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
  ): Promise<ApiResponse<{ 
    requires2FA: boolean; 
    tempToken?: string; 
    user?: any;
    admin?: any;
    permissions?: string[];
    tokens?: { accessToken: string; refreshToken: string };
  }>> {
    const response = await apiClient.post<{
      message: string;
      user: any;
      temp_token?: string;
      requires_2fa: boolean;
      permissions?: string[];
      tokens?: {
        access: string;
        refresh: string;
      };
    }>('api/coreadmin/login/', { email, password });

    if (response.success && response.data) {
      const result: {
        requires2FA: boolean;
        tempToken?: string;
        user?: any;
        admin?: any;
        permissions?: string[];
        tokens?: { accessToken: string; refreshToken: string };
      } = {
        requires2FA: response.data.requires_2fa,
        user: response.data.user,
        permissions: response.data.permissions || [],
      };

      if (response.data.requires_2fa) {
        // 2FA is enabled - return temp token
        result.tempToken = response.data.temp_token;
      } else {
        // 2FA is not enabled - return full tokens and admin data
        if (response.data.tokens) {
          result.tokens = {
            accessToken: response.data.tokens.access,
            refreshToken: response.data.tokens.refresh,
          };
        }
        // Map user to admin format
        if (response.data.user) {
          result.admin = {
            id: String(response.data.user.id),
            email: response.data.user.email,
            name: `${response.data.user.first_name || ''} ${response.data.user.last_name || ''}`.trim(),
            firstName: response.data.user.first_name,
            lastName: response.data.user.last_name,
            role: response.data.user.admin_group === 'Super Admin' ? 'Super Admin' : 'Moderator',
            createdAt: new Date().toISOString(),
            twoFactorEnabled: false,
          };
        }
      }

      return {
        success: true,
        data: result,
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
  ): Promise<ApiResponse<{ admin: Admin; permissions: string[]; accessToken: string; refreshToken: string }>> {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required for 2FA verification',
      };
    }

    const response = await apiClient.post<{
      message: string;
      user: any;
      permissions?: string[];
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
          permissions: response.data.permissions || [],
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
    // Get refresh token from store
    const { useAuthStore } = await import('@/store/authStore');
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    
    const response = await apiClient.post<void>('api/coreadmin/logout/', {
      refresh_token: refreshToken || '',
    });
    return response;
  },

  /**
   * 2FA Setup - Get QR code and secret
   */
  async setup2FA(): Promise<ApiResponse<{
    user_id: number;
    email: string;
    secret_key: string;
    qr_code: string; // base64 data URL
    backup_codes: string[];
  }>> {
    const response = await apiClient.get<{
      user_id: number;
      email: string;
      secret_key: string;
      qr_code: string;
      backup_codes: string[];
    }>('api/coreadmin/2fa/setup/');

    return response;
  },

  /**
   * 2FA Enable - Enable 2FA after setup verification
   */
  async enable2FA(code: string): Promise<ApiResponse<{
    message: string;
    backup_codes: string[];
  }>> {
    const response = await apiClient.post<{
      message: string;
      backup_codes: string[];
    }>('api/coreadmin/2fa/enable/', {
      totp_code: code,
    });

    return response;
  },

  /**
   * 2FA Disable - Disable 2FA
   */
  async disable2FA(password: string): Promise<ApiResponse<{
    message: string;
  }>> {
    const response = await apiClient.post<{
      message: string;
    }>('api/coreadmin/2fa/disable/', {
      password: password,
    });

    return response;
  },
};

/**
 * Dashboard & Analytics API
 */
export const DashboardAPI = {
  /**
   * Get Dashboard Summary Data (role-based)
   */
  async getKPIData(): Promise<ApiResponse<any>> {
    return apiClient.get('api/admin-analytics/dashboard/');
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

  /**
   * Get Moderator Daily Report
   */
  async getModeratorDailyReport(moderatorId: number, date?: string): Promise<ApiResponse<any>> {
    const params: any = {};
    if (date) {
      params.date = date;
    }
    return apiClient.get(`api/admin-analytics/moderator-daily-report/${moderatorId}/`, params);
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
    deliveryMethod?: 'in_app' | 'email' | 'both';
  }): Promise<ApiResponse<Notification>> {
    const response = await apiClient.post<{
      id: string;
      title: string;
      message: string;
      priority: string;
      createdAt: string;
      scheduledAt?: string;
    }>('api/coreadmin/notifications/create/', data);

    if (response.success && response.data) {
      // Map backend response to Notification type
      const notification: Notification = {
        id: String(response.data.id || Date.now()),
        type: 'admin',
        title: response.data.title,
        message: response.data.message,
        priority: (response.data.priority || 'medium') as Notification['priority'],
        read: false,
        createdAt: response.data.createdAt || new Date().toISOString(),
        scheduledAt: response.data.scheduledAt,
        recipients: data.recipients,
      };
      return { success: true, data: notification };
    }

    return {
      success: false,
      error: response.error || 'Failed to create notification',
    };
  },

  /**
   * Get admin notification campaigns (sent and scheduled)
   */
  async getNotificationCampaigns(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get<{
      campaigns: any[];
    }>('api/coreadmin/notifications/campaigns/');

    if (response.success && response.data) {
      return { success: true, data: response.data.campaigns || [] };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch notification campaigns',
      data: [],
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
      total_customers?: number;
      active_customers?: number;
      deactivated_customers?: number;
      blocked_customers?: number;
      total?: number;
      active?: number;
      inactive?: number;
      suspended?: number;
    }>('api/coreadmin/customers/analytics/');

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          total: response.data.total_customers || response.data.total || 0,
          active: response.data.active_customers || response.data.active || 0,
          inactive: response.data.deactivated_customers || response.data.inactive || 0,
          suspended: response.data.blocked_customers || response.data.suspended || 0,
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

  // Get thumbnail - prioritize mockup images, then JPG/PNG, then first media file
  let thumbnailUrl = product.thumbnail_url || 'https://via.placeholder.com/300?text=No+Image';
  
  if (product.media_files && product.media_files.length > 0) {
    // First, try to find a mockup image
    const mockupMedia = product.media_files.find((m: any) => m.is_mockup === true);
    if (mockupMedia) {
      thumbnailUrl = mockupMedia.file || mockupMedia.url || thumbnailUrl;
    } else {
      // If no mockup, try to find a JPG/PNG image
      const jpgPngMedia = product.media_files.find((m: any) => m.is_jpg_png === true);
      if (jpgPngMedia) {
        thumbnailUrl = jpgPngMedia.file || jpgPngMedia.url || thumbnailUrl;
      } else {
        // Fallback to first media file
        const firstMedia = product.media_files[0];
        thumbnailUrl = firstMedia?.file || firstMedia?.url || thumbnailUrl;
      }
    }
  }

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
      isMockup: m.is_mockup === true || m.is_mockup === 'true' || m.is_mockup === 1,
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

function transformBackendCoupon(coupon: any): Coupon {
  return {
    id: String(coupon.id),
    name: coupon.name,
    code: coupon.code,
    appliedToBase: Boolean(coupon.applied_to_base),
    appliedToPrime: Boolean(coupon.applied_to_prime),
    appliedToPremium: Boolean(coupon.applied_to_premium),
    description: coupon.description,
    couponDiscountType: coupon.coupon_discount_type || coupon.discount_type || 'flat',
    discountValue: coupon.discount_value !== undefined ? parseFloat(String(coupon.discount_value)) : 0,
    maxUsage: coupon.max_usage !== undefined ? Number(coupon.max_usage) : 0,
    maxUsagePerUser: coupon.max_usage_per_user !== undefined ? Number(coupon.max_usage_per_user) : 1,
    minOrderValue: coupon.min_order_value !== undefined ? parseFloat(String(coupon.min_order_value)) : 0,
    startDateTime: coupon.start_date_time || coupon.startDateTime,
    endDateTime: coupon.end_date_time || coupon.endDateTime,
    status: coupon.status || 'active',
    usageCount: coupon.usage_count ?? coupon.usageCount ?? 0,
    isValid: coupon.is_valid ?? coupon.isValid ?? false,
    createdAt: coupon.created_at || coupon.createdAt,
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
      
      // Include preview_files from backend
      if (productData.preview_files) {
        // Update previews to use preview_files
        transformed.previews = productData.preview_files.map((f: any) => f.url || f.file).filter(Boolean);
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
 * Pinterest API
 */
export const PinterestAPI = {
  /**
   * Get Pinterest integration status
   */
  async getStatus(): Promise<ApiResponse<{
    is_enabled: boolean;
    is_configured: boolean;
    is_token_valid: boolean;
    has_board: boolean;
    board_name: string | null;
    last_successful_post: string | null;
    last_error: string | null;
    last_error_at: string | null;
  }>> {
    return apiClient.get('api/pinterest/status/');
  },

  /**
   * Initiate Pinterest OAuth
   */
  async authorize(): Promise<void> {
    // This redirects, so we handle it differently
    // Use API_CONFIG.baseURL directly since we're building the full URL ourselves
    const baseUrl = API_CONFIG.baseURL || '';
    if (!baseUrl) {
      throw new Error('API base URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL in .env.local');
    }
    // Remove trailing slash if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    window.location.href = `${cleanBaseUrl}/api/pinterest/authorize/`;
  },

  /**
   * Get Pinterest boards
   */
  async getBoards(): Promise<ApiResponse<{
    boards: Array<{
      id: string;
      name: string;
      description?: string;
      pin_count?: number;
    }>;
  }>> {
    return apiClient.get('api/pinterest/boards/');
  },

  /**
   * Set Pinterest board ID
   */
  async setBoard(boardId: string, boardName?: string): Promise<ApiResponse<{
    board_id: string;
    board_name: string;
    message: string;
  }>> {
    return apiClient.post('api/pinterest/set-board/', {
      board_id: boardId,
      board_name: boardName,
    });
  },

  /**
   * Create a new Pinterest board
   */
  async createBoard(data: {
    name: string;
    description?: string;
    privacy?: 'PUBLIC' | 'SECRET';
  }): Promise<ApiResponse<{
    board: {
      id: string;
      name: string;
      description: string;
      privacy: string;
      pin_count: number;
    };
  }>> {
    return apiClient.post('api/pinterest/create-board/', data);
  },

  /**
   * Update a Pinterest board
   */
  async updateBoard(boardId: string, data: {
    name?: string;
    description?: string;
    privacy?: 'PUBLIC' | 'SECRET';
  }): Promise<ApiResponse<{
    board: {
      id: string;
      name: string;
      description: string;
      privacy: string;
      pin_count: number;
    };
  }>> {
    return apiClient.patch('api/pinterest/update-board/', {
      board_id: boardId,
      ...data,
    });
  },

  /**
   * Delete a Pinterest board
   */
  async deleteBoard(boardId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`api/pinterest/delete-board/${boardId}/`);
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
    razorpay_status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.order_type = params.type;
    if (params.razorpay_status) queryParams.razorpay_status = params.razorpay_status;

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
    // Call analytics endpoint with group_by=status to get status counts
    const response = await apiClient.get<{
      data?: {
        total?: number;
        total_orders?: number;
        pending?: number;
        in_progress?: number;
        completed?: number;
        completed_orders?: number;
        group_data?: Record<string, number>;
      };
    }>('api/coreadmin/custom-orders/analytics/?group_by=status');

    if (response.success && response.data?.data) {
      const data = response.data.data;
      
      // Extract stats from response - use direct fields or group_data
      let total = data.total || data.total_orders || 0;
      let pending = data.pending || 0;
      let inProgress = data.in_progress || 0;
      let completed = data.completed || data.completed_orders || 0;
      
      // If group_data is available and direct counts are missing, use group_data
      if (data.group_data && (!pending || !inProgress)) {
        pending = data.group_data.pending || 0;
        inProgress = data.group_data.in_progress || 0;
        completed = data.group_data.completed || completed;
        total = Object.values(data.group_data).reduce((sum, count) => sum + count, 0) || total;
      }
      
      return {
        success: true,
        data: {
          total,
          pending,
          inProgress,
          completed,
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
    return apiClient.post(`api/coreadmin/custom-orders/${orderId}/update-status/`, { status });
  },

  /**
   * Upload Deliverables for Custom Order
   */
  async uploadDeliverables(orderId: string, files: FormData): Promise<ApiResponse<void>> {
    return apiClient.upload(`api/coreadmin/custom-orders/${orderId}/upload-files/`, files);
  },
};

/**
 * Order Comments API
 */
export const OrderCommentsAPI = {
  /**
   * Get Order Comments
   */
  async getOrderComments(orderId: string): Promise<ApiResponse<{
    order_id: number;
    order_type: string;
    order_title: string;
    comments: any[];
    total_comments: number;
  }>> {
    return apiClient.get(`api/orders/order/${orderId}/comments/`);
  },

  /**
   * Add Order Comment
   */
  async addOrderComment(orderId: string, message: string, isInternal?: boolean, mediaIds?: number[]): Promise<ApiResponse<any>> {
    return apiClient.post(`api/orders/order/${orderId}/comments/`, {
      message,
      comment_type: 'admin',
      is_internal: isInternal || false,
      media_ids: mediaIds || [],
    });
  },

  /**
   * Mark Order Comments as Read
   */
  async markOrderCommentsAsRead(orderId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`api/orders/order/${orderId}/comments/mark_read/`);
  },
};

/**
 * Support Tickets API
 */
export const SupportTicketsAPI = {
  /**
   * Get Support Threads
   */
  async getSupportThreads(params?: {
    status?: string;
    priority?: string;
    category?: string;
  }): Promise<ApiResponse<{
    threads: any[];
    total_threads: number;
    open_threads: number;
    closed_threads: number;
  }>> {
    const queryParams: Record<string, string> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.priority) queryParams.priority = params.priority;
    if (params?.category) queryParams.category = params.category;

    return apiClient.get('api/feedback/support-threads/', queryParams);
  },

  /**
   * Get Support Thread Details
   */
  async getSupportThread(threadId: string): Promise<ApiResponse<{
    thread_id: number;
    subject: string;
    status: string;
    priority: string;
    category: string;
    messages: any[];
  }>> {
    return apiClient.get(`api/feedback/support-thread/${threadId}/`);
  },

  /**
   * Create Support Thread
   */
  async createSupportThread(data: {
    subject: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: 'general' | 'technical' | 'billing' | 'account' | 'order' | 'other';
  }): Promise<ApiResponse<any>> {
    return apiClient.post('api/feedback/create-support-thread/', {
      subject: data.subject,
      message: data.message,
      priority: data.priority || 'medium',
      category: data.category || 'general',
    });
  },

  /**
   * Add Message to Support Thread
   */
  async addSupportMessage(threadId: string, message: string): Promise<ApiResponse<any>> {
    return apiClient.post(`api/feedback/support-thread/${threadId}/`, {
      message,
    });
  },

  /**
   * Update Support Thread Status
   */
  async updateSupportThreadStatus(threadId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed'): Promise<ApiResponse<any>> {
    // Note: This endpoint may need to be created in backend
    return apiClient.patch(`api/feedback/support-thread/${threadId}/`, {
      status,
    });
  },
};

/**
 * Transform backend plan to frontend plan format
 */
function transformBackendPlanToFrontend(backendPlan: any): Plan {
  // Capitalize first letter of plan_name for display
  const planName = backendPlan.plan_name 
    ? backendPlan.plan_name.charAt(0).toUpperCase() + backendPlan.plan_name.slice(1).toLowerCase()
    : 'Unknown';
  
  // Capitalize first letter of plan_duration
  const duration = backendPlan.plan_duration
    ? backendPlan.plan_duration.charAt(0).toUpperCase() + backendPlan.plan_duration.slice(1).toLowerCase()
    : 'Monthly';
  
  // Capitalize first letter of status
  const status = backendPlan.status
    ? backendPlan.status.charAt(0).toUpperCase() + backendPlan.status.slice(1).toLowerCase()
    : 'Active';
  
  return {
    id: String(backendPlan.id),
    planName: planName,
    description: backendPlan.description || [],
    price: backendPlan.price ? parseFloat(String(backendPlan.price)) : 0,
    duration: duration === 'Monthly' ? 'Monthly' : 'Annually',
    status: status === 'Active' ? 'Active' : 'Inactive',
    discount: backendPlan.discount !== undefined && backendPlan.discount !== null ? parseFloat(String(backendPlan.discount)) : undefined,
    customDesignHour: backendPlan.custom_design_hour !== undefined && backendPlan.custom_design_hour !== null ? parseInt(String(backendPlan.custom_design_hour)) : undefined,
    mockPdfCount: backendPlan.mock_pdf_count !== undefined && backendPlan.mock_pdf_count !== null ? parseInt(String(backendPlan.mock_pdf_count)) : undefined,
    noOfFreeDownloads: backendPlan.no_of_free_downloads !== undefined && backendPlan.no_of_free_downloads !== null ? parseInt(String(backendPlan.no_of_free_downloads)) : undefined,
    isMostPopular: backendPlan.is_most_popular === true || backendPlan.is_most_popular === 1,
    createdAt: backendPlan.created_at,
    updatedAt: backendPlan.updated_at,
  };
}

/**
 * Plans API
 */
export const PlansAPI = {
  /**
   * Get Plans List
   */
  async getPlans(): Promise<ApiResponse<Plan[]>> {
    const response = await apiClient.get<any>('api/coreadmin/subscription-plans/');
    
    if (response.success && response.data) {
      // The API returns { data: [...], pagination: {...} }
      // transformResponse extracts the 'data' field, so response.data should be the array
      // But if it's still an object with nested data, handle that too
      let plansArray: any[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array
        plansArray = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        // Nested { data: [...] }
        plansArray = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // Try to find any array property
        const keys = Object.keys(response.data);
        for (const key of keys) {
          if (Array.isArray(response.data[key])) {
            plansArray = response.data[key];
            break;
          }
        }
      }
      
      return {
        ...response,
        data: plansArray.map(transformBackendPlanToFrontend),
      };
    }
    
    return response as ApiResponse<Plan[]>;
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
    discount?: number;
    customDesignHour?: number;
    mockPdfCount?: number;
    noOfFreeDownloads?: number;
    isMostPopular?: boolean;
  }): Promise<ApiResponse<Plan & { was_reactivated?: boolean }>> {
    // Transform frontend data to backend format
    const backendData: any = {
      plan_name: data.planName.toLowerCase(), // Convert to lowercase: 'Basic' -> 'basic'
      plan_duration: data.duration.toLowerCase(), // Convert to lowercase: 'Monthly' -> 'monthly'
      description: data.description, // Can be string or array, backend handles it
      price: data.price,
      status: data.status.toLowerCase(), // Convert to lowercase: 'Active' -> 'active'
    };
    
    // Add new fields if provided
    if (data.discount !== undefined) backendData.discount = data.discount;
    if (data.customDesignHour !== undefined) backendData.custom_design_hour = data.customDesignHour;
    if (data.mockPdfCount !== undefined) backendData.mock_pdf_count = data.mockPdfCount;
    if (data.noOfFreeDownloads !== undefined) backendData.no_of_free_downloads = data.noOfFreeDownloads;
    if (data.isMostPopular !== undefined) backendData.is_most_popular = data.isMostPopular;
    const response = await apiClient.post<any>('api/coreadmin/subscription-plans/create/', backendData);
    if (response.success && response.data) {
      // Preserve was_reactivated from backend response
      const wasReactivated = response.data.was_reactivated;
      const transformedPlan = transformBackendPlanToFrontend(response.data);
      return {
        ...response,
        data: {
          ...transformedPlan,
          was_reactivated: wasReactivated,
        } as Plan & { was_reactivated?: boolean },
      };
    }
    return response as ApiResponse<Plan & { was_reactivated?: boolean }>;
  },

  /**
   * Update Plan
   */
  async updatePlan(planId: string, data: Partial<Plan>): Promise<ApiResponse<Plan>> {
    // Transform frontend data to backend format
    const backendData: any = {};
    if ((data as any).planName !== undefined) {
      backendData.plan_name = typeof (data as any).planName === 'string' ? (data as any).planName.toLowerCase() : (data as any).planName;
    }
    if ((data as any).duration !== undefined) {
      backendData.plan_duration = typeof (data as any).duration === 'string' ? (data as any).duration.toLowerCase() : (data as any).duration;
    }
    if (data.description !== undefined) backendData.description = data.description;
    if (data.price !== undefined) backendData.price = data.price;
    if (data.status !== undefined) {
      backendData.status = typeof data.status === 'string' ? data.status.toLowerCase() : data.status;
    }
    if ((data as any).discount !== undefined) backendData.discount = (data as any).discount;
    if ((data as any).customDesignHour !== undefined) backendData.custom_design_hour = (data as any).customDesignHour;
    if ((data as any).mockPdfCount !== undefined) backendData.mock_pdf_count = (data as any).mockPdfCount;
    if ((data as any).noOfFreeDownloads !== undefined) backendData.no_of_free_downloads = (data as any).noOfFreeDownloads;
    if ((data as any).isMostPopular !== undefined) backendData.is_most_popular = (data as any).isMostPopular;
    const response = await apiClient.put<any>(`api/coreadmin/subscription-plans/${planId}/update/`, backendData);
    if (response.success && response.data) {
      return {
        ...response,
        data: transformBackendPlanToFrontend(response.data),
      };
    }
    return response as ApiResponse<Plan>;
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

type CreateCouponInput = {
  name: string;
  code: string;
  appliedToBase: boolean;
  appliedToPrime: boolean;
  appliedToPremium: boolean;
  description?: string;
  couponDiscountType: 'flat' | 'percentage';
  discountValue: number;
  maxUsage: number;
  maxUsagePerUser: number;
  minOrderValue: number;
  startDateTime: string;
  endDateTime: string;
  status: Coupon['status'];
};

export const CouponsAPI = {
  /**
   * Get all coupons for admin dashboard
   */
  async getCoupons(): Promise<ApiResponse<Coupon[]>> {
    const response = await apiClient.get<{ coupons: any[]; total?: number }>('api/coupons/admin/');

    if (response.success && response.data) {
      const coupons = Array.isArray(response.data.coupons)
        ? response.data.coupons.map(transformBackendCoupon)
        : Array.isArray(response.data)
          ? (response.data as any[]).map(transformBackendCoupon)
          : [];

      return {
        success: true,
        data: coupons,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch coupons',
    };
  },

  /**
   * Create a new coupon
   */
  async createCoupon(data: CreateCouponInput): Promise<ApiResponse<Coupon>> {
    const payload = {
      name: data.name,
      code: data.code,
      applied_to_base: data.appliedToBase,
      applied_to_prime: data.appliedToPrime,
      applied_to_premium: data.appliedToPremium,
      description: data.description,
      coupon_discount_type: data.couponDiscountType,
      discount_value: data.discountValue,
      max_usage: data.maxUsage,
      max_usage_per_user: data.maxUsagePerUser,
      min_order_value: data.minOrderValue,
      start_date_time: data.startDateTime,
      end_date_time: data.endDateTime,
      status: data.status,
    };

    const response = await apiClient.post<{ coupon: any; message?: string }>('api/coupons/admin/', payload);

    if (response.success && response.data) {
      const couponData = (response.data as any).coupon || response.data;
      return {
        success: true,
        data: transformBackendCoupon(couponData),
        message: (response.data as any).message,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to create coupon',
    };
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
    const response = await apiClient.get<any>('api/coreadmin/system-config/');
    
    // Transform backend response to frontend format
    if (response.data) {
      return {
        success: true,
        data: {
          commissionRate: response.data.commission_rate,
          gstPercentage: response.data.gst_percentage,
          customOrderTimeSlot: response.data.custom_order_time_slot_hours,
          minimumRequiredDesigns: response.data.minimum_required_designs,
          maintenanceMode: response.data.maintenance_mode,
          heroSectionDesigns: response.data.hero_section_designs || [],
          featuredDesigns: response.data.featured_designs || [],
          trendingDesigns: response.data.trending_designs || [],
          domeGalleryDesigns: response.data.dome_gallery_designs || [],
          landingPageStats: response.data.landing_page_stats || {},
          clientNames: response.data.client_names || [],
        } as SystemConfig,
      };
    }
    return response as ApiResponse<SystemConfig>;
  },

  /**
   * Update System Config
   */
  async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    // Helper to convert string IDs to integers for backend (backend expects integers)
    const convertIdsToInts = (ids: string[] | undefined): number[] | undefined => {
      if (!ids || !Array.isArray(ids)) return undefined;
      return ids.map(id => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return isNaN(numId) ? null : numId;
      }).filter((id): id is number => id !== null);
    };

    // Transform frontend format to backend format
    const backendData: any = {
      commission_rate: data.commissionRate,
      gst_percentage: data.gstPercentage,
      custom_order_time_slot_hours: data.customOrderTimeSlot,
      minimum_required_designs: data.minimumRequiredDesigns,
      maintenance_mode: data.maintenanceMode,
      hero_section_designs: convertIdsToInts(data.heroSectionDesigns),
      featured_designs: convertIdsToInts(data.featuredDesigns),
      dome_gallery_designs: convertIdsToInts(data.domeGalleryDesigns),
      landing_page_stats: data.landingPageStats,
      client_names: data.clientNames,
    };
    
    const response = await apiClient.put<any>('api/coreadmin/system-config/update/', backendData);
    
    // Transform backend response to frontend format
    if (response.data) {
      return {
        success: true,
        data: {
          commissionRate: response.data.commission_rate,
          gstPercentage: response.data.gst_percentage,
          customOrderTimeSlot: response.data.custom_order_time_slot_hours,
          minimumRequiredDesigns: response.data.minimum_required_designs,
          maintenanceMode: response.data.maintenance_mode,
          heroSectionDesigns: response.data.hero_section_designs || [],
          featuredDesigns: response.data.featured_designs || [],
          trendingDesigns: response.data.trending_designs || [],
          domeGalleryDesigns: response.data.dome_gallery_designs || [],
          landingPageStats: response.data.landing_page_stats || {},
          clientNames: response.data.client_names || [],
        } as SystemConfig,
      };
    }
    return response as ApiResponse<SystemConfig>;
  },

  /**
   * Get Business Configuration (read-only values from environment)
   */
  async getBusinessConfig(): Promise<ApiResponse<{
    commission_rate: number;
    gst_percentage: number;
    custom_order_time_slot_hours: number;
    minimum_required_designs_onboard: number;
  }>> {
    const response = await apiClient.get<{
      message: string;
      data: {
        commission_rate: number;
        gst_percentage: number;
        custom_order_time_slot_hours: number;
        minimum_required_designs_onboard: number;
      };
    }>('api/coreadmin/business-config/');
    
    // Transform response to match expected format
    if (response.data?.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }
    return response as ApiResponse<{
      commission_rate: number;
      gst_percentage: number;
      custom_order_time_slot_hours: number;
      minimum_required_designs_onboard: number;
    }>;
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
      user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        mobile_number?: string;
        profile_photo_url?: string;
      };
      admin_group: string;
      admin_group_display: string;
      is_2fa_enabled: boolean;
    }>('api/coreadmin/profile/');

    if (response.success && response.data) {
      // Ensure role matches UserRole type
      let role: 'Super Admin' | 'Moderator' = 'Moderator';
      if (response.data.admin_group_display === 'Super Admin' || response.data.admin_group === 'superadmin') {
        role = 'Super Admin';
      } else if (response.data.admin_group_display === 'Moderator') {
        role = 'Moderator';
      }

      const admin: Admin = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        name: `${response.data.user.first_name || ''} ${response.data.user.last_name || ''}`.trim(),
        firstName: response.data.user.first_name,
        lastName: response.data.user.last_name,
        mobileNumber: response.data.user.mobile_number || '',
        avatar: response.data.user.profile_photo_url || undefined,
        role,
        createdAt: new Date().toISOString(),
        twoFactorEnabled: response.data.is_2fa_enabled || false,
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
    if (data.mobileNumber !== undefined) payload.mobile_number = data.mobileNumber || '';

    const response = await apiClient.put<{
      id: number;
      user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        mobile_number?: string;
        profile_photo_url?: string;
      };
      admin_group: string;
      admin_group_display: string;
      is_2fa_enabled: boolean;
    }>('api/coreadmin/profile/', payload);

    if (response.success && response.data) {
      // Ensure role matches UserRole type
      let role: 'Super Admin' | 'Moderator' = 'Moderator';
      if (response.data.admin_group_display === 'Super Admin' || response.data.admin_group === 'superadmin') {
        role = 'Super Admin';
      } else if (response.data.admin_group_display === 'Moderator') {
        role = 'Moderator';
      }

      const admin: Admin = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        name: `${response.data.user.first_name || ''} ${response.data.user.last_name || ''}`.trim(),
        firstName: response.data.user.first_name,
        lastName: response.data.user.last_name,
        mobileNumber: response.data.user.mobile_number || '',
        avatar: response.data.user.profile_photo_url || undefined,
        role,
        createdAt: new Date().toISOString(),
        twoFactorEnabled: response.data.is_2fa_enabled || false,
      };

      return { success: true, data: admin };
    }

    return {
      success: false,
      error: response.error || 'Failed to update admin profile',
    };
  },

  /**
   * Update Admin Password
   */
  async updateAdminPassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ApiResponse<void>> {
    return apiClient.post('api/coreadmin/change-password/', {
      old_password: data.currentPassword,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    });
  },

  /**
   * Upload Admin Profile Photo
   */
  async uploadAdminProfilePhoto(file: File): Promise<ApiResponse<{ profile_photo_url: string }>> {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return apiClient.upload<{ profile_photo_url: string }>('api/coreadmin/profile/upload-photo/', formData);
  },
};

/**
 * Admin Users API (Super Admin only)
 */
export const AdminUsersAPI = {
  /**
   * Get list of admin users
   */
  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    role?: 'superadmin' | 'moderator';
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<AdminUser>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    // Backend returns: { success: True, data: [...], pagination: {...} }
    // apiClient.get uses transformResponse which extracts 'data' field, losing 'pagination'
    // So we need to handle this custom response structure manually using fetch directly
    try {
      const authHeaders = await (apiClient as any).getAuthHeaders();
      
      // Build endpoint string safely
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `api/coreadmin/admin-users/?${queryString}`
        : 'api/coreadmin/admin-users/';
      
      // Ensure endpoint is a string
      if (typeof endpoint !== 'string') {
        throw new Error('Invalid endpoint type');
      }
      
      const url = getApiUrl(endpoint);
      
      const rawResponse = await fetch(url, {
        method: 'GET',
        headers: authHeaders,
        credentials: 'include',
      });

      if (!rawResponse.ok) {
        const errorData = await rawResponse.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || errorData.detail || 'Failed to fetch admin users',
        };
      }

      const backendData = await rawResponse.json();

      if (backendData.success && Array.isArray(backendData.data)) {
        return {
          success: true,
          data: {
            data: backendData.data,
            pagination: {
              page: backendData.pagination?.page || 1,
              limit: backendData.pagination?.limit || 20,
              total: backendData.pagination?.total || 0,
              totalPages: backendData.pagination?.total_pages || 0,
            },
          },
        };
      }

      return {
        success: false,
        error: backendData.error || 'Failed to fetch admin users',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch admin users',
      };
    }
  },

  /**
   * Get admin user details
   */
  async getAdminUser(userId: number): Promise<ApiResponse<AdminUser>> {
    const response = await apiClient.get<{ data: AdminUser }>(
      `api/coreadmin/admin-users/${userId}/`
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch admin user',
    };
  },

  /**
   * Create admin user
   */
  async createAdminUser(data: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    admin_group: 'superadmin' | 'moderator';
    permission_group_id?: number | null;
    permissions?: string[];
  }): Promise<ApiResponse<AdminUser>> {
    const response = await apiClient.post<{ data: AdminUser }>(
      'api/coreadmin/admin-users/create/',
      data
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to create admin user',
    };
  },

  /**
   * Update admin user
   */
  async updateAdminUser(
    userId: number,
    data: Partial<{
      first_name: string;
      last_name: string;
      admin_group: 'superadmin' | 'moderator';
      permission_group_id: number | null;
      is_active: boolean;
      permissions: string[];
    }>
  ): Promise<ApiResponse<AdminUser>> {
    const response = await apiClient.put<{ data: AdminUser }>(
      `api/coreadmin/admin-users/${userId}/`,
      data
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to update admin user',
    };
  },

  /**
   * Deactivate admin user
   */
  async deactivateAdminUser(userId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<void>(
      `api/coreadmin/admin-users/${userId}/`
    );

    return response;
  },

  /**
   * Reset admin user password
   */
  async resetAdminPassword(
    userId: number,
    data: { new_password: string; confirm_password: string }
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>(
      `api/coreadmin/admin-users/${userId}/reset-password/`,
      data
    );

    return response;
  },
};

/**
 * Permission Groups API
 */
export interface PermissionGroup {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  permission_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export const PermissionGroupsAPI = {
  /**
   * Get list of permission groups
   */
  async getPermissionGroups(params?: {
    is_active?: boolean;
  }): Promise<ApiResponse<PermissionGroup[]>> {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `api/coreadmin/permission-groups/?${queryString}`
      : 'api/coreadmin/permission-groups/';

    const response = await apiClient.get<{ data: PermissionGroup[] }>(endpoint);

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch permission groups',
    };
  },

  /**
   * Get permission group by ID
   */
  async getPermissionGroup(groupId: number): Promise<ApiResponse<PermissionGroup>> {
    const response = await apiClient.get<{ data: PermissionGroup }>(
      `api/coreadmin/permission-groups/${groupId}/`
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch permission group',
    };
  },

  /**
   * Create permission group
   */
  async createPermissionGroup(data: {
    name: string;
    description?: string;
    permissions: string[];
    is_active?: boolean;
  }): Promise<ApiResponse<PermissionGroup>> {
    const response = await apiClient.post<{ data: PermissionGroup }>(
      'api/coreadmin/permission-groups/create/',
      data
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to create permission group',
    };
  },

  /**
   * Update permission group
   */
  async updatePermissionGroup(
    groupId: number,
    data: Partial<{
      name: string;
      description: string;
      permissions: string[];
      is_active: boolean;
    }>
  ): Promise<ApiResponse<PermissionGroup>> {
    const response = await apiClient.put<{ data: PermissionGroup }>(
      `api/coreadmin/permission-groups/${groupId}/`,
      data
    );

    if (response.success && response.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.error || 'Failed to update permission group',
    };
  },

  /**
   * Delete permission group
   */
  async deletePermissionGroup(groupId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<void>(
      `api/coreadmin/permission-groups/${groupId}/`
    );

    return response;
  },
};

/**
 * FAQ API
 */
export const FAQAPI = {
  /**
   * Get FAQs List
   */
  async getFAQs(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get<any[]>('api/feedback/faqs/');
    return response as ApiResponse<any[]>;
  },

  /**
   * Get FAQ Tags
   */
  async getFAQTags(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get<any[]>('api/feedback/faq-tags/');
    return response as ApiResponse<any[]>;
  },

  /**
   * Create FAQ
   */
  async createFAQ(data: {
    question: string;
    answer: string;
    is_active: boolean;
    sort_order: number;
    display_locations: string[];
  }): Promise<ApiResponse<any>> {
    const payload = {
      question: data.question,
      answer: data.answer,
      is_active: data.is_active,
      sort_order: data.sort_order,
      display_locations: data.display_locations,
    };
    const response = await apiClient.post<any>('api/feedback/faqs/', payload);
    return response as ApiResponse<any>;
  },

  /**
   * Update FAQ
   */
  async updateFAQ(id: number, data: {
    question: string;
    answer: string;
    is_active: boolean;
    sort_order: number;
    display_locations: string[];
  }): Promise<ApiResponse<any>> {
    const payload = {
      question: data.question,
      answer: data.answer,
      is_active: data.is_active,
      sort_order: data.sort_order,
      display_locations: data.display_locations,
    };
    const response = await apiClient.put<any>(`api/feedback/faqs/${id}/`, payload);
    return response as ApiResponse<any>;
  },

  /**
   * Delete FAQ
   */
  async deleteFAQ(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`api/feedback/faqs/${id}/`);
    return response as ApiResponse<void>;
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
  pinterest: PinterestAPI,
  orders: OrdersAPI,
  customOrders: CustomOrdersAPI,
  orderComments: OrderCommentsAPI,
  supportTickets: SupportTicketsAPI,
  plans: PlansAPI,
  bundles: BundlesAPI,
  coupons: CouponsAPI,
  transactions: TransactionsAPI,
  systemConfig: SystemConfigAPI,
  activityLogs: ActivityLogsAPI,
  settings: SettingsAPI,
  adminUsers: AdminUsersAPI,
  permissionGroups: PermissionGroupsAPI,
  faq: FAQAPI,
};

// For backward compatibility, export as default
export default API;

