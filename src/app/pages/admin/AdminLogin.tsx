import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Lock, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON, setAuthToken } from '../../lib/api';
import { showErrorAlert, showLoginSuccess } from '../../lib/sweetAlert';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setIsAdmin, setUserType, setCurrentUser } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('Logging in as admin...');
      const response = await postJSON('/login', {
        email,
        password,
        role: 'admin',
      }, false);
      
      console.log('Login response:', response);
      console.log('Token:', response.token);
      
      setAuthToken(response.token);
      setIsAdmin(true);
      setUserType('admin');
      setCurrentUser(response.user);
      
      // Verify token was saved
      console.log('Token saved:', localStorage.getItem('discover-mansalay:token'));
      
      await showLoginSuccess(response.user.name, 'Admin');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      await showErrorAlert('Login failed', 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-primary/20 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2">Admin Login</h2>
          <p className="text-muted-foreground">
            Access the tourism office dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Email Address</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="admin@mansalay.com"
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
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
        </form>
      </div>
    </div>
  );
}
