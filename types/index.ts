export type UserRole = 'Super Admin' | 'Moderator';

export interface Admin {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export interface DesignerOnboardingStep1 {
  profilePhoto: string;
  firstName: string;
  lastName: string;
  sampleDesigns: string[]; // Array of image URLs
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface DesignerOnboardingStep2 {
  businessEmail: string;
  businessPhoneNumber: string;
  legalBusinessName: string;
  businessType: 'Proprietorship' | 'Public Limited' | 'Private Limited' | 'Partnership' | 'LLP';
  category: string;
  subcategory: string;
  businessModel: 'Freelancer' | 'Agency' | 'Studio' | 'Consultancy';
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  panNumber: string;
  panDocumentFile: string; // URL
  gstNumber?: string;
  msmeNumber?: string;
}

export interface DesignerOnboardingStep3 {
  designsUploaded: number; // Should be minimum 50
  designs: Array<{
    id: string;
    title: string;
    url: string;
    uploadedAt: string;
  }>;
}

export interface DesignerRazorpayDetails {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  panNumber: string;
  gstNumber?: string;
}

export interface Designer {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  onboardingStatus: 'pending' | 'moderator_approved' | 'admin_approved' | 'rejected';
  razorpayId?: string;
  lifetimeEarnings: number;
  pendingPayout: number;
  onboarding?: {
    step1: DesignerOnboardingStep1;
    step2: DesignerOnboardingStep2;
    step3: DesignerOnboardingStep3;
  };
  razorpayDetails?: DesignerRazorpayDetails;
  documents?: {
    id: string;
    type: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  wallets?: Wallet[];
}

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CustomerPlan {
  id: string;
  name: string;
  type: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'none';
  startDate: string;
  expiryDate?: string;
  availableDownloads: number;
  totalDownloads: number;
}

export interface CustomerPurchase {
  id: string;
  type: 'design' | 'bundle' | 'plan';
  itemId: string;
  itemName: string;
  amount: number;
  date: string;
  paymentReference: string;
}

export interface CustomerDownload {
  id: string;
  designId: string;
  designTitle: string;
  designType: string;
  downloadedAt: string;
}

export interface CustomerView {
  id: string;
  designId: string;
  designTitle: string;
  category: string;
  viewedAt: string;
}

export interface CustomerWishlistItem {
  id: string;
  designId: string;
  designTitle: string;
  designThumbnail: string;
  price: number;
  addedAt: string;
}

export interface CustomerCartItem {
  id: string;
  designId: string;
  designTitle: string;
  designThumbnail: string;
  price: number;
  addedAt: string;
}

export interface CustomerDeactivation {
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'suspended' | 'blocked';
  planStatus: 'active' | 'expired' | 'none';
  totalPurchases: number;
  totalSpent: number;
  address?: CustomerAddress;
  plan?: CustomerPlan;
  purchases?: CustomerPurchase[];
  downloads?: CustomerDownload[];
  views?: CustomerView[];
  wishlist?: CustomerWishlistItem[];
  cart?: CustomerCartItem[];
  deactivation?: CustomerDeactivation;
}

export interface DesignFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'vector' | 'document' | 'other';
  size: number; // in bytes
  uploadedAt: string;
}

export interface DesignApprovalHistory {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  performedBy: string;
  remarks?: string;
  timestamp: string;
}

export interface DesignMetadata {
  description?: string;
  tags?: string[];
  dimensions?: {
    width: number;
    height: number;
    unit: 'px' | 'cm' | 'inch';
  };
  fileFormats?: string[];
  colorMode?: 'RGB' | 'CMYK' | 'Grayscale';
  resolution?: number;
  license?: string;
}

export interface Design {
  id: string;
  title: string;
  designerId: string;
  designerName: string;
  category: string;
  thumbnailUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  trending: boolean;
  featuredUntil?: string;
  trendingUntil?: string;
  uploadedAt: string;
  price: number;
  downloads: number;
  flagged?: boolean;
  flagReason?: string;
  statistics?: {
    totalViews: number;
    totalDownloads: number;
    totalPurchases: number;
    averageRating?: number;
    totalReviews?: number;
    revenueGenerated: number;
    trendingRank?: number;
    performanceScore?: number;
  };
  files?: DesignFile[];
  previews?: string[]; // Array of preview image URLs
  metadata?: DesignMetadata;
  approvalHistory?: DesignApprovalHistory[];
  designer?: Designer; // Linked designer details
}

export interface Transaction {
  id: string;
  type: 'plan_purchase' | 'bulk_sale' | 'individual_design' | 'custom_order' | 'designer_withdrawal' | 'payout' | 'refund';
  category: 'order' | 'wallet'; // Distinguishes between order transactions and wallet transactions
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  razorpayId?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  refundEligible?: boolean;
  // Order Transaction fields
  orderTransactionNumber?: string; // Order_Transaction_Number
  orderTransactionType?: 'Invoice' | 'Bill' | 'Receipt'; // Type for Order_Transaction
  relatedOrderId?: string; // Related Order
  // Wallet Transaction fields
  walletTransactionType?: 'Credit' | 'Debit'; // Transaction_Type for Wallet_Transaction
  relatedOrderTransactionId?: string; // Link to Order_Transaction if wallet transaction is related
  relatedWalletWithdrawalRequestId?: string; // Link to Wallet_Withdrawal_Request
  // Common fields
  description?: string;
  relatedDesignId?: string;
  relatedPlanId?: string;
}

export interface Order {
  id: string;
  orderType: 'plan' | 'bundle' | 'design' | 'custom';
  customerId: string;
  customerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
  completedAt?: string;
  razorpayId?: string;
  razorpayOrderId?: string;
  // Plan order specific
  planId?: string;
  planName?: string;
  // Bundle order specific
  bundleId?: string;
  bundleName?: string;
  designIds?: string[];
  // Design order specific
  designId?: string;
  designName?: string;
  // Custom order specific
  customOrderId?: string;
  designerId?: string;
  designerName?: string;
  description?: string;
}

export interface CustomOrder {
  id: string;
  customerId: string;
  customerName: string;
  designerId?: string;
  designerName?: string;
  description: string;
  budget: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  slaDeadline: string;
  createdAt: string;
  completedAt?: string;
  designTitle?: string;
  specification?: string;
  referenceFiles?: {
    id: string;
    fileName: string;
    url: string;
    uploadedAt: string;
  }[];
  deliverables?: {
    id: string;
    fileName: string;
    url: string;
    uploadedAt: string;
  }[];
}

export interface Plan {
  id: string;
  planName: string; // Plan_Name: Basic, Prime, Premium
  description: string | string[]; // Description: All Pointers in JSON Field (can be string or array of strings)
  price: number; // Price
  duration: 'Monthly' | 'Annually'; // Duration: Monthly or Annually
  status: 'Active' | 'Inactive'; // Status: Active / Inactive
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  type: 'custom_order' | 'payout_request' | 'transaction_failed' | 'designer_signup' | 'system' | 'admin';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: string;
  scheduledAt?: string; // For scheduled notifications
  recipients?: {
    designers?: boolean;
    customers?: boolean;
  };
  data?: Record<string, unknown>;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  designIds: string[];
  designs?: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    price: number;
  }>;
  price: number;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  thumbnailUrl?: string;
}

export interface Coupon {
  id: string;
  name: string;
  code: string;
  appliedToBase: boolean;
  appliedToPrime: boolean;
  appliedToPremium: boolean;
  description?: string | null;
  couponDiscountType: 'flat' | 'percentage';
  discountValue: number;
  maxUsage: number;
  maxUsagePerUser: number;
  minOrderValue: number;
  startDateTime: string;
  endDateTime: string;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  usageCount?: number;
  isValid?: boolean;
  createdAt?: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string;
  ip: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  timestamp: string;
}

export interface SystemConfig {
  commissionRate: number; // Platform commission percentage (0-100)
  gstPercentage: number; // GST percentage
  customOrderTimeSlot: number; // Custom order time slot in hours (default 1 hr)
  minimumRequiredDesigns: number; // Minimum required designs to onboard (default 50)
  maintenanceMode: boolean;
  // Landing Page Controls
  featuredDesigns: string[]; // Array of design IDs for Featured Designs slider
  trendingDesigns: string[]; // Array of design IDs for Trending Designs slider
  landingPageStats: {
    totalClients: number;
    totalDesigners: number;
    totalDesignAssets: number;
  };
  clientNames: string[]; // Array of client names for client names slider
  // Legacy fields (keeping for backward compatibility)
  featuredContent?: {
    id: string;
    type: 'design' | 'designer' | 'banner';
    resourceId: string;
    order: number;
  }[];
  banners?: {
    id: string;
    title: string;
    imageUrl: string;
    link: string;
    order: number;
    active: boolean;
  }[];
}

export interface KPIData {
  totalRevenue: {
    today: number;
    month: number;
    change: number;
  };
  activeUsers: {
    count: number;
    change: number;
  };
  newDesigners: {
    count: number;
    period: '7d';
  };
  pendingPayouts: {
    count: number;
    amount: number;
  };
}

export interface Wallet {
  id: string;
  balance: number;
  pendingBalance: number;
  transactions: {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    createdAt: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
