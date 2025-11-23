'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockAPI } from '@/lib/api';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useState, useRef, useEffect } from 'react';
import {
  UserCircleIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [is2FASettingUp, setIs2FASettingUp] = useState(false);
  const [is2FAEnabling, setIs2FAEnabling] = useState(false);
  const [is2FADisabling, setIs2FADisabling] = useState(false);

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
      const response = await MockAPI.updateAdminPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

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

  // 2FA handlers
  const handle2FASetup = async () => {
    setIs2FASettingUp(true);
    try {
      const response = await MockAPI.setup2FA();
      if (response.success && response.data) {
        setQrCodeUrl(response.data.qr_code);
        setSecretKey(response.data.secret_key);
        setBackupCodes(response.data.backup_codes);
        setShow2FASetup(true);
        toast.success('2FA setup initiated. Scan the QR code with Google Authenticator.');
      } else {
        toast.error(response.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('An error occurred during 2FA setup');
    } finally {
      setIs2FASettingUp(false);
    }
  };

  const handle2FAEnable = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIs2FAEnabling(true);
    try {
      const response = await MockAPI.enable2FA(twoFactorCode);
      if (response.success && response.data) {
        setBackupCodes(response.data.backup_codes);
        setShow2FASetup(false);
        setTwoFactorCode('');
        setQrCodeUrl('');
        setSecretKey('');
        toast.success('2FA enabled successfully!');
        // Show backup codes modal
        setShowBackupCodes(true);
        // Refresh admin profile to update 2FA status
        queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      } else {
        toast.error(response.error || 'Invalid 2FA code. Please try again.');
      }
    } catch (error) {
      console.error('2FA enable error:', error);
      toast.error('An error occurred during 2FA enable');
    } finally {
      setIs2FAEnabling(false);
    }
  };

  const handle2FADisable = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }

    setIs2FADisabling(true);
    try {
      const response = await MockAPI.disable2FA(disablePassword);
      if (response.success) {
        setShow2FADisable(false);
        setDisablePassword('');
        toast.success('2FA disabled successfully');
        queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      } else {
        toast.error(response.error || 'Failed to disable 2FA. Please check your password.');
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('An error occurred during 2FA disable');
    } finally {
      setIs2FADisabling(false);
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

        {/* Two-Factor Authentication */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheckIcon className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Two-Factor Authentication</h3>
          </div>
          
          {admin?.twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 glass rounded-lg border border-success/20 bg-success/5">
                <CheckIcon className="w-6 h-6 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-success">2FA is enabled</p>
                  <p className="text-sm text-muted">Your account is protected with two-factor authentication</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {backupCodes.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowBackupCodes(true)}
                    className="flex items-center gap-2"
                  >
                    <KeyIcon className="w-4 h-4" />
                    View Backup Codes
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShow2FADisable(true)}
                  className="text-error border-error hover:bg-error/10 flex-1"
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 glass rounded-lg border border-warning/20 bg-warning/5">
                <XMarkIcon className="w-6 h-6 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-warning">2FA is not enabled</p>
                  <p className="text-sm text-muted">Add an extra layer of security to your account</p>
                </div>
              </div>
              
              <Button
                variant="primary"
                onClick={handle2FASetup}
                isLoading={is2FASettingUp}
                className="flex items-center gap-2"
              >
                <ShieldCheckIcon className="w-5 h-5" />
                Set Up 2FA
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FASetup}
        onClose={() => {
          setShow2FASetup(false);
          setQrCodeUrl('');
          setSecretKey('');
          setTwoFactorCode('');
        }}
        title="Set Up Two-Factor Authentication"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted mb-4">
              <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            {qrCodeUrl && (
              <div className="flex justify-center p-4 glass rounded-lg bg-white">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-muted mb-2">
              <strong>Step 2:</strong> Or enter this code manually:
            </p>
            <div className="p-4 glass rounded-lg bg-muted/10">
              <p className="font-mono text-lg font-bold text-center select-all">{secretKey}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted mb-2">
              <strong>Step 3:</strong> Enter the 6-digit code from your authenticator app to verify:
            </p>
            <Input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShow2FASetup(false);
                setQrCodeUrl('');
                setSecretKey('');
                setTwoFactorCode('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handle2FAEnable}
              isLoading={is2FAEnabling}
              disabled={twoFactorCode.length !== 6}
              className="flex-1"
            >
              Verify & Enable
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        title="Backup Codes"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 glass rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-muted mb-2">
              <strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
            <p className="text-xs text-muted">
              Each code can only be used once.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 p-4 glass rounded-lg bg-muted/10">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="p-2 font-mono text-sm text-center border border-border rounded select-all"
              >
                {code}
              </div>
            ))}
          </div>
          
          <Button
            variant="primary"
            onClick={() => setShowBackupCodes(false)}
            className="w-full"
          >
            I've Saved These Codes
          </Button>
        </div>
      </Modal>

      {/* 2FA Disable Modal */}
      <Modal
        isOpen={show2FADisable}
        onClose={() => {
          setShow2FADisable(false);
          setDisablePassword('');
        }}
        title="Disable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 glass rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-muted">
              <strong>Warning:</strong> Disabling 2FA will make your account less secure. You'll need to enter your password to confirm.
            </p>
          </div>
          
          <Input
            label="Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShow2FADisable(false);
                setDisablePassword('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handle2FADisable}
              isLoading={is2FADisabling}
              disabled={!disablePassword}
              className="flex-1 bg-error hover:bg-error/90"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
