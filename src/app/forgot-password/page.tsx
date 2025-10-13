'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Style from './page.module.css';
import { toast } from 'react-toastify';

interface ForgotPasswordRequest {
  email: string;
  username: string;
}

interface ResetPasswordRequest {
  email: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  // Form data for verification step
  const [verifyData, setVerifyData] = useState<ForgotPasswordRequest>({
    email: '',
    username: ''
  });

  // Form data for reset step
  const [resetData, setResetData] = useState<ResetPasswordRequest>({
    email: '',
    username: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Handle input changes for verification step
  const handleVerifyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerifyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle input changes for reset step
  const handleResetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Toggle password visibility
  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // Handle verification form submission
  const handleVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyData),
      });

      if (response.ok) {
        // User verified successfully, move to reset step
        setResetData(prev => ({
          ...prev,
          email: verifyData.email,
          username: verifyData.username
        }));
        setStep('reset');
        setError('');
      } else {
        setError('The provided credentials do not match our records. Please check your email and username.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset form submission
  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (resetData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/forgot-password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetData.email,
          username: resetData.username,
          newPassword: resetData.newPassword
        }),
      });

      if (response.ok) {
        setSuccess('Password reset successfully. You can now log in with your new password.');
        setTimeout(() => {
          router.replace('/');
        }, 3000);
        toast.success('Password reset successfully. Redirecting to login...');
      } else {
        setError('Failed to reset password. Please try again.');
        toast.error('Failed to reset password. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to login
  const handleBackToLogin = () => {
    router.replace('/');
  };

  // Handle back to verification
  const handleBackToVerify = () => {
    setStep('verify');
    setError('');
    setResetData({
      email: '',
      username: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className={Style.forgotPasswordPage}>
      <div className={Style.forgotPasswordContainer}>
        <div className={Style.header}>
          <button 
            onClick={step === 'verify' ? handleBackToLogin : handleBackToVerify}
            className={Style.backButton}
            type="button"
          >
            <ArrowLeft className={Style.backIcon} />
            Back
          </button>
          <h1>{step === 'verify' ? 'Reset Password' : 'Create New Password'}</h1>
        </div>

        {step === 'verify' ? (
          <form onSubmit={handleVerifySubmit} className={Style.forgotPasswordForm}>
            <p className={Style.description}>
              Enter your email and username to verify your identity.
            </p>

            <div>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={verifyData.email}
                onChange={handleVerifyInputChange}
                required
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={verifyData.username}
                onChange={handleVerifyInputChange}
                required
                placeholder="Enter your username"
              />
            </div>

            {error && <div className={Style.error}>{error}</div>}

            <button 
              type="submit" 
              disabled={loading || !verifyData.email || !verifyData.username}
              className={Style.submitButton}
            >
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className={Style.forgotPasswordForm}>
            <p className={Style.description}>
              Enter your new password and confirm it to complete the reset.
            </p>

            <div className={Style.passwordContainer}>
              <label htmlFor="newPassword">New Password</label>
              <div className={Style.passwordInputWrapper}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={resetData.newPassword}
                  onChange={handleResetInputChange}
                  required
                  placeholder="Enter new password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={toggleNewPasswordVisibility}
                  className={Style.passwordToggle}
                >
                  {showNewPassword ? (
                    <EyeOff className={Style.eyeIcon} />
                  ) : (
                    <Eye className={Style.eyeIcon} />
                  )}
                </button>
              </div>
            </div>

            <div className={Style.passwordContainer}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={Style.passwordInputWrapper}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={resetData.confirmPassword}
                  onChange={handleResetInputChange}
                  required
                  placeholder="Confirm new password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className={Style.passwordToggle}
                >
                  {showConfirmPassword ? (
                    <EyeOff className={Style.eyeIcon} />
                  ) : (
                    <Eye className={Style.eyeIcon} />
                  )}
                </button>
              </div>
            </div>

            {error && <div className={Style.error}>{error}</div>}
            {success && <div className={Style.success}>{success}</div>}

            <button 
              type="submit" 
              disabled={loading || !resetData.newPassword || !resetData.confirmPassword}
              className={Style.submitButton}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}