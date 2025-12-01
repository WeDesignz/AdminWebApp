'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI, API } from '@/lib/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { SystemConfig, Design } from '@/types';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/common/Modal';
import { API_CONFIG } from '@/lib/api/config';

export default function SystemConfigsPage() {
  const router = useRouter();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Redirect moderators away from this page
  useEffect(() => {
    if (!hasRole('Super Admin')) {
      toast.error('Access denied. This page is restricted to Super Admins only.');
      router.replace('/dashboard');
    }
  }, [hasRole, router]);

  // Don't render if not Super Admin
  if (!hasRole('Super Admin')) {
    return null;
  }
  const [showDesignSelector, setShowDesignSelector] = useState(false);
  const [selectedDesignType, setSelectedDesignType] = useState<'hero_section' | 'featured' | 'dome_gallery' | null>(null);
  const [showClientNameModal, setShowClientNameModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [designsDisplayLimit, setDesignsDisplayLimit] = useState(60);
  const [designsPerPage, setDesignsPerPage] = useState(50);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => API.systemConfig.getSystemConfig(),
  });

  // Fetch business config from API (read-only values from environment)
  const { data: businessConfigData } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => API.systemConfig.getBusinessConfig(),
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
    heroSectionDesigns: [],
    featuredDesigns: [],
    domeGalleryDesigns: [],
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
      // Helper to convert IDs to strings (backend returns integers, frontend uses strings)
      const normalizeIds = (ids: any[]): string[] => {
        if (!Array.isArray(ids)) return [];
        return ids.map(id => String(id)).filter(Boolean);
      };

      setFormData({
        commissionRate: configData.data.commissionRate,
        gstPercentage: configData.data.gstPercentage,
        customOrderTimeSlot: configData.data.customOrderTimeSlot,
        minimumRequiredDesigns: configData.data.minimumRequiredDesigns,
        heroSectionDesigns: normalizeIds(configData.data.heroSectionDesigns || []),
        featuredDesigns: normalizeIds(configData.data.featuredDesigns || []),
        domeGalleryDesigns: normalizeIds(configData.data.domeGalleryDesigns || []),
        landingPageStats: configData.data.landingPageStats,
        clientNames: configData.data.clientNames || [],
      });
    }
  }, [configData]);

  // Update business config values from API (these are read-only from environment)
  useEffect(() => {
    if (businessConfigData?.data) {
      setFormData(prev => ({
        ...prev,
        commissionRate: businessConfigData.data!.commission_rate,
        gstPercentage: businessConfigData.data!.gst_percentage,
        customOrderTimeSlot: businessConfigData.data!.custom_order_time_slot_hours,
        minimumRequiredDesigns: businessConfigData.data!.minimum_required_designs_onboard,
      }));
    }
  }, [businessConfigData]);

  const activeDesigns = designsData?.data?.filter((d: Design) => d.status === 'approved') || [];
  
  // Filter designs based on search query
  const filteredDesigns = designSearchQuery
    ? activeDesigns.filter((d: Design) =>
        d.title.toLowerCase().includes(designSearchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(designSearchQuery.toLowerCase())
      )
    : activeDesigns;
  
  // Get displayed designs (with limit for dome gallery)
  const displayedDesigns = selectedDesignType === 'dome_gallery' 
    ? filteredDesigns.slice(0, designsDisplayLimit)
    : filteredDesigns;
  
  const hasMoreDesigns = selectedDesignType === 'dome_gallery' && filteredDesigns.length > designsDisplayLimit;
  
  // Get section title helper
  const getSectionTitle = (type: 'hero_section' | 'featured' | 'dome_gallery') => {
    const titles = {
      hero_section: 'Hero Section Cards',
      featured: 'Featured Designs',
      dome_gallery: 'Dome Gallery Images',
    };
    return titles[type];
  };
  
  // Get section description helper
  const getSectionDescription = (type: 'hero_section' | 'featured' | 'dome_gallery') => {
    const descriptions = {
      hero_section: 'Select 3-5 designs to display in the hero section CardSwap component',
      featured: 'Select designs to feature in the Featured Designs slider',
      dome_gallery: 'Select 50+ designs for the 3D dome gallery (more images = better visual effect)',
    };
    return descriptions[type];
  };
  
  // Clear all designs for a section
  const handleClearAll = (type: 'hero_section' | 'featured' | 'dome_gallery') => {
    if (type === 'hero_section') {
      setFormData({ ...formData, heroSectionDesigns: [] });
    } else if (type === 'featured') {
      setFormData({ ...formData, featuredDesigns: [] });
    } else {
      setFormData({ ...formData, domeGalleryDesigns: [] });
    }
    toast.success(`Cleared all ${getSectionTitle(type).toLowerCase()}`);
  };

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

    // Validate hero section designs exist
    if (formData.heroSectionDesigns) {
      const invalidHero = formData.heroSectionDesigns.filter(
        (id) => !activeDesigns.find((d: Design) => d.id === id)
      );
      if (invalidHero.length > 0) {
        toast.error('Some hero section designs are not active. Please select active designs only.');
        return;
      }
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

    // Validate dome gallery designs exist
    if (formData.domeGalleryDesigns) {
      const invalidDome = formData.domeGalleryDesigns.filter(
        (id) => !activeDesigns.find((d: Design) => d.id === id)
      );
      if (invalidDome.length > 0) {
        toast.error('Some dome gallery designs are not active. Please select active designs only.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await API.systemConfig.updateSystemConfig(formData);
      if (response.success) {
        toast.success('System configuration updated successfully');
        queryClient.invalidateQueries({ queryKey: ['system-config'] });
      } else {
        toast.error(response.error || 'Failed to update system configuration');
      }
    } catch (error) {
      toast.error('An error occurred while updating configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDesigns = (type: 'hero_section' | 'featured' | 'dome_gallery') => {
    setSelectedDesignType(type);
    setDesignsDisplayLimit(60);
    setShowDesignSelector(true);
  };

  const handleDesignToggle = (designId: string, type?: 'hero_section' | 'featured' | 'dome_gallery') => {
    // Use provided type or fall back to selectedDesignType (for modal usage)
    const designType = type || selectedDesignType;
    if (!designType) return;

    const currentList = 
      designType === 'hero_section' ? (formData.heroSectionDesigns || []) :
      designType === 'featured' ? (formData.featuredDesigns || []) :
      (formData.domeGalleryDesigns || []);

    const isSelected = currentList.includes(designId);
    const newList = isSelected
      ? currentList.filter((id) => id !== designId)
      : [...currentList, designId];

    if (designType === 'hero_section') {
      setFormData({ ...formData, heroSectionDesigns: newList });
    } else if (designType === 'featured') {
      setFormData({ ...formData, featuredDesigns: newList });
    } else {
      setFormData({ ...formData, domeGalleryDesigns: newList });
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

  const getSelectedDesigns = (type: 'hero_section' | 'featured' | 'dome_gallery') => {
    const list = 
      type === 'hero_section' ? formData.heroSectionDesigns || [] :
      type === 'featured' ? formData.featuredDesigns || [] :
      formData.domeGalleryDesigns || [];
    
    // Normalize list IDs to strings for comparison (handle both string and number IDs)
    const normalizedList = list.map(id => String(id));
    
    // Filter designs where ID matches (ensuring both are strings)
    return activeDesigns.filter((d: Design) => normalizedList.includes(String(d.id)));
  };

  // Helper to make URL absolute if needed
  const makeAbsoluteUrl = (url: string): string => {
    if (!url) return url;
    // If already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If relative URL, prepend API base URL
    if (API_CONFIG.baseURL) {
      // Remove leading slash from URL if present to avoid double slashes
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      return `${API_CONFIG.baseURL}/${cleanUrl}`;
    }
    // If no API base URL configured, return as is (might work if relative to current domain)
    return url;
  };

  // Helper function to get mockup image URL from a design (for hero, featured)
  const getMockupImageUrl = (design: Design): string | null => {
    // First, try to find a mockup image from files
    if (design.files && design.files.length > 0) {
      const mockupFile = design.files.find((f) => f.isMockup === true && f.type === 'image');
      if (mockupFile && mockupFile.url) {
        return makeAbsoluteUrl(mockupFile.url);
      }
    }
    
    // Fallback: check if thumbnailUrl is already a mockup (from transformProductToDesign logic)
    // The transformProductToDesign already prioritizes mockups for thumbnailUrl
    if (design.thumbnailUrl) {
      return makeAbsoluteUrl(design.thumbnailUrl);
    }
    
    return null;
  };

  // Helper function to get ANY image URL from a design (for dome gallery - prefers mockup but accepts any image)
  const getAnyImageUrl = (design: Design): string | null => {
    // First, try to find a mockup image from files
    if (design.files && design.files.length > 0) {
      const mockupFile = design.files.find((f) => f.isMockup === true && f.type === 'image');
      if (mockupFile && mockupFile.url) {
        return makeAbsoluteUrl(mockupFile.url);
      }
      
      // If no mockup, find ANY image file
      const imageFile = design.files.find((f) => f.type === 'image');
      if (imageFile && imageFile.url) {
        return makeAbsoluteUrl(imageFile.url);
      }
    }
    
    // Fallback: use thumbnailUrl (which should be an image)
    if (design.thumbnailUrl) {
      return makeAbsoluteUrl(design.thumbnailUrl);
    }
    
    return null;
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

          {/* Landing Page Controls */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Landing Page Controls</h3>

            {/* Landing Page Statistics */}
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold">Landing Page Statistics</label>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                  Displayed on landing page
                </span>
              </div>
              <p className="text-xs text-muted mb-4">These statistics are shown in the ClientsStats section on the landing page</p>
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
                    placeholder="0"
                  />
                  <p className="text-xs text-muted mt-1">Number of happy clients</p>
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
                    placeholder="0"
                />
                  <p className="text-xs text-muted mt-1">Number of active designers</p>
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
                    placeholder="0"
                  />
                  <p className="text-xs text-muted mt-1">Total design assets available</p>
                </div>
            </div>
          </div>

            {/* Client Names Slider */}
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-semibold">Client Names Slider</label>
                  {formData.clientNames && formData.clientNames.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {formData.clientNames.length} client{formData.clientNames.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
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
              <p className="text-xs text-muted mb-4">Client names displayed in the scrolling slider on the landing page</p>
              <div className="space-y-2">
                {formData.clientNames && formData.clientNames.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                      <PlusIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted font-medium">No client names added</p>
                    <p className="text-xs text-muted mt-1">Click &quot;Add Client Name&quot; to add clients to the slider</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {formData.clientNames?.map((name, index) => (
                      <div
                        key={name}
                        className="group relative flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-all"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted">#{index + 1} in slider</p>
                        </div>
                        <button
                          onClick={() => handleRemoveClientName(name)}
                          className="flex-shrink-0 p-1.5 text-error hover:bg-error/10 rounded transition-colors"
                          title="Remove client name"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hero Section Cards */}
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-semibold">Hero Section Cards</label>
                  {getSelectedDesigns('hero_section').length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {getSelectedDesigns('hero_section').length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getSelectedDesigns('hero_section').length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearAll('hero_section')}
                      className="text-xs text-error hover:text-error"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectDesigns('hero_section')}
                    className="flex items-center gap-2"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    {getSelectedDesigns('hero_section').length > 0 ? 'Edit' : 'Select'} Designs
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted mb-3">3-5 designs recommended for optimal display</p>
              <div className="space-y-2">
                {getSelectedDesigns('hero_section').length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                    <PhotoIcon className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm text-muted">No designs selected</p>
                    <p className="text-xs text-muted mt-1">Click &quot;Select Designs&quot; to add designs</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getSelectedDesigns('hero_section').map((design: Design, index: number) => (
                      <div
                        key={design.id}
                        className="group relative flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-all"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted relative group/image">
                          {(() => {
                            // For hero section, prefer mockup but fall back to any image
                            const imageUrl = getAnyImageUrl(design);
                            return imageUrl ? (
                              <>
                            <img
                                  src={imageUrl}
                              alt={design.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.placeholder-fallback')) {
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'placeholder-fallback w-full h-full flex items-center justify-center bg-muted';
                                      placeholder.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                      parent.appendChild(placeholder);
                                    }
                              }}
                            />
                                <div 
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                  onClick={() => setPreviewImage(imageUrl)}
                                >
                                  <EyeIcon className="w-5 h-5 text-white" />
                                </div>
                              </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <PhotoIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{design.title}</p>
                          <p className="text-xs text-muted">#{index + 1} in order</p>
                        </div>
                        <button
                          onClick={() => handleDesignToggle(design.id, 'hero_section')}
                          className="flex-shrink-0 p-1.5 text-error hover:bg-error/10 rounded transition-colors"
                          title="Remove"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Featured Designs */}
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-semibold">Featured Designs Slider</label>
                  {getSelectedDesigns('featured').length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {getSelectedDesigns('featured').length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getSelectedDesigns('featured').length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearAll('featured')}
                      className="text-xs text-error hover:text-error"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                  onClick={() => handleSelectDesigns('featured')}
                    className="flex items-center gap-2"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    {getSelectedDesigns('featured').length > 0 ? 'Edit' : 'Select'} Designs
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {getSelectedDesigns('featured').length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                    <PhotoIcon className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm text-muted">No designs selected</p>
                    <p className="text-xs text-muted mt-1">Click &quot;Select Designs&quot; to add designs</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getSelectedDesigns('featured').map((design: Design) => (
                      <div
                        key={design.id}
                        className="group relative flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-all"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted relative group/image">
                          {(() => {
                            // For featured designs, prefer mockup but fall back to any image
                            const imageUrl = getAnyImageUrl(design);
                            return imageUrl ? (
                              <>
                            <img
                                  src={imageUrl}
                              alt={design.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.placeholder-fallback')) {
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'placeholder-fallback w-full h-full flex items-center justify-center bg-muted';
                                      placeholder.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                      parent.appendChild(placeholder);
                                    }
                              }}
                            />
                                <div 
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                  onClick={() => setPreviewImage(imageUrl)}
                                >
                                  <EyeIcon className="w-5 h-5 text-white" />
                                </div>
                              </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <PhotoIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{design.title}</p>
                          <p className="text-xs text-muted truncate">{design.category || 'Uncategorized'}</p>
                        </div>
                        <button
                          onClick={() => handleDesignToggle(design.id, 'featured')}
                          className="flex-shrink-0 p-1.5 text-error hover:bg-error/10 rounded transition-colors"
                          title="Remove"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dome Gallery Designs */}
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-semibold">Dome Gallery Images</label>
                  {getSelectedDesigns('dome_gallery').length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {getSelectedDesigns('dome_gallery').length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getSelectedDesigns('dome_gallery').length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearAll('dome_gallery')}
                      className="text-xs text-error hover:text-error"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectDesigns('dome_gallery')}
                    className="flex items-center gap-2"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    {getSelectedDesigns('dome_gallery').length > 0 ? 'Edit' : 'Select'} Designs
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted mb-3">50+ designs recommended for optimal 3D gallery effect</p>
              <div className="space-y-2">
                {getSelectedDesigns('dome_gallery').length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                    <PhotoIcon className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm text-muted">No designs selected</p>
                    <p className="text-xs text-muted mt-1">Click &quot;Select Designs&quot; to add designs</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {getSelectedDesigns('dome_gallery').map((design: Design) => (
                        <div
                          key={design.id}
                          className="group relative aspect-square bg-background border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all"
                        >
                          {(() => {
                            // For dome gallery, use ANY image (prefers mockup but accepts any image)
                            const imageUrl = getAnyImageUrl(design);
                            return imageUrl ? (
                            <img
                                src={imageUrl}
                              alt={design.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.placeholder-fallback')) {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'placeholder-fallback w-full h-full flex items-center justify-center bg-muted';
                                    placeholder.innerHTML = '<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                    parent.appendChild(placeholder);
                                  }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <PhotoIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            );
                          })()}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const imageUrl = getAnyImageUrl(design);
                                if (imageUrl) {
                                  setPreviewImage(imageUrl);
                                }
                              }}
                              className="p-2 bg-primary/90 hover:bg-primary rounded-full text-white transition-colors"
                              title="Preview"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDesignToggle(design.id, 'dome_gallery');
                              }}
                              className="p-2 bg-error/90 hover:bg-error rounded-full text-white transition-colors"
                              title="Remove"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate font-medium">{design.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
          setDesignSearchQuery('');
        }}
        title={selectedDesignType ? `Select ${getSectionTitle(selectedDesignType)}` : 'Select Designs'}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted mb-3">
              {selectedDesignType ? getSectionDescription(selectedDesignType) : 'Select designs to display'}
            </p>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search designs by title or ID..."
                  value={designSearchQuery}
                  onChange={(e) => setDesignSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10"
                />
                {designSearchQuery && (
                  <button
                    onClick={() => setDesignSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear search"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Count */}
            {selectedDesignType && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">
                  {selectedDesignType === 'dome_gallery' 
                    ? `${displayedDesigns.length} of ${filteredDesigns.length} design${filteredDesigns.length !== 1 ? 's' : ''} shown`
                    : `${filteredDesigns.length} design${filteredDesigns.length !== 1 ? 's' : ''} available`
                  }
                  {designSearchQuery && ` (filtered from ${activeDesigns.length})`}
                </p>
                {(() => {
                  const currentList =
                    selectedDesignType === 'hero_section' ? (formData.heroSectionDesigns || []) :
                    selectedDesignType === 'featured' ? (formData.featuredDesigns || []) :
                    (formData.domeGalleryDesigns || []);
                  const selectedCount = currentList.length;
                  return selectedCount > 0 ? (
                    <span className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {selectedCount} selected
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Designs Grid */}
          <div className="max-h-[60vh] overflow-y-auto">
            {displayedDesigns.length === 0 ? (
              <div className="text-center py-12">
                <PhotoIcon className="w-12 h-12 mx-auto text-muted mb-3" />
                <p className="text-muted font-medium">No designs found</p>
                {designSearchQuery && (
                  <p className="text-sm text-muted mt-1">
                    Try a different search term or{' '}
                    <button
                      onClick={() => setDesignSearchQuery('')}
                      className="text-primary hover:underline"
                    >
                      clear search
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className={`grid gap-3 ${
                  selectedDesignType === 'dome_gallery' 
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' 
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {displayedDesigns.map((design: Design) => {
                  const currentList =
                    selectedDesignType === 'hero_section' ? (formData.heroSectionDesigns || []) :
                    selectedDesignType === 'featured' ? (formData.featuredDesigns || []) :
                    (formData.domeGalleryDesigns || []);
                  const isSelected = currentList.includes(design.id);

                  const isDomeGallery = selectedDesignType === 'dome_gallery';

                  return (
                    <label
                      key={design.id}
                      className={`group relative flex flex-col border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50 bg-background'
                      } ${isDomeGallery ? 'border' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className={`${isDomeGallery ? 'aspect-square' : 'aspect-video'} bg-muted relative overflow-hidden`}>
                        {(() => {
                          // Prefer mockup but fall back to any image
                          const imageUrl = getAnyImageUrl(design);
                          return imageUrl ? (
                          <img
                              src={imageUrl}
                            alt={design.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.placeholder-fallback')) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'placeholder-fallback w-full h-full flex items-center justify-center bg-muted';
                                  placeholder.innerHTML = '<svg class="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                  parent.appendChild(placeholder);
                                }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PhotoIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                          );
                        })()}
                        {/* Checkbox Overlay */}
                        <div className="absolute top-2 right-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-white/90 text-muted-foreground group-hover:bg-primary/20'
                            }`}
                          >
                            {isSelected ? (
                              <CheckIcon className="w-4 h-4" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-current" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Design Info */}
                      {!isDomeGallery && (
                      <div className="p-3">
                        <p className="font-medium text-sm truncate mb-1">{design.title}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted truncate flex-1">
                            {design.category || 'Uncategorized'}
                          </p>
                          <p className="text-xs text-muted ml-2">ID: {design.id}</p>
                        </div>
                      </div>
                      )}
                      {isDomeGallery && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white font-medium truncate">{design.title}</p>
                          <p className="text-xs text-white/80 truncate">{design.category || 'Uncategorized'}</p>
                        </div>
                      )}

                      {/* Hidden checkbox for accessibility */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleDesignToggle(design.id)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
                </div>
                {hasMoreDesigns && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setDesignsDisplayLimit(prev => prev + 60)}
                      className="flex items-center gap-2"
                    >
                      Load More ({filteredDesigns.length - designsDisplayLimit} remaining)
                    </Button>
              </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              {selectedDesignType && (() => {
                const currentList =
                  selectedDesignType === 'hero_section' ? (formData.heroSectionDesigns || []) :
                  selectedDesignType === 'featured' ? (formData.featuredDesigns || []) :
                  (formData.domeGalleryDesigns || []);
                return currentList.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearAll(selectedDesignType)}
                    className="text-xs text-error hover:text-error"
                  >
                    Clear All Selected
                  </Button>
                ) : null;
              })()}
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setShowDesignSelector(false);
                setSelectedDesignType(null);
                setDesignSearchQuery('');
                setDesignsDisplayLimit(60);
                toast.success('Designs updated');
              }}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Done
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

      {/* Image Preview Modal */}
      <Modal
        isOpen={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        title="Image Preview"
      >
        <div className="p-4">
          {previewImage && (
            <div className="flex items-center justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
