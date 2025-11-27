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

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockAPI {
  // Auth methods
  static async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ requires2FA: boolean; tempToken?: string }>> {
    await delay(1000);

    if (email === 'admin@wedesignz.com' && password === 'admin123') {
      return {
        success: true,
        data: {
          requires2FA: true,
          tempToken: 'temp_token_12345',
        },
      };
    }

    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  static async verify2FA(
    tempToken: string,
    code: string
  ): Promise<ApiResponse<{ admin: Admin; accessToken: string; refreshToken: string }>> {
    await delay(1000);

    if (code === '123456') {
      const admin: Admin = {
        id: '1',
        email: 'admin@wedesignz.com',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        role: 'Super Admin',
        createdAt: new Date().toISOString(),
        twoFactorEnabled: true,
      };

      return {
        success: true,
        data: {
          admin,
          accessToken: 'access_token_12345',
          refreshToken: 'refresh_token_12345',
        },
      };
    }

    return {
      success: false,
      error: 'Invalid 2FA code',
    };
  }

  static async logout(): Promise<ApiResponse<void>> {
    await delay(500);
    return { success: true };
  }

  // Dashboard methods
  static async getKPIData(): Promise<ApiResponse<KPIData>> {
    await delay(800);

    const data: KPIData = {
      totalRevenue: {
        today: 12500,
        month: 425000,
        change: 12.5,
      },
      activeUsers: {
        count: 1248,
        change: 8.3,
      },
      newDesigners: {
        count: 24,
        period: '7d',
      },
      pendingPayouts: {
        count: 15,
        amount: 45000,
      },
    };

    return { success: true, data };
  }

  // Notification methods
  static async getNotifications(): Promise<ApiResponse<Notification[]>> {
    await delay(600);

    const notifications: Notification[] = [
      {
        id: '1',
        type: 'custom_order',
        title: 'New Custom Order Request',
        message: 'A new custom order has been placed by John Doe',
        priority: 'high',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '2',
        type: 'payout_request',
        title: 'Payout Request',
        message: 'Designer Alice has requested a payout of $500',
        priority: 'medium',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '3',
        type: 'designer_signup',
        title: 'New Designer Signup',
        message: 'A new designer has completed onboarding',
        priority: 'low',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: '4',
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance completed successfully',
        priority: 'low',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ];

    return { success: true, data: notifications };
  }

  static async markNotificationAsRead(
    notificationId: string
  ): Promise<ApiResponse<void>> {
    await delay(500);
    return { success: true };
  }

  static async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    await delay(500);
    return { success: true };
  }

  static async deleteNotification(
    notificationId: string
  ): Promise<ApiResponse<void>> {
    await delay(500);
    return { success: true };
  }

  static async createNotification(
    data: {
      title: string;
      message: string;
      priority: Notification['priority'];
      recipients: { designers?: boolean; customers?: boolean };
      sendType: 'immediate' | 'scheduled';
      scheduledAt?: string;
    }
  ): Promise<ApiResponse<Notification>> {
    await delay(800);

    const notification: Notification = {
      id: Date.now().toString(),
      type: 'admin',
      title: data.title,
      message: data.message,
      priority: data.priority,
      read: false,
      createdAt: new Date().toISOString(),
      scheduledAt: data.scheduledAt,
      recipients: data.recipients,
    };

    return { success: true, data: notification };
  }

  // Designer methods
  static async getDesigners(params: {
    page?: number;
    limit?: number;
    search?: string;
    onboardingStatus?: string;
  }): Promise<ApiResponse<PaginatedResponse<Designer>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;
    const search = params.search || '';
    const onboardingStatus = params.onboardingStatus || '';

    // Mock designers data
    const allDesigners: Designer[] = [
      {
        id: '1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        status: 'active',
        onboardingStatus: 'admin_approved',
        razorpayId: 'acc_123',
        lifetimeEarnings: 45000,
        pendingPayout: 5000,
        onboarding: {
          step1: {
            profilePhoto: 'https://via.placeholder.com/150',
            firstName: 'Alice',
            lastName: 'Johnson',
            sampleDesigns: [],
            email: 'alice@example.com',
            phoneNumber: '+1234567890',
            password: '',
            confirmPassword: '',
          },
          step2: {
            businessEmail: 'alice@business.com',
            businessPhoneNumber: '+1234567890',
            legalBusinessName: 'Alice Design Studio',
            businessType: 'Proprietorship',
            category: 'Graphic Design',
            subcategory: 'Logo Design',
            businessModel: 'Freelancer',
            streetAddress: '123 Main St',
            city: 'New York',
            state: 'NY',
            pincode: '10001',
            country: 'USA',
            panNumber: 'ABCDE1234F',
            panDocumentFile: 'https://via.placeholder.com/300',
          },
          step3: {
            designsUploaded: 75,
            designs: Array.from({ length: 75 }, (_, i) => ({
              id: `design_${i}`,
              title: `Design ${i + 1}`,
              url: `https://via.placeholder.com/300?text=Design+${i + 1}`,
              uploadedAt: new Date().toISOString(),
            })),
          },
        },
        razorpayDetails: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '+1234567890',
          businessName: 'Alice Design Studio',
          businessType: 'Proprietorship',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '10001',
          country: 'USA',
          panNumber: 'ABCDE1234F',
        },
      },
      {
        id: '2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        status: 'pending',
        onboardingStatus: 'pending',
        lifetimeEarnings: 0,
        pendingPayout: 0,
      },
      {
        id: '3',
        name: 'Carol Williams',
        email: 'carol@example.com',
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
        status: 'active',
        onboardingStatus: 'admin_approved',
        razorpayId: 'acc_456',
        lifetimeEarnings: 38000,
        pendingPayout: 3000,
      },
    ];

    // Filter by search
    let filtered = allDesigners;
    if (search) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by onboarding status
    if (onboardingStatus) {
      filtered = filtered.filter((d) => d.onboardingStatus === onboardingStatus);
    }

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
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
    await delay(600);

    return {
      success: true,
      data: {
        totalDesigners: 150,
        pendingApproval: 12,
        razorpayPending: 5,
        rejected: 8,
      },
    };
  }

  // Design methods
  static async getDesigns(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Design>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allDesigns: Design[] = Array.from({ length: 50 }, (_, i) => ({
      id: `design_${i}`,
      title: `Design ${i + 1}`,
      designerId: `designer_${(i % 3) + 1}`,
      designerName: ['Alice Johnson', 'Bob Smith', 'Carol Williams'][i % 3],
      category: 'Graphic Design',
      thumbnailUrl: `https://via.placeholder.com/300?text=Design+${i + 1}`,
      status: (['pending', 'approved', 'rejected'] as const)[i % 3],
      featured: i < 5,
      trending: i >= 5 && i < 10,
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
      price: 50 + i * 10,
      downloads: Math.floor(Math.random() * 1000),
    }));

    let filtered = allDesigns;
    if (params.status) {
      filtered = filtered.filter((d) => d.status === params.status);
    }
    if (params.search) {
      filtered = filtered.filter((d) =>
        d.title.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
    };
  }

  static async getDesign(designId: string): Promise<ApiResponse<Design>> {
    await delay(600);

    const design: Design = {
      id: designId,
      title: 'Sample Design',
      designerId: 'designer_1',
      designerName: 'Alice Johnson',
      category: 'Graphic Design',
      thumbnailUrl: 'https://via.placeholder.com/300',
      status: 'approved',
      featured: true,
      trending: false,
      uploadedAt: new Date().toISOString(),
      price: 100,
      downloads: 250,
    };

    return { success: true, data: design };
  }

  static async getDesignStats(): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>
  > {
    await delay(600);

    return {
      success: true,
      data: {
        total: 1250,
        pending: 45,
        approved: 1150,
        rejected: 55,
      },
    };
  }

  static async approveDesign(
    designId: string,
    data: { approved: boolean; reason?: string }
  ): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  static async flagDesign(
    designId: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    await delay(600);
    return { success: true };
  }

  static async resolveFlag(designId: string): Promise<ApiResponse<void>> {
    await delay(600);
    return { success: true };
  }

  // Customer methods
  static async getCustomers(params: {
    page?: number;
    limit?: number;
    status?: string;
    planStatus?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allCustomers: Customer[] = Array.from({ length: 100 }, (_, i) => ({
      id: `customer_${i}`,
      name: `Customer ${i + 1}`,
      email: `customer${i}@example.com`,
      phoneNumber: `+123456789${i}`,
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
      status: (['active', 'inactive', 'suspended', 'blocked'] as const)[i % 4],
      planStatus: (['active', 'expired', 'none'] as const)[i % 3],
      totalPurchases: Math.floor(Math.random() * 50),
      totalSpent: Math.floor(Math.random() * 5000),
    }));

    let filtered = allCustomers;
    if (params.status) {
      filtered = filtered.filter((c) => c.status === params.status);
    }
    if (params.planStatus) {
      filtered = filtered.filter((c) => c.planStatus === params.planStatus);
    }
    if (params.search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(params.search!.toLowerCase()) ||
          c.email.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
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
    await delay(600);

    return {
      success: true,
      data: {
        total: 5000,
        active: 4200,
        inactive: 600,
        suspended: 200,
      },
    };
  }

  static async updateCustomerStatus(
    customerId: string,
    status: Customer['status'],
    reason?: string
  ): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  // Order methods
  static async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allOrders: Order[] = Array.from({ length: 50 }, (_, i) => ({
      id: `order_${i}`,
      orderType: (['plan', 'bundle', 'design', 'custom'] as const)[i % 4],
      customerId: `customer_${i}`,
      customerName: `Customer ${i + 1}`,
      amount: 100 + i * 50,
      status: (['pending', 'processing', 'completed', 'cancelled'] as const)[
        i % 4
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
      razorpayId: `rzp_${i}`,
      razorpayOrderId: `order_rzp_${i}`,
    }));

    let filtered = allOrders;
    if (params.status) {
      filtered = filtered.filter((o) => o.status === params.status);
    }
    if (params.type) {
      filtered = filtered.filter((o) => o.orderType === params.type);
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
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
    await delay(600);

    return {
      success: true,
      data: {
        total: 1250,
        pending: 45,
        completed: 1150,
        cancelled: 55,
      },
    };
  }

  static async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    await delay(600);

    const order: Order = {
      id: orderId,
      orderType: 'design',
      customerId: 'customer_1',
      customerName: 'Customer 1',
      amount: 100,
      status: 'completed',
      createdAt: new Date().toISOString(),
      razorpayId: 'rzp_123',
      razorpayOrderId: 'order_rzp_123',
    };

    return { success: true, data: order };
  }

  static async updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  static async reconcileOrder(orderId: string): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  // Custom Order methods
  static async getCustomOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<CustomOrder>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allCustomOrders: CustomOrder[] = Array.from(
      { length: 30 },
      (_, i) => ({
        id: `custom_order_${i}`,
        customerId: `customer_${i}`,
        customerName: `Customer ${i + 1}`,
        designerId: i % 2 === 0 ? `designer_${(i % 3) + 1}` : undefined,
        designerName:
          i % 2 === 0
            ? ['Alice Johnson', 'Bob Smith', 'Carol Williams'][i % 3]
            : undefined,
        description: `Custom design request ${i + 1}`,
        budget: 500 + i * 100,
        status: (['pending', 'in_progress', 'completed', 'cancelled', 'delayed'] as const)[
          i % 5
        ],
        slaDeadline: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * (7 + i)
        ).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
      })
    );

    let filtered = allCustomOrders;
    if (params.status) {
      filtered = filtered.filter((o) => o.status === params.status);
    }
    if (params.search) {
      filtered = filtered.filter((o) =>
        o.description.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
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
    await delay(600);

    return {
      success: true,
      data: {
        total: 150,
        pending: 25,
        inProgress: 45,
        completed: 80,
      },
    };
  }

  static async updateCustomOrderStatus(
    orderId: string,
    status: CustomOrder['status']
  ): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  // Plan methods
  static async getPlans(): Promise<ApiResponse<Plan[]>> {
    await delay(600);

    const plans: Plan[] = [
      {
        id: '1',
        planName: 'Basic',
        description: [
          '10 downloads per month',
          'Access to basic designs',
          'Email support',
        ],
        price: 9.99,
        duration: 'Monthly',
        status: 'Active',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        planName: 'Prime',
        description: [
          '50 downloads per month',
          'Access to premium designs',
          'Priority support',
        ],
        price: 29.99,
        duration: 'Monthly',
        status: 'Active',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        planName: 'Premium',
        description: [
          'Unlimited downloads',
          'Access to all designs',
          '24/7 priority support',
        ],
        price: 99.99,
        duration: 'Monthly',
        status: 'Active',
        createdAt: new Date().toISOString(),
      },
    ];

    return { success: true, data: plans };
  }

  static async createPlan(data: {
    planName: string;
    description: string | string[];
    price: number;
    duration: 'Monthly' | 'Annually';
    status: 'Active' | 'Inactive';
    discount?: number;
    customDesignHour?: number;
    mockPdfCount?: number;
    noOfFreeDownloads?: number;
  }): Promise<ApiResponse<Plan>> {
    await delay(800);

    const plan: Plan = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    return { success: true, data: plan };
  }

  static async updatePlan(
    planId: string,
    data: Partial<Plan>
  ): Promise<ApiResponse<Plan>> {
    await delay(800);

    const plan: Plan = {
      id: planId,
      planName: 'Updated Plan',
      description: 'Updated description',
      price: 49.99,
      duration: 'Monthly',
      status: 'Active',
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: plan };
  }

  static async deletePlan(planId: string): Promise<ApiResponse<void>> {
    await delay(600);
    return { success: true };
  }

  // Bundle methods
  static async getBundles(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Bundle>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allBundles: Bundle[] = Array.from({ length: 20 }, (_, i) => ({
      id: `bundle_${i}`,
      name: `Bundle ${i + 1}`,
      description: `Collection of ${5 + i} premium designs`,
      designIds: Array.from({ length: 5 + i }, (_, j) => `design_${j}`),
      price: 100 + i * 50,
      status: (['active', 'inactive', 'draft'] as const)[i % 3],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
    }));

    let filtered = allBundles;
    if (params.search) {
      filtered = filtered.filter((b) =>
        b.name.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
    };
  }

  static async createBundle(data: {
    name: string;
    description?: string;
    designIds: string[];
    price: number;
    status: 'active' | 'inactive' | 'draft';
  }): Promise<ApiResponse<Bundle>> {
    await delay(800);

    const bundle: Bundle = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    return { success: true, data: bundle };
  }

  static async updateBundle(
    bundleId: string,
    data: Partial<Bundle>
  ): Promise<ApiResponse<Bundle>> {
    await delay(800);

    const bundle: Bundle = {
      id: bundleId,
      name: 'Updated Bundle',
      designIds: [],
      price: 200,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: bundle };
  }

  static async deleteBundle(bundleId: string): Promise<ApiResponse<void>> {
    await delay(600);
    return { success: true };
  }

  // Transaction methods
  static async getTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 10;

    const allTransactions: Transaction[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `transaction_${i}`,
        type: (['plan_purchase', 'bulk_sale', 'individual_design', 'custom_order'] as const)[
          i % 4
        ],
        category: (['order', 'wallet'] as const)[i % 2],
        userId: `user_${i}`,
        userName: `User ${i + 1}`,
        amount: 100 + i * 25,
        status: (['pending', 'completed', 'failed', 'refunded'] as const)[
          i % 4
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
        razorpayId: `rzp_${i}`,
      })
    );

    let filtered = allTransactions;
    if (params.type) {
      filtered = filtered.filter((t) => t.type === params.type);
    }
    if (params.status) {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
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
    await delay(600);

    return {
      success: true,
      data: {
        total: 5000,
        pending: 50,
        completed: 4800,
        failed: 150,
      },
    };
  }

  static async initiateRefund(
    transactionId: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    await delay(1000);
    return { success: true };
  }

  static async getDesigner(designerId: string): Promise<ApiResponse<Designer>> {
    await delay(600);

    const designer: Designer = {
      id: designerId,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      joinedAt: new Date().toISOString(),
      status: 'active',
      onboardingStatus: 'admin_approved',
      lifetimeEarnings: 45000,
      pendingPayout: 5000,
    };

    return { success: true, data: designer };
  }

  static async getCustomer(
    customerId: string
  ): Promise<ApiResponse<Customer>> {
    await delay(600);

    const customer: Customer = {
      id: customerId,
      name: 'Customer 1',
      email: 'customer1@example.com',
      joinedAt: new Date().toISOString(),
      status: 'active',
      planStatus: 'active',
      totalPurchases: 10,
      totalSpent: 500,
    };

    return { success: true, data: customer };
  }

  // System Config methods
  static async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    await delay(600);

    const config: SystemConfig = {
      commissionRate: 15,
      gstPercentage: 18,
      customOrderTimeSlot: 1,
      minimumRequiredDesigns: 50,
      maintenanceMode: false,
      heroSectionDesigns: [],
      featuredDesigns: ['design_1', 'design_2', 'design_3'],
      domeGalleryDesigns: [],
      landingPageStats: {
        totalClients: 5000,
        totalDesigners: 150,
        totalDesignAssets: 1250,
      },
      clientNames: ['Client 1', 'Client 2', 'Client 3'],
    };

    return { success: true, data: config };
  }

  static async updateSystemConfig(
    data: Partial<SystemConfig>
  ): Promise<ApiResponse<SystemConfig>> {
    await delay(800);

    const config: SystemConfig = {
      commissionRate: 15,
      gstPercentage: 18,
      customOrderTimeSlot: 1,
      minimumRequiredDesigns: 50,
      maintenanceMode: false,
      heroSectionDesigns: [],
      featuredDesigns: [],
      domeGalleryDesigns: [],
      landingPageStats: {
        totalClients: 5000,
        totalDesigners: 150,
        totalDesignAssets: 1250,
      },
      clientNames: [],
      ...data,
      // Ensure required fields are always arrays, not undefined
      heroSectionDesigns: data?.heroSectionDesigns ?? [],
      featuredDesigns: data?.featuredDesigns ?? [],
      domeGalleryDesigns: data?.domeGalleryDesigns ?? [],
    };

    return { success: true, data: config };
  }

  // Admin Profile methods
  static async getAdminProfile(): Promise<ApiResponse<Admin>> {
    await delay(600);

    const admin: Admin = {
      id: '1',
      email: 'admin@wedesignz.com',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Super Admin',
      createdAt: new Date().toISOString(),
      twoFactorEnabled: true,
    };

    return { success: true, data: admin };
  }

  static async updateAdminProfile(
    data: Partial<Admin>
  ): Promise<ApiResponse<Admin>> {
    await delay(800);

    const admin: Admin = {
      id: '1',
      email: 'admin@wedesignz.com',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Super Admin',
      createdAt: new Date().toISOString(),
      twoFactorEnabled: true,
      ...data,
    };

    return { success: true, data: admin };
  }

  static async updateAdminPassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    await delay(800);
    return { success: true };
  }

  // Order Comments methods
  static async getOrderComments(orderId: string): Promise<ApiResponse<{
    order_id: number;
    order_type: string;
    order_title: string;
    comments: any[];
    total_comments: number;
  }>> {
    await delay(500);

    const comments = [
      {
        id: '1',
        message: 'Hello, I have a question about my order.',
        comment_type: 'customer',
        created_by: {
          id: '1',
          username: 'customer1',
          email: 'customer1@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        is_admin_response: false,
        media: [],
      },
      {
        id: '2',
        message: 'Sure! How can I help you?',
        comment_type: 'admin',
        created_by: {
          id: '2',
          username: 'admin',
          email: 'admin@wedesignz.com',
          first_name: 'Admin',
          last_name: 'User',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        is_admin_response: true,
        media: [],
      },
    ];

    return {
      success: true,
      data: {
        order_id: parseInt(orderId),
        order_type: 'custom',
        order_title: `Order #${orderId}`,
        comments,
        total_comments: comments.length,
      },
    };
  }

  static async addOrderComment(orderId: string, message: string, isInternal?: boolean, mediaIds?: number[]): Promise<ApiResponse<any>> {
    await delay(500);

    const comment = {
      id: String(Date.now()),
      message,
      comment_type: 'admin',
      created_by: {
        id: '2',
        username: 'admin',
        email: 'admin@wedesignz.com',
        first_name: 'Admin',
        last_name: 'User',
      },
      created_at: new Date().toISOString(),
      is_admin_response: true,
      media: [],
    };

    return {
      success: true,
      data: comment,
    };
  }

  // Activity Log methods
  static async getActivityLogs(params: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
    await delay(800);

    const page = params.page || 1;
    const limit = params.limit || 100;

    const allLogs: ActivityLog[] = Array.from({ length: 200 }, (_, i) => ({
      id: `log_${i}`,
      adminId: '1',
      adminName: 'Admin User',
      action: ['created', 'updated', 'deleted', 'approved'][i % 4],
      resource: ['design', 'customer', 'order', 'designer'][i % 4],
      resourceId: `resource_${i}`,
      ip: `192.168.1.${i % 255}`,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * i).toISOString(),
    }));

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = allLogs.slice(start, end);

    return {
      success: true,
      data: {
        data: paginated,
        pagination: {
          page,
          limit,
          total: allLogs.length,
          totalPages: Math.ceil(allLogs.length / limit),
        },
      },
    };
  }
}

export { MockAPI };


