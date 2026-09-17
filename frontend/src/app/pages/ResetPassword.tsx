import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { verifyPasswordResetCode, resetPassword, sendPasswordResetCode } from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle2, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from navigation state if available
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    const lastSent = sessionStorage.getItem('mansalay_otp_reset_timestamp');
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - Number(lastSent)) / 1000);
      const remaining = Math.max(0, 59 - elapsed);
      setResendCooldown(remaining);
    } else {
      sessionStorage.setItem('mansalay_otp_reset_timestamp', String(Date.now()));
      setResendCooldown(59);
    }
  }, [location]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Step 1: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    const cleanCode = code.trim();

    if (!cleanEmail) {
      toast.error('Email address is required');
      return;
    }

    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyPasswordResetCode(cleanEmail, cleanCode);
      if (res?.valid) {
        setIsCodeVerified(true);
        toast.success('Code verified! Please set your new password.');
      } else {
        toast.error(res?.message || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      toast.error(error.message || 'Invalid or expired verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Resend Code
  const handleResendCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }
    if (resendCooldown > 0) return;

    try {
      await sendPasswordResetCode(cleanEmail);
      toast.success('A new 6-digit code has been sent to your email.');
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    }
  };

  // Handle Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(email.trim(), code.trim(), password, confirmPassword);
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-white to-pink-500/5 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-pink-100 p-8 sm:p-10 w-full max-w-md transition-all">
        
        {/* Step Indicator Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-100 text-pink-500 mb-4 shadow-sm">
            {isCodeVerified ? (
              <Lock className="h-7 w-7 text-pink-600" />
            ) : (
              <KeyRound className="h-7 w-7 text-pink-600" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-600 tracking-tight mb-2">
            {isCodeVerified ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            {isCodeVerified
              ? 'Enter and confirm your new password below.'
              : 'Enter the 6-digit verification code sent to your email.'}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className={`h-2 rounded-full transition-all ${!isCodeVerified ? 'w-8 bg-pink-500' : 'w-2.5 bg-emerald-500'}`} />
            <span className={`h-2 rounded-full transition-all ${isCodeVerified ? 'w-8 bg-pink-500' : 'w-2.5 bg-gray-200'}`} />
          </div>
        </div>

        {/* ── STEP 1: VERIFICATION CODE FORM ── */}
        {!isCodeVerified && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 border-2 border-pink-100 rounded-xl focus:border-pink-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                placeholder="you@example.com"
                required
                disabled={isVerifying}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="code" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  6-Digit Verification Code
                </label>
                {resendCooldown > 0 ? (
                  <span className="text-[11px] text-gray-400 font-medium">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-[11px] text-pink-500 hover:text-pink-600 font-bold hover:underline inline-flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Resend Code
                  </button>
                )}
              </div>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3.5 bg-gray-50/50 border-2 border-pink-100 rounded-xl focus:border-pink-500 focus:bg-white outline-none transition-all text-center text-2xl tracking-[0.35em] font-mono font-bold text-gray-900"
                placeholder="••••••"
                maxLength={6}
                required
                autoFocus
                disabled={isVerifying}
              />
              <p className="text-[11px] text-gray-400 mt-1 text-center">
                Please check your inbox or spam folder.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-[0.99] text-white rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-sm flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify Code</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/forgot-password"
                className="text-xs text-gray-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Forgot Password
              </Link>
            </div>
          </form>
        )}

        {/* ── STEP 2: SET NEW PASSWORD FORM (ONLY SHOWN AFTER OTP IS VERIFIED) ── */}
        {isCodeVerified && (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            
            {/* Verified email banner */}
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">Code verified for:</span>
                <p className="truncate text-emerald-900 font-bold">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeVerified(false)}
                className="text-[11px] text-emerald-700 hover:underline font-bold"
                title="Change code or email"
              >
                Change
              </button>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 bg-gray-50/50 border-2 border-pink-100 rounded-xl focus:border-pink-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  autoFocus
                  disabled={isResetting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 bg-gray-50/50 border-2 border-pink-100 rounded-xl focus:border-pink-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="Re-enter your new password"
                  minLength={8}
                  required
                  disabled={isResetting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isResetting || !password || !confirmPassword}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-[0.99] text-white rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-sm flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Setting New Password...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Set New Password</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsCodeVerified(false)}
                className="text-xs text-gray-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Verification Code
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
