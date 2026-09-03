import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { sendPasswordResetCode } from '../lib/api';
import { toast } from 'sonner';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  // Check existing cooldown from sessionStorage
  useEffect(() => {
    const lastSent = sessionStorage.getItem('mansalay_otp_reset_timestamp');
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - Number(lastSent)) / 1000);
      const remaining = Math.max(0, 59 - elapsed);
      setCooldown(remaining);
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (cooldown > 0) {
      toast.info(`Please wait ${cooldown} seconds before requesting a new code.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordResetCode(cleanEmail);
      sessionStorage.setItem('mansalay_otp_reset_timestamp', String(Date.now()));
      toast.success('Password reset code sent to your email!');
      
      // Navigate to reset password page with email
      navigate('/reset-password', { state: { email: cleanEmail } });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-white to-pink-500/5 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-pink-100 p-8 sm:p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-100 text-pink-500 mb-4 shadow-sm">
            <KeyRound className="h-7 w-7 text-pink-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-600 tracking-tight mb-2">
            Forgot Password?
          </h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border-2 border-pink-100 rounded-xl focus:border-pink-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                placeholder="Enter your registered email"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || cooldown > 0}
            className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-[0.99] text-white rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Wait {cooldown}s to resend</span>
            ) : (
              <span>Send Reset Code</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-gray-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
