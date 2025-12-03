'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealAPI as API } from '@/lib/api';
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
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  ClockIcon,
  InformationCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  GlobeAltIcon,
  Squares2X2Icon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { setAdmin } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Pinterest state
  const [pinterestStatus, setPinterestStatus] = useState<any>(null);
  const [isLoadingPinterest, setIsLoadingPinterest] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [boards, setBoards] = useState<any[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showEditBoardModal, setShowEditBoardModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string>('');
  const [newBoardData, setNewBoardData] = useState({
    name: '',
    description: '',
    privacy: 'PUBLIC' as 'PUBLIC' | 'SECRET',
  });
  const [editBoardData, setEditBoardData] = useState({
    name: '',
    description: '',
    privacy: 'PUBLIC' as 'PUBLIC' | 'SECRET',
  });
  const [showBoardActions, setShowBoardActions] = useState<string | null>(null);

  const { data: adminData } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => API.getAdminProfile(),
  });

  const { data: pinterestStatusData, refetch: refetchPinterest } = useQuery({
    queryKey: ['pinterest-status'],
    queryFn: () => API.getPinterestStatus(),
    enabled: true,
  });

  useEffect(() => {
    if (pinterestStatusData?.data) {
      setPinterestStatus(pinterestStatusData.data);
    }
  }, [pinterestStatusData]);

  // Auto-load boards when token becomes valid
  useEffect(() => {
    if (pinterestStatus?.is_token_valid && boards.length === 0 && !loadingBoards && !showBoardSelector) {
      fetchBoards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinterestStatus?.is_token_valid]);

  // Handle tab from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'pinterest') {
      setActiveTab('pinterest');
      // Scroll to Pinterest section after a brief delay
      setTimeout(() => {
        const element = document.getElementById('pinterest-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Pinterest board management functions
  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const response = await API.getPinterestBoards();
      if (response.success && response.data?.boards) {
        setBoards(response.data.boards);
        setShowBoardSelector(true);
      } else {
        toast.error(response.error || 'Failed to fetch boards');
      }
    } catch (error) {
      toast.error('Failed to fetch Pinterest boards');
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleSetBoard = async () => {
    if (!selectedBoardId) {
      toast.error('Please select a board');
      return;
    }

    setIsLoadingPinterest(true);
    try {
      const selectedBoard = boards.find(b => String(b.id) === String(selectedBoardId));
      const response = await API.setPinterestBoard(selectedBoardId, selectedBoard?.name);
      
      if (response.success) {
        toast.success(`Board "${response.data?.board_name}" set successfully!`);
        setShowBoardSelector(false);
        setSelectedBoardId('');
        await refetchPinterest();
      } else {
        toast.error(response.error || 'Failed to set board');
      }
    } catch (error) {
      toast.error('Failed to set Pinterest board');
    } finally {
      setIsLoadingPinterest(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardData.name.trim()) {
      toast.error('Board name is required');
      return;
    }

    setIsLoadingPinterest(true);
    try {
      const response = await API.createPinterestBoard(newBoardData);
      if (response.success) {
        toast.success(`Board "${response.data?.board.name}" created successfully!`);
        setShowCreateBoardModal(false);
        setNewBoardData({ name: '', description: '', privacy: 'PUBLIC' });
        await fetchBoards();
        await refetchPinterest();
      } else {
        toast.error(response.error || 'Failed to create board');
      }
    } catch (error) {
      toast.error('Failed to create Pinterest board');
    } finally {
      setIsLoadingPinterest(false);
    }
  };

  const handleEditBoard = (board: any) => {
    setEditingBoard(board);
    setEditBoardData({
      name: board.name || '',
      description: board.description || '',
      privacy: board.privacy || 'PUBLIC',
    });
    setShowEditBoardModal(true);
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard || !editBoardData.name.trim()) {
      toast.error('Board name is required');
      return;
    }

    setIsLoadingPinterest(true);
    try {
      const response = await API.updatePinterestBoard(editingBoard.id, editBoardData);
      if (response.success) {
        toast.success(`Board "${response.data?.board.name}" updated successfully!`);
        setShowEditBoardModal(false);
        setEditingBoard(null);
        await fetchBoards();
        await refetchPinterest();
      } else {
        toast.error(response.error || 'Failed to update board');
      }
    } catch (error) {
      toast.error('Failed to update Pinterest board');
    } finally {
      setIsLoadingPinterest(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!deletingBoardId) return;

    setIsLoadingPinterest(true);
    try {
      const response = await API.deletePinterestBoard(deletingBoardId);
      if (response.success) {
        toast.success('Board deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingBoardId('');
        await fetchBoards();
        await refetchPinterest();
      } else {
        toast.error(response.error || 'Failed to delete board');
      }
    } catch (error) {
      toast.error('Failed to delete Pinterest board');
    } finally {
      setIsLoadingPinterest(false);
    }
  };

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
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfileImage = () => {
    setProfileImagePreview(null);
    setSelectedFile(null);
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
      // First upload profile photo if a new file is selected
      let uploadedPhotoUrl: string | undefined = undefined;
      if (selectedFile) {
        const photoResponse = await API.uploadAdminProfilePhoto(selectedFile);
        if (!photoResponse.success) {
          toast.error(photoResponse.error || 'Failed to upload profile photo');
          setIsUpdatingProfile(false);
          return;
        }
        // Store the uploaded photo URL
        if (photoResponse.data?.profile_photo_url) {
          uploadedPhotoUrl = photoResponse.data.profile_photo_url;
          setProfileImagePreview(uploadedPhotoUrl);
        }
      }

      // Update profile data
      const response = await API.updateAdminProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        mobileNumber: profileData.mobileNumber,
      });

      if (response.success) {
        toast.success('Profile updated successfully');
        // Refetch admin profile to get latest data including photo URL and mobile number
        const profileResponse = await API.getAdminProfile();
        if (profileResponse.success && profileResponse.data) {
          // Update auth store with latest profile data including photo
          setAdmin(profileResponse.data);
          // Update form data with latest values including mobile number
          setProfileData({
            firstName: profileResponse.data.firstName || '',
            lastName: profileResponse.data.lastName || '',
            email: profileResponse.data.email || '',
            mobileNumber: profileResponse.data.mobileNumber || '',
          });
        } else if (response.data) {
          // Fallback: use response data and merge photo URL if we uploaded one
          const updatedAdmin = {
            ...response.data,
            avatar: uploadedPhotoUrl || response.data.avatar,
          };
          setAdmin(updatedAdmin);
          // Update form data with response data
          setProfileData({
            firstName: response.data.firstName || '',
            lastName: response.data.lastName || '',
            email: response.data.email || '',
            mobileNumber: response.data.mobileNumber || '',
          });
        }
        // Clear selected file after successful upload
        setSelectedFile(null);
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
      const response = await API.updateAdminPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
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
      const response = await API.setup2FA();
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
      const response = await API.enable2FA(twoFactorCode);
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
      const response = await API.disable2FA(disablePassword);
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
              <div className="flex items-start gap-3 p-4 glass rounded-lg border border-success/20 bg-success/5">
                <CheckIcon className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-success mb-1">2FA is enabled</p>
                  <p className="text-sm text-muted leading-relaxed">Your account is protected with two-factor authentication. You&apos;ll need to enter a code from your authenticator app when logging in.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {backupCodes.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowBackupCodes(true)}
                    className="flex items-center gap-2 text-sm"
                    size="sm"
                  >
                    <KeyIcon className="w-4 h-4" />
                    View Backup Codes
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShow2FADisable(true)}
                  className="text-error border-error hover:bg-error/10 flex items-center gap-2 text-sm"
                  size="sm"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 glass rounded-lg border border-warning/20 bg-warning/5">
                <XMarkIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-warning mb-1">2FA is not enabled</p>
                  <p className="text-sm text-muted leading-relaxed">Add an extra layer of security to your account by enabling two-factor authentication. You&apos;ll use an authenticator app to generate verification codes.</p>
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
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <p className="text-sm text-muted">
              Download an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong> if you don&apos;t have one already.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">1</span>
              <p className="text-sm font-medium">Scan the QR code with your authenticator app</p>
            </div>
            {qrCodeUrl && (
              <div className="flex justify-center p-4 glass rounded-lg bg-white border border-border">
                <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56" />
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">2</span>
              <p className="text-sm font-medium">Or enter this code manually</p>
            </div>
            <div className="p-3 glass rounded-lg bg-muted/10 border border-border">
              <p className="font-mono text-base font-semibold text-center select-all break-all">{secretKey}</p>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">3</span>
              <p className="text-sm font-medium">Enter the 6-digit code to verify</p>
            </div>
            <Input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
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
            I&apos;ve Saved These Codes
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
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 glass rounded-lg bg-error/10 border border-error/20">
            <XMarkIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error mb-1">Security Warning</p>
              <p className="text-sm text-muted leading-relaxed">
                Disabling 2FA will remove the extra security layer from your account. You&apos;ll need to enter your password to confirm this action.
              </p>
            </div>
          </div>
          
          <Input
            label="Confirm Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Enter your password to confirm"
            required
          />
          
          <div className="flex gap-3 pt-2">
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
              variant="danger"
              onClick={handle2FADisable}
              isLoading={is2FADisabling}
              disabled={!disablePassword}
              className="flex-1"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pinterest Integration */}
      <div id="pinterest-section" className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">Pinterest Integration</h3>
            <p className="text-sm text-muted mt-1">
              Automatically post approved designs to your Pinterest board
            </p>
          </div>
        </div>
        
        {pinterestStatus ? (
          <div className="space-y-6">
            {/* Connection Status Card */}
            <div className={`p-5 rounded-xl border-2 ${
              pinterestStatus.is_configured && pinterestStatus.is_token_valid
                ? 'bg-success/5 border-success/30'
                : 'bg-warning/5 border-warning/30'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {pinterestStatus.is_configured && pinterestStatus.is_token_valid ? (
                    <div className="p-2 bg-success/20 rounded-lg">
                      <CheckCircleIcon className="w-6 h-6 text-success" />
                    </div>
                  ) : (
                    <div className="p-2 bg-warning/20 rounded-lg">
                      <ExclamationTriangleIcon className="w-6 h-6 text-warning" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-lg">
                      {pinterestStatus.is_configured && pinterestStatus.is_token_valid
                        ? 'Pinterest Connected'
                        : 'Pinterest Not Connected'}
                    </h4>
                    <p className="text-sm text-muted">
                      {pinterestStatus.is_configured && pinterestStatus.is_token_valid
                        ? 'Your account is connected and ready to post designs'
                        : 'Connect your Pinterest account to start posting designs'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(!pinterestStatus.is_configured || !pinterestStatus.is_token_valid) ? (
                    <Button
                      onClick={async () => {
                        setIsLoadingPinterest(true);
                        try {
                          await API.authorizePinterest();
                        } catch (error) {
                          toast.error('Failed to initiate Pinterest authorization');
                          setIsLoadingPinterest(false);
                        }
                      }}
                      disabled={isLoadingPinterest}
                      className="flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      {isLoadingPinterest ? 'Connecting...' : 'Connect Pinterest'}
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        setIsLoadingPinterest(true);
                        try {
                          await API.authorizePinterest();
                        } catch (error) {
                          toast.error('Failed to re-authorize Pinterest');
                          setIsLoadingPinterest(false);
                        }
                      }}
                      variant="outline"
                      disabled={isLoadingPinterest}
                      className="flex items-center gap-2"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Re-authorize
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Details Grid */}
              {pinterestStatus.is_configured && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1">
                    <div className="text-xs text-muted font-medium">Status</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pinterestStatus.is_enabled 
                          ? 'bg-success/20 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {pinterestStatus.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted font-medium">Token Status</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pinterestStatus.is_token_valid 
                          ? 'bg-success/20 text-success' 
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {pinterestStatus.is_token_valid ? 'Valid' : 'Expired'}
                      </span>
                    </div>
                  </div>
                  {pinterestStatus.last_successful_post && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted font-medium">Last Post</div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <ClockIcon className="w-3.5 h-3.5 text-muted" />
                        <span className="text-xs">
                          {new Date(pinterestStatus.last_successful_post).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {pinterestStatus.board_name && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted font-medium">Board</div>
                      <div className="text-sm font-medium truncate" title={pinterestStatus.board_name}>
                        {pinterestStatus.board_name}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {pinterestStatus.last_error && (
                <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircleIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-error mb-1">Last Error</div>
                      <div className="text-xs text-error/80">{pinterestStatus.last_error}</div>
                      {pinterestStatus.last_error_at && (
                        <div className="text-xs text-error/60 mt-1">
                          {new Date(pinterestStatus.last_error_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Board Management Section */}
            {pinterestStatus.is_token_valid && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2 mb-1">
                      <Squares2X2Icon className="w-5 h-5 text-primary" />
                      Pinterest Boards
                    </h4>
                    <p className="text-sm text-muted">
                      Manage your Pinterest boards and select where designs will be posted
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateBoardModal(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Board
                  </Button>
                </div>

                {/* Active Board Display */}
                {pinterestStatus.has_board && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <CheckCircleIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Active Board</p>
                          <p className="text-xs text-muted font-medium">{pinterestStatus.board_name}</p>
                        </div>
                      </div>
                      <Button
                        onClick={fetchBoards}
                        disabled={loadingBoards}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-primary/30 hover:bg-primary/10"
                      >
                        <ArrowPathIcon className={`w-4 h-4 ${loadingBoards ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}

                {/* Boards List */}
                {loadingBoards ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-4 rounded-lg border border-border bg-card animate-pulse">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="h-4 bg-muted/20 rounded w-2/3 mb-2"></div>
                            <div className="h-3 bg-muted/20 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 w-20 bg-muted/20 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : boards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {boards.map((board) => {
                        const isSelected = String(pinterestStatus?.board_id) === String(board.id);
                        return (
                          <div
                            key={board.id}
                            className={`group p-4 rounded-lg border transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary/5 border-primary/30 shadow-sm'
                                : 'bg-card border-border hover:border-primary/20 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-3 mb-2">
                                  <div className={`p-1.5 rounded-md flex-shrink-0 ${
                                    isSelected ? 'bg-primary/20' : 'bg-muted/10'
                                  }`}>
                                    <Squares2X2Icon className={`w-4 h-4 ${
                                      isSelected ? 'text-primary' : 'text-muted'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-semibold text-sm truncate">{board.name}</h5>
                                      {isSelected && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white flex-shrink-0">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted">
                                      {board.privacy === 'SECRET' ? (
                                        <span className="inline-flex items-center gap-1">
                                          <LockClosedIcon className="w-3 h-3" />
                                          Secret
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1">
                                          <GlobeAltIcon className="w-3 h-3" />
                                          Public
                                        </span>
                                      )}
                                      {board.pin_count !== undefined && (
                                        <span>{board.pin_count.toLocaleString()} pins</span>
                                      )}
                                    </div>
                                    {board.description && (
                                      <p className="text-xs text-muted mt-1.5 line-clamp-1">{board.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {!isSelected ? (
                                  <>
                                    <Button
                                      onClick={async () => {
                                        setSelectedBoardId(board.id);
                                        await handleSetBoard();
                                      }}
                                      size="sm"
                                      disabled={isLoadingPinterest}
                                      className="flex items-center gap-1.5 text-xs"
                                    >
                                      {isLoadingPinterest && selectedBoardId === board.id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          Setting...
                                        </>
                                      ) : (
                                        <>
                                          <CheckIcon className="w-3.5 h-3.5" />
                                          Select
                                        </>
                                      )}
                                    </Button>
                                    <div className="relative">
                                      <Button
                                        onClick={() => setShowBoardActions(showBoardActions === board.id ? null : board.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1.5"
                                        title="More options"
                                      >
                                        <EllipsisVerticalIcon className="w-4 h-4" />
                                      </Button>
                                      {showBoardActions === board.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowBoardActions(null)}
                                          />
                                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                                            <button
                                              onClick={() => {
                                                handleEditBoard(board);
                                                setShowBoardActions(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/10 flex items-center gap-2"
                                            >
                                              <PencilIcon className="w-4 h-4" />
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => {
                                                setDeletingBoardId(board.id);
                                                setShowDeleteConfirm(true);
                                                setShowBoardActions(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2"
                                            >
                                              <TrashIcon className="w-4 h-4" />
                                              Delete
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-medium text-primary">Active</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-muted/10">
                        <Squares2X2Icon className="w-8 h-8 text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">No boards loaded yet</p>
                        <p className="text-xs text-muted mb-4">
                          Create your first board or refresh to load existing boards
                        </p>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            onClick={fetchBoards}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                            Refresh
                          </Button>
                          <Button
                            onClick={() => setShowCreateBoardModal(true)}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Create Board
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Setup Steps (when not configured) */}
            {(!pinterestStatus.is_configured || !pinterestStatus.is_token_valid) && (
              <div className="p-5 rounded-xl border border-border bg-card">
                <h4 className="font-semibold text-base mb-4">Setup Steps</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      pinterestStatus.is_configured && pinterestStatus.is_token_valid
                        ? 'bg-success text-white'
                        : 'bg-primary text-white'
                    }`}>
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Connect Pinterest Account</p>
                      <p className="text-xs text-muted mt-0.5">
                        Click &quot;Connect Pinterest&quot; to authorize access to your account
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      pinterestStatus.has_board
                        ? 'bg-success text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Select a Board</p>
                      <p className="text-xs text-muted mt-0.5">
                        Choose the Pinterest board where designs will be posted
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Start Posting</p>
                      <p className="text-xs text-muted mt-0.5">
                        Approve designs in the Designs page to automatically post them
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">Loading Pinterest status...</p>
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <Modal
        isOpen={showCreateBoardModal}
        onClose={() => {
          setShowCreateBoardModal(false);
          setNewBoardData({ name: '', description: '', privacy: 'PUBLIC' });
        }}
        title="Create New Pinterest Board"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Board Name <span className="text-error">*</span>
            </label>
            <Input
              value={newBoardData.name}
              onChange={(e) => setNewBoardData({ ...newBoardData, name: e.target.value })}
              placeholder="Enter board name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={newBoardData.description}
              onChange={(e) => setNewBoardData({ ...newBoardData, description: e.target.value })}
              placeholder="Enter board description (optional)"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Privacy</label>
            <select
              value={newBoardData.privacy}
              onChange={(e) => setNewBoardData({ ...newBoardData, privacy: e.target.value as 'PUBLIC' | 'SECRET' })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PUBLIC">Public</option>
              <option value="SECRET">Secret</option>
            </select>
            <p className="text-xs text-muted mt-1">
              Public boards are visible to everyone. Secret boards are only visible to you.
            </p>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateBoardModal(false);
                setNewBoardData({ name: '', description: '', privacy: 'PUBLIC' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBoard}
              isLoading={isLoadingPinterest}
              disabled={!newBoardData.name.trim()}
              className="flex-1"
            >
              Create Board
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Board Modal */}
      <Modal
        isOpen={showEditBoardModal}
        onClose={() => {
          setShowEditBoardModal(false);
          setEditingBoard(null);
          setEditBoardData({ name: '', description: '', privacy: 'PUBLIC' });
        }}
        title="Edit Pinterest Board"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Board Name <span className="text-error">*</span>
            </label>
            <Input
              value={editBoardData.name}
              onChange={(e) => setEditBoardData({ ...editBoardData, name: e.target.value })}
              placeholder="Enter board name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={editBoardData.description}
              onChange={(e) => setEditBoardData({ ...editBoardData, description: e.target.value })}
              placeholder="Enter board description (optional)"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Privacy</label>
            <select
              value={editBoardData.privacy}
              onChange={(e) => setEditBoardData({ ...editBoardData, privacy: e.target.value as 'PUBLIC' | 'SECRET' })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PUBLIC">Public</option>
              <option value="SECRET">Secret</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditBoardModal(false);
                setEditingBoard(null);
                setEditBoardData({ name: '', description: '', privacy: 'PUBLIC' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateBoard}
              isLoading={isLoadingPinterest}
              disabled={!editBoardData.name.trim()}
              className="flex-1"
            >
              Update Board
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingBoardId('');
        }}
        title="Delete Pinterest Board"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error mb-1">Warning</p>
                <p className="text-sm text-muted">
                  Deleting a board will permanently remove it and all its pins from Pinterest. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingBoardId('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBoard}
              isLoading={isLoadingPinterest}
              className="flex-1"
            >
              Delete Board
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
