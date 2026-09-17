import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { MapPin, Shield, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, Key, X, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postJSON, setAuthToken } from '../lib/api';
import { toast } from 'sonner';
import { showErrorAlert, showLoginSuccess } from '../lib/sweetAlert';
import { ProfileSetupModal } from '../components/ProfileSetupModal';

export type AccountRole = 'tourist' | 'admin' | 'resort' | 'enterprise';

interface UnifiedLoginProps {
  defaultRole?: AccountRole;
}

const roleNameMap: Record<AccountRole, string> = {
  tourist: 'Tourist',
  admin: 'Admin',
  resort: 'Resort Owner',
  enterprise: 'Enterprise',
};

export function UnifiedLogin({ defaultRole }: UnifiedLoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser, setUserType, setIsAdmin } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (location.state?.verificationSuccess) {
      toast.success('Email verified successfully! You can now login.', { duration: 5000 });
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    } else if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await postJSON('/login', {
        email,
        password,
      }, false);

      const user = response.user || response;
      const role = user.role as AccountRole;
      const token = response.token || response.access_token;

      if (token) {
        setAuthToken(token);
      }

      // Check if user requires profile setup (no role set yet or role is pending)
      if (response.requires_setup || !role || (role as string) === 'pending') {
        localStorage.setItem('discover-mansalay:userType', 'pending');
        localStorage.setItem('discover-mansalay:user', JSON.stringify(user));
        setUserType('pending');
        setCurrentUser(user);
        setShowSetupModal(true);
        setLoading(false);
        return;
      }

      localStorage.setItem('discover-mansalay:userType', role);
      localStorage.setItem('discover-mansalay:isAdmin', role === 'admin' ? 'true' : 'false');
      localStorage.setItem('discover-mansalay:user', JSON.stringify(user));

      setUserType(role);
      setIsAdmin(role === 'admin');
      setCurrentUser(user);

      await showLoginSuccess(user.name || 'User', roleNameMap[role] || role);

      // Smart automatic role redirection
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'resort') {
        const isPaid = user.subscription_status === 'paid' || user.subscription_status === 'active';
        if (!isPaid) toast.info('Magbayad muna ng Subscription Fee para ma-access ang full features.');
        navigate('/resort/dashboard', { state: { showSubscriptionModal: !isPaid } });
      } else if (role === 'enterprise') {
        const isPaid = user.subscription_status === 'paid' || user.subscription_status === 'active';
        if (!isPaid) toast.info('Magbayad muna ng Subscription Fee para ma-access ang full features.');
        navigate('/enterprise/dashboard', { state: { showSubscriptionModal: !isPaid } });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err?.requires_verification) {
        await showErrorAlert('Email not verified', 'Please verify your email before logging in.');
        navigate('/tourist/verify-email', {
          state: {
            email: err.email || email,
          },
        });
      } else {
        toast.error(err.message || 'Invalid email or password. Please try again.');
        await showErrorAlert('Login failed', err.message || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) navigate(-1);
        }}
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-sans"
      >
        <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col lg:flex-row my-auto max-h-[96vh]">

          {/* ── LEFT PANEL: Hero / Brand ── */}
          <div className="hidden lg:flex lg:w-[44%] relative bg-gray-950 overflow-hidden flex-col justify-between p-8">
            <img
              src="/assets/mansalay_hero_bg.jpg"
              alt="Mansalay"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/60 to-gray-950/30" />

            {/* Top Branding */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-black tracking-tight">DiscoverMansalay</p>
                  <p className="text-white/50 text-[10px] font-semibold">Oriental Mindoro, Philippines</p>
                </div>
              </div>

              <h2 className="text-3xl font-black text-white leading-tight">
                Welcome <br />
                <span className="text-pink-400">back.</span>
              </h2>
              <p className="text-white/60 text-xs leading-relaxed mt-3 max-w-[280px]">
                Sign in to continue exploring the best destinations, resorts, events, and local products Mansalay has to offer.
              </p>
            </div>

            {/* Bottom Features */}
            <div className="relative z-10 space-y-3">
              {[
                { icon: Sparkles, text: 'Save your favorite destinations & itineraries' },
                { icon: MapPin, text: 'GPS-powered navigation to attractions' },
                { icon: Shield, text: 'Secure encrypted authentication' },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/10">
                  <feat.icon className="h-4 w-4 text-pink-400 flex-shrink-0" />
                  <p className="text-white/70 text-[11px] font-semibold">{feat.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL: Login Form ── */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute top-5 right-5 z-10 p-2 text-gray-400 hover:text-pink-600 bg-gray-100 hover:bg-pink-50 rounded-full transition-all hover:scale-110 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Mobile Brand */}
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center shadow-md shadow-pink-500/25">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 text-sm font-black tracking-tight">DiscoverMansalay</p>
                <p className="text-gray-400 text-[10px] font-semibold">Oriental Mindoro</p>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-1">Welcome Back</p>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Sign In to Your Account
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1.5">
                Enter your email and password to access your account.
              </p>
            </div>

            {/* ── LOGIN FORM ── */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-[11px] font-bold text-pink-500 hover:text-pink-600 hover:underline flex items-center gap-1 transition-colors">
                    <Key className="h-3 w-3" />
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">New here?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Register CTA */}
            <Link
              to="/register"
              className="w-full py-3 border-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-700 hover:text-pink-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create a New Account</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Setup Modal for first login */}
      <ProfileSetupModal
        isOpen={showSetupModal}
        onComplete={() => setShowSetupModal(false)}
      />
    </>
  );
}
