'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { SystemConfig, Design } from '@/types';
import { useState, useEffect } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';

export default function SystemConfigsPage() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [showDesignSelector, setShowDesignSelector] = useState(false);
  const [selectedDesignType, setSelectedDesignType] = useState<'featured' | 'trending' | null>(null);
  const [showClientNameModal, setShowClientNameModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => MockAPI.getSystemConfig(),
  });

  const { data: designsData } = useQuery({
    queryKey: ['designs-for-config'],
    queryFn: () => MockAPI.getDesigns({ status: 'approved', limit: 1000 }),
  });

  const [formData, setFormData] = useState<Partial<SystemConfig>>({
    commissionRate: 15,
    gstPercentage: 18,
    customOrderTimeSlot: 1,
    minimumRequiredDesigns: 50,
    maintenanceMode: false,
    featuredDesigns: [],
    trendingDesigns: [],
    landingPageStats: {
      totalClients: 0,
      totalDesigners: 0,
      totalDesignAssets: 0,
    },
    clientNames: [],
  });

  // Update form data when config loads
  useEffect(() => {
    if (configData?.data) {
      setFormData({
        commissionRate: configData.data.commissionRate,
        gstPercentage: configData.data.gstPercentage,
        customOrderTimeSlot: configData.data.customOrderTimeSlot,
        minimumRequiredDesigns: configData.data.minimumRequiredDesigns,
        maintenanceMode: configData.data.maintenanceMode,
        featuredDesigns: configData.data.featuredDesigns || [],
        trendingDesigns: configData.data.trendingDesigns || [],
        landingPageStats: configData.data.landingPageStats,
        clientNames: configData.data.clientNames || [],
      });
    }
  }, [configData]);

  const activeDesigns = designsData?.data?.filter((d: Design) => d.status === 'approved') || [];

  const handleSave = async () => {
    // Validation
    if (formData.commissionRate !== undefined && (formData.commissionRate < 0 || formData.commissionRate > 100)) {
      toast.error('Commission rate must be between 0 and 100%');
      return;
    }

    if (formData.gstPercentage !== undefined && (formData.gstPercentage < 0 || formData.gstPercentage > 100)) {
      toast.error('GST percentage must be between 0 and 100%');
      return;
    }

    // Validate featured designs exist
    if (formData.featuredDesigns) {
      const invalidFeatured = formData.featuredDesigns.filter(
        (id) => !activeDesigns.find((d: Design) => d.id === id)
      );
      if (invalidFeatured.length > 0) {
        toast.error('Some featured designs are not active. Please select active designs only.');
        return;
      }
    }

    // Validate trending designs exist
    if (formData.trendingDesigns) {
      const invalidTrending = formData.trendingDesigns.filter(
        (id) => !activeDesigns.find((d: Design) => d.id === id)
      );
      if (invalidTrending.length > 0) {
        toast.error('Some trending designs are not active. Please select active designs only.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await MockAPI.updateSystemConfig(formData);
      if (response.success) {
        toast.success('System configuration updated successfully');
        queryClient.invalidateQueries({ queryKey: ['system-config'] });
      } else {
        toast.error('Failed to update system configuration');
      }
    } catch (error) {
      toast.error('An error occurred while updating configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDesigns = (type: 'featured' | 'trending') => {
    setSelectedDesignType(type);
    setShowDesignSelector(true);
  };

  const handleDesignToggle = (designId: string) => {
    if (!selectedDesignType) return;

    const currentList = selectedDesignType === 'featured' 
      ? formData.featuredDesigns || []
      : formData.trendingDesigns || [];

    const isSelected = currentList.includes(designId);
    const newList = isSelected
      ? currentList.filter((id) => id !== designId)
      : [...currentList, designId];

    if (selectedDesignType === 'featured') {
      setFormData({ ...formData, featuredDesigns: newList });
    } else {
      setFormData({ ...formData, trendingDesigns: newList });
    }
  };

  const handleAddClientName = () => {
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }
    const currentNames = formData.clientNames || [];
    if (currentNames.includes(newClientName.trim())) {
      toast.error('Client name already exists');
      return;
    }
    setFormData({
      ...formData,
      clientNames: [...currentNames, newClientName.trim()],
    });
    setNewClientName('');
    setShowClientNameModal(false);
    toast.success('Client name added');
  };

  const handleRemoveClientName = (name: string) => {
    const currentNames = formData.clientNames || [];
    setFormData({
      ...formData,
      clientNames: currentNames.filter((n) => n !== name),
    });
  };

  const getSelectedDesigns = (type: 'featured' | 'trending') => {
    const list = type === 'featured' ? formData.featuredDesigns || [] : formData.trendingDesigns || [];
    return activeDesigns.filter((d: Design) => list.includes(d.id));
  };

  if (isLoadingConfig) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Configuration</h1>
            <p className="text-muted mt-1">Manage platform settings and landing page controls</p>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            isLoading={isSaving}
            className="flex items-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
          {/* Global Configuration */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Global Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Commission Rate (%) <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commissionRate || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commissionRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0-100"
                />
                <p className="text-xs text-muted mt-1">Platform commission percentage (0-100%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  GST Percentage (%) <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.gstPercentage || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gstPercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0-100"
                />
                <p className="text-xs text-muted mt-1">GST percentage applied to transactions</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Order Time Slot (hours) <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.customOrderTimeSlot || 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customOrderTimeSlot: parseFloat(e.target.value) || 1,
                    })
                  }
                  placeholder="1"
                />
                <p className="text-xs text-muted mt-1">Default time slot for custom orders (default: 1 hour)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Required Designs <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.minimumRequiredDesigns || 50}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumRequiredDesigns: parseInt(e.target.value) || 50,
                    })
                  }
                  placeholder="50"
                />
                <p className="text-xs text-muted mt-1">Minimum designs required for designer onboarding (default: 50)</p>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Maintenance Mode</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Maintenance Mode</p>
                <p className="text-sm text-muted">Platform will be inaccessible to users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.maintenanceMode || false}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenanceMode: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-muted/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Landing Page Controls */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Landing Page Controls</h3>

            {/* Featured Designs */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Featured Designs Slider</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectDesigns('featured')}
                  className="flex items-center gap-2"
                >
                  <PhotoIcon className="w-4 h-4" />
                  Select Designs
                </Button>
              </div>
              <div className="space-y-2">
                {getSelectedDesigns('featured').length === 0 ? (
                  <p className="text-sm text-muted">No featured designs selected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getSelectedDesigns('featured').map((design: Design) => (
                      <div
                        key={design.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg"
                      >
                        <span className="text-sm font-medium">{design.title}</span>
                        <button
                          onClick={() => handleDesignToggle(design.id)}
                          className="text-error hover:text-error/80"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trending Designs */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Trending Designs Slider</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectDesigns('trending')}
                  className="flex items-center gap-2"
                >
                  <PhotoIcon className="w-4 h-4" />
                  Select Designs
                </Button>
              </div>
              <div className="space-y-2">
                {getSelectedDesigns('trending').length === 0 ? (
                  <p className="text-sm text-muted">No trending designs selected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getSelectedDesigns('trending').map((design: Design) => (
                      <div
                        key={design.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg"
                      >
                        <span className="text-sm font-medium">{design.title}</span>
                        <button
                          onClick={() => handleDesignToggle(design.id)}
                          className="text-error hover:text-error/80"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Landing Page Statistics */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Landing Page Statistics</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Total Clients</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.landingPageStats?.totalClients || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landingPageStats: {
                          ...formData.landingPageStats!,
                          totalClients: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Total Designers</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.landingPageStats?.totalDesigners || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landingPageStats: {
                          ...formData.landingPageStats!,
                          totalDesigners: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Total Design Assets</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.landingPageStats?.totalDesignAssets || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landingPageStats: {
                          ...formData.landingPageStats!,
                          totalDesignAssets: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Client Names Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Client Names Slider</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClientNameModal(true)}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Client Name
                </Button>
              </div>
              <div className="space-y-2">
                {formData.clientNames && formData.clientNames.length === 0 ? (
                  <p className="text-sm text-muted">No client names added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.clientNames?.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg"
                      >
                        <span className="text-sm font-medium">{name}</span>
                        <button
                          onClick={() => handleRemoveClientName(name)}
                          className="text-error hover:text-error/80"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Design Selector Modal */}
      <Modal
        isOpen={showDesignSelector}
        onClose={() => {
          setShowDesignSelector(false);
          setSelectedDesignType(null);
        }}
        title={`Select ${selectedDesignType === 'featured' ? 'Featured' : 'Trending'} Designs`}
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Select active designs for the {selectedDesignType === 'featured' ? 'Featured' : 'Trending'} Designs slider
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {activeDesigns.length === 0 ? (
              <p className="text-center text-muted py-8">No active designs available</p>
            ) : (
              activeDesigns.map((design: Design) => {
                const currentList =
                  selectedDesignType === 'featured'
                    ? formData.featuredDesigns || []
                    : formData.trendingDesigns || [];
                const isSelected = currentList.includes(design.id);

                return (
                  <label
                    key={design.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/10 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleDesignToggle(design.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{design.title}</p>
                      <p className="text-xs text-muted">ID: {design.id}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowDesignSelector(false);
                setSelectedDesignType(null);
              }}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Client Name Modal */}
      <Modal
        isOpen={showClientNameModal}
        onClose={() => {
          setShowClientNameModal(false);
          setNewClientName('');
        }}
        title="Add Client Name"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Client Name <span className="text-error">*</span>
            </label>
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Enter client name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddClientName();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowClientNameModal(false);
                setNewClientName('');
              }}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddClientName}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
