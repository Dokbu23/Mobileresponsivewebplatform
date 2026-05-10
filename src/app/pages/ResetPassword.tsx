import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { resetPassword } from '../lib/api';
import { toast } from 'sonner';

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from navigation state
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Email is required');
      return;
    }

    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email, code, password, confirmPassword);
      toast.success('Password reset successfully! You can now login with your new password.');
      
      // Navigate to select role page
      navigate('/select-role');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code sent to your email and create a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors"
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors"
              placeholder="Enter new password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors"
              placeholder="Confirm new password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-primary hover:underline text-sm font-medium"
            >
              ← Resend Code
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
