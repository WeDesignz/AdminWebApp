'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { MockAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { useEffect } from 'react';
import { Permission } from '@/lib/permissions/config';

export default function LoginPage() {
  const router = useRouter();
  const { setAdmin, setTokens, setRequires2FA, requires2FA, tempEmail, isAuthenticated, setPermissions } = useAuthStore();
  const { theme } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await MockAPI.login(email, password);
      if (response.success && response.data) {
        if (response.data.requires2FA) {
          // 2FA is enabled - show 2FA input
          setRequires2FA(true, email);
          setTempToken(response.data.tempToken || '');
          // Store user ID from login response - required for 2FA verification
          if (response.data.user?.id) {
            setUserId(response.data.user.id);
          } else {
            console.error('User ID not found in login response:', response.data);
            toast.error('Login response missing user ID');
            return;
          }
          toast.success('Please enter your 2FA code');
        } else {
          // 2FA is NOT enabled - direct login
          if (response.data.admin && response.data.tokens) {
            setAdmin(response.data.admin, response.data.permissions as Permission[] | undefined);
            setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
            toast.success('Login successful!');
            router.push('/dashboard');
          } else {
            toast.error('Login response missing required data');
          }
        }
      } else {
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate userId is set
    if (!userId) {
      toast.error('User ID is missing. Please try logging in again.');
      setIsLoading(false);
      setRequires2FA(false);
      return;
    }

    try {
      const response = await MockAPI.verify2FA(tempToken, twoFactorCode, userId);
      if (response.success && response.data) {
        setAdmin(response.data.admin, response.data.permissions as Permission[]);
        setTokens(response.data.accessToken, response.data.refreshToken);
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(response.error || '2FA verification failed');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA setup handler (currently not used but kept for future implementation)
  // const handle2FASetup = async () => {
  //   const secret = 'JBSWY3DPEHPK3PXP';
  //   const otpauth = `otpauth://totp/WeDesignz:${email}?secret=${secret}&issuer=WeDesignz`;
  //   const qrUrl = await QRCode.toDataURL(otpauth);
  //   setQrCodeUrl(qrUrl);
  //   setShow2FASetup(true);
  // };

  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
        <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Two-Factor Authentication</h1>
            <p className="text-muted">Enter the 6-digit code from your authenticator app</p>
            <p className="text-sm text-primary mt-2">{tempEmail}</p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-6">
            <Input
              label="2FA Code"
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Verify
            </Button>

            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorCode('');
              }}
              className="w-full text-center text-sm text-muted hover:text-primary transition-colors"
            >
              Back to login
            </button>
          </form>

        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
        <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src="/Logos/ONLY LOGO.png" 
                alt="WeDesignz Logo" 
                className={`h-12 w-12 ${mounted && theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`}
              />
              <img 
                src="/Logos/ONLY TEXT.png" 
                alt="WeDesignz" 
                className={`h-8 w-auto ${mounted && theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`}
              />
            </div>
            <p className="text-xl font-semibold mb-1">Admin Panel</p>
            <p className="text-muted">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wedesignz.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

        </div>
      </div>

      <Modal
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        title="Set Up Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-muted">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          )}
          <div className="p-3 glass rounded-lg">
            <p className="text-sm text-muted mb-1">Or enter this code manually:</p>
            <p className="font-mono text-lg font-bold">JBSWY3DPEHPK3PXP</p>
          </div>
          <Button variant="primary" className="w-full" onClick={() => setShow2FASetup(false)}>
            I&apos;ve Set It Up
          </Button>
        </div>
      </Modal>
    </>
  );
}
