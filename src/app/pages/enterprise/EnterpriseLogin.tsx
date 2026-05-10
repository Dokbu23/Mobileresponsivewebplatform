import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { Store, Mail, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON, setAuthToken } from '../../lib/api';
import { showErrorAlert, showLoginSuccess } from '../../lib/sweetAlert';

export function EnterpriseLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUserType, setCurrentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if redirected from email verification
  useEffect(() => {
    if (location.state?.verificationSuccess) {
      toast.success('Email verified successfully! You can now login.', { duration: 5000 });
      
      // Pre-fill email if provided
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await postJSON('/login', {
        email,
        password,
        role: 'enterprise',
      }, false); // Don't require auth for login
      
      // Store the JWT token
      setAuthToken(response.token);
      
      setUserType('enterprise');
      setCurrentUser(response.user);
      
      // Check subscription status
      if (response.user.subscription_status === 'unpaid') {
        await showLoginSuccess(response.user.name, 'Enterprise');
        toast.info('Please complete your subscription payment to access all features');
        navigate('/enterprise/dashboard');
      } else if (response.user.subscription_status === 'pending') {
        await showLoginSuccess(response.user.name, 'Enterprise');
        toast.info('Your payment is being reviewed by admin');
        navigate('/enterprise/dashboard');
      } else {
        await showLoginSuccess(response.user.name, 'Enterprise');
        navigate('/enterprise/dashboard');
      }
    } catch (error: any) {
      // Check if error is due to unverified email
      if (error.requires_verification) {
        toast.info('Please verify your email first');
        navigate('/enterprise/verify-email', {
          state: {
            email: email,
            role: 'enterprise',
          },
        });
      } else {
        await showErrorAlert('Login failed', 'Invalid credentials.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-primary/20 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="h-8 w-8 text-pink-600" />
          </div>
          <h2 className="mb-2">Enterprise Login</h2>
          <p className="text-muted-foreground">
            Access your product management dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="enterprise@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            Sign In
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-muted-foreground">or</span>
            </div>
          </div>

          <Link
            to="/enterprise/register"
            className="w-full block text-center py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            Register New Enterprise
          </Link>
        </form>
      </div>
    </div>
  );
}
