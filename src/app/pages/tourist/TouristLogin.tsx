import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { MapPin, Mail, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON, setAuthToken } from '../../lib/api';
import { showErrorAlert, showLoginSuccess } from '../../lib/sweetAlert';

export function TouristLogin() {
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

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await postJSON('/login', {
        email,
        password,
        role: 'tourist',
      }, false);
      
      // Store the JWT token
      setAuthToken(response.token);
      
      setUserType('tourist');
      setCurrentUser(response.user);
      await showLoginSuccess(response.user.name, 'Tourist');
      navigate('/dashboard');
    } catch (error: any) {
      // Check if email verification is required
      if (error.requires_verification) {
        await showErrorAlert('Email not verified', 'Please verify your email before logging in.');
        navigate('/tourist/verify-email', {
          state: {
            email: error.email || email,
            role: 'tourist',
          },
        });
      } else {
        await showErrorAlert('Login failed', 'Invalid credentials.');
      }
    }
  };

  const handleGuestContinue = async () => {
    setUserType('tourist');
    await showLoginSuccess('Guest', 'Tourist');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-primary/20 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2">Tourist Login</h2>
          <p className="text-muted-foreground">
            Start exploring Mansalay
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In as Tourist
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
            to="/tourist/register"
            className="w-full py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-center block"
          >
            Sign Up
          </Link>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>New to DiscoverMansalay?</p>
          <p>Just enter your details to start exploring!</p>
        </div>
      </div>
    </div>
  );
}
