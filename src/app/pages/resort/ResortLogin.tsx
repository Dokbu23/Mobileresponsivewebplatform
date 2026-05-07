import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Hotel, Mail, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON } from '../../lib/api';
import { showErrorAlert, showLoginSuccess } from '../../lib/sweetAlert';

export function ResortLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUserType, setCurrentUser } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await postJSON('/login', {
        email,
        password,
        role: 'resort',
      }, false);
      setUserType('resort');
      setCurrentUser(response.user);
      await showLoginSuccess(response.user.name, 'Resort');
      navigate('/resort/dashboard');
    } catch {
      await showErrorAlert('Login failed', 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-primary/20 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hotel className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mb-2">Resort Owner Login</h2>
          <p className="text-muted-foreground">
            Access your resort management dashboard
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
                placeholder="resort@example.com"
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
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Sign In
          </button>

          <div className="text-center text-sm text-muted-foreground">
            Demo credentials: resort@discovermansalay.test / password123
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
            to="/resort/register"
            className="w-full block text-center py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            Register New Resort
          </Link>
        </form>
      </div>
    </div>
  );
}
