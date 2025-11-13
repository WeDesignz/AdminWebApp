'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useState, useRef, useEffect } from 'react';
import {
  UserCircleIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { data: adminData } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => MockAPI.getAdminProfile(),
  });

  const admin = adminData?.data;

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize form data when admin loads
  useEffect(() => {
    if (admin) {
      setProfileData({
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        email: admin.email || '',
        mobileNumber: admin.mobileNumber || '',
      });
      if (admin.avatar) {
        setProfileImagePreview(admin.avatar);
      }
    }
  }, [admin]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfileImage = () => {
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const response = await MockAPI.updateAdminProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        mobileNumber: profileData.mobileNumber,
        avatar: profileImagePreview || undefined,
      });

      if (response.success) {
        toast.success('Profile updated successfully');
        queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      } else {
        toast.error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await MockAPI.updateAdminPassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(response.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('An error occurred while changing password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!admin) {
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
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Profile Information */}
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Profile Information</h3>
          
          {/* Profile Photo */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profileImagePreview ? (
                  <div className="relative">
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-border"
                    />
                    <button
                      onClick={handleRemoveProfileImage}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/80 transition-colors"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center border-2 border-border">
                    <UserCircleIcon className="w-12 h-12 text-muted" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                  id="profile-photo-input"
                />
                <label
                  htmlFor="profile-photo-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <CameraIcon className="w-4 h-4" />
                  {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                <p className="text-xs text-muted mt-2">JPG, PNG or GIF. Max size 5MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={profileData.firstName}
                onChange={(e) =>
                  setProfileData({ ...profileData, firstName: e.target.value })
                }
                placeholder="Enter first name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={profileData.lastName}
                onChange={(e) =>
                  setProfileData({ ...profileData, lastName: e.target.value })
                }
                placeholder="Enter last name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) =>
                  setProfileData({ ...profileData, email: e.target.value })
                }
                placeholder="Enter email address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mobile Number</label>
              <Input
                type="tel"
                value={profileData.mobileNumber}
                onChange={(e) =>
                  setProfileData({ ...profileData, mobileNumber: e.target.value })
                }
                placeholder="Enter mobile number"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted mb-4">
              <span>Role:</span>
              <span className="font-medium text-primary">{admin.role}</span>
            </div>
            <Button
              variant="primary"
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              isLoading={isUpdatingProfile}
              className="flex items-center gap-2"
            >
              <CheckIcon className="w-5 h-5" />
              Update Profile
            </Button>
          </div>
        </div>

        {/* Security - Password Change */}
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Security</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Password <span className="text-error">*</span>
              </label>
              <Input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                New Password <span className="text-error">*</span>
              </label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                placeholder="Enter new password (min 8 characters)"
                required
              />
              <p className="text-xs text-muted mt-1">Password must be at least 8 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm New Password <span className="text-error">*</span>
              </label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
                required
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                variant="primary"
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
                isLoading={isUpdatingPassword}
                className="flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
