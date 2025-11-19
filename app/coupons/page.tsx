'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { API } from '@/lib/api';
import { Coupon } from '@/types';
import { formatDate } from '@/lib/utils/cn';
import { PlusIcon, TagIcon, CalendarIcon } from '@heroicons/react/24/outline';

type CreateCouponForm = {
  name: string;
  code: string;
  appliedToBase: boolean;
  appliedToPrime: boolean;
  appliedToPremium: boolean;
  description: string;
  couponDiscountType: 'flat' | 'percentage';
  discountValue: string;
  maxUsage: string;
  maxUsagePerUser: string;
  minOrderValue: string;
  startDateTime: string;
  endDateTime: string;
  status: Coupon['status'];
};

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
  expired: 'bg-rose-100 text-rose-700 border border-rose-200',
  scheduled: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const couponStatusLabels: Record<Coupon['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  expired: 'Expired',
  scheduled: 'Scheduled',
};

const toInputDateTime = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const getInitialFormState = (): CreateCouponForm => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    name: '',
    code: '',
    appliedToBase: true,
    appliedToPrime: false,
    appliedToPremium: false,
    description: '',
    couponDiscountType: 'flat',
    discountValue: '0',
    maxUsage: '0',
    maxUsagePerUser: '1',
    minOrderValue: '0',
    startDateTime: toInputDateTime(now),
    endDateTime: toInputDateTime(nextWeek),
    status: 'active',
  };
};

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

const planChips = [
  { key: 'appliedToBase', label: 'Base' },
  { key: 'appliedToPrime', label: 'Prime' },
  { key: 'appliedToPremium', label: 'Premium' },
];

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateCouponForm>(getInitialFormState);

  const {
    data: coupons = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await API.coupons.getCoupons();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch coupons');
      }
      return response.data || [];
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (payload: CreateCouponForm) => {
      const response = await API.coupons.createCoupon({
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        appliedToBase: payload.appliedToBase,
        appliedToPrime: payload.appliedToPrime,
        appliedToPremium: payload.appliedToPremium,
        description: payload.description?.trim() || undefined,
        couponDiscountType: payload.couponDiscountType,
        discountValue: parseFloat(payload.discountValue),
        maxUsage: Number(payload.maxUsage || 0),
        maxUsagePerUser: Number(payload.maxUsagePerUser || 1),
        minOrderValue: parseFloat(payload.minOrderValue || '0'),
        startDateTime: new Date(payload.startDateTime).toISOString(),
        endDateTime: new Date(payload.endDateTime).toISOString(),
        status: payload.status,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create coupon');
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Coupon created successfully');
      setShowModal(false);
      setFormData(getInitialFormState());
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create coupon';
      toast.error(message);
    },
  });

  const handleInputChange = (field: keyof CreateCouponForm, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Name and coupon code are required.');
      return;
    }

    if (
      !formData.appliedToBase &&
      !formData.appliedToPrime &&
      !formData.appliedToPremium
    ) {
      toast.error('Select at least one plan to apply this coupon.');
      return;
    }

    const discountValue = parseFloat(formData.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      toast.error('Enter a valid discount value greater than 0.');
      return;
    }

    const maxUsagePerUser = Number(formData.maxUsagePerUser || 0);
    if (isNaN(maxUsagePerUser) || maxUsagePerUser < 1) {
      toast.error('Max usage per user must be at least 1.');
      return;
    }

    const startDate = new Date(formData.startDateTime);
    const endDate = new Date(formData.endDateTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast.error('Please provide valid start and end date/time.');
      return;
    }
    if (startDate >= endDate) {
      toast.error('Start date must be before end date.');
      return;
    }

    createCouponMutation.mutate(formData);
  };

  const renderPlanChip = (label: string, active: boolean) => (
    <span
      key={label}
      className={`px-3 py-1 rounded-full text-sm font-medium border ${
        active
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-muted/30 text-muted-foreground border-transparent'
      }`}
    >
      {label}
    </span>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Coupons</h1>
            <p className="text-muted-foreground">
              Create and manage promotional codes for your customers.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <PlusIcon className="w-5 h-5" />
            Add Coupon
          </Button>
        </div>

        {isLoading && (
          <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-6 w-1/4 bg-muted/50 rounded mb-4" />
            <div className="h-4 w-1/2 bg-muted/40 rounded mb-2" />
            <div className="h-4 w-1/3 bg-muted/30 rounded" />
          </div>
        )}

        {isError && (
          <div className="p-4 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl">
            {(error as Error)?.message || 'Failed to load coupons.'}
          </div>
        )}

        {!isLoading && !isError && coupons.length === 0 && (
          <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground">
            No coupons found. Start by creating your first coupon.
          </div>
        )}

        {!isLoading && !isError && coupons.length > 0 && (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const discountLabel =
                coupon.couponDiscountType === 'flat'
                  ? `${formatINR(coupon.discountValue)} off`
                  : `${coupon.discountValue}% off`;

              return (
                <div
                  key={coupon.id}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-semibold">{coupon.name}</h2>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                          CODE: {coupon.code}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            statusStyles[coupon.status] || statusStyles.inactive
                          }`}
                        >
                          {couponStatusLabels[coupon.status] || coupon.status}
                        </span>
                        {coupon.isValid && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Live now
                          </span>
                        )}
                      </div>
                      {coupon.description && (
                        <p className="text-muted-foreground mt-2">{coupon.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Discount</p>
                      <p className="text-xl font-semibold">{discountLabel}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TagIcon className="w-4 h-4" />
                        Plans
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {renderPlanChip('Base', coupon.appliedToBase)}
                        {renderPlanChip('Prime', coupon.appliedToPrime)}
                        {renderPlanChip('Premium', coupon.appliedToPremium)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        Validity
                      </div>
                      <p className="font-medium">
                        {formatDate(coupon.startDateTime, 'long')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        until {formatDate(coupon.endDateTime, 'long')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Usage</p>
                      <p className="font-medium">
                        Used {coupon.usageCount ?? 0} /{' '}
                        {coupon.maxUsage === 0 ? 'Unlimited' : coupon.maxUsage}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Per user: {coupon.maxUsagePerUser}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Minimum Order Value</p>
                      <p className="font-semibold">
                        {formatINR(coupon.minOrderValue || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Discount Type</p>
                      <p className="font-semibold capitalize">
                        {coupon.couponDiscountType === 'flat' ? 'Flat' : 'Percentage'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created On</p>
                      <p className="font-semibold">
                        {coupon.createdAt ? formatDate(coupon.createdAt, 'long') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!createCouponMutation.isLoading) {
            setShowModal(false);
            setFormData(getInitialFormState());
          }
        }}
        title="Create Coupon"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Coupon Name"
              placeholder="Summer Sale"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
            <Input
              label="Coupon Code"
              placeholder="SUMMER20"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              required
            />
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type</label>
              <select
                className="input-field"
                value={formData.couponDiscountType}
                onChange={(e) =>
                  handleInputChange('couponDiscountType', e.target.value as 'flat' | 'percentage')
                }
              >
                <option value="flat">Flat</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <Input
              label={
                formData.couponDiscountType === 'flat'
                  ? 'Discount Value (INR)'
                  : 'Discount Percentage (%)'
              }
              type="number"
              min="0"
              step="0.01"
              value={formData.discountValue}
              onChange={(e) => handleInputChange('discountValue', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Max Usage (0 for unlimited)"
              type="number"
              min="0"
              value={formData.maxUsage}
              onChange={(e) => handleInputChange('maxUsage', e.target.value)}
            />
            <Input
              label="Max Usage per User"
              type="number"
              min="1"
              value={formData.maxUsagePerUser}
              onChange={(e) => handleInputChange('maxUsagePerUser', e.target.value)}
              required
            />
            <Input
              label="Minimum Order Value (INR)"
              type="number"
              min="0"
              step="0.01"
              value={formData.minOrderValue}
              onChange={(e) => handleInputChange('minOrderValue', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => handleInputChange('startDateTime', e.target.value)}
              required
            />
            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => handleInputChange('endDateTime', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Applies To Plans</label>
            <div className="flex flex-wrap gap-3">
              {planChips.map((chip) => {
                const key = chip.key as keyof Pick<
                  CreateCouponForm,
                  'appliedToBase' | 'appliedToPrime' | 'appliedToPremium'
                >;
                const isActive = formData[key];
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => handleInputChange(key, !isActive)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) =>
                  handleInputChange('status', e.target.value as Coupon['status'])
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                className="input-field min-h-[120px] resize-none"
                placeholder="Add a short description or usage note"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!createCouponMutation.isLoading) {
                  setShowModal(false);
                  setFormData(getInitialFormState());
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createCouponMutation.isLoading}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

