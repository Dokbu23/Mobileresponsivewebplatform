import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { MapPin, Mail, Lock, UserPlus, User, Phone, Eye, EyeOff, X, Shield, CheckCircle2, ChevronRight } from 'lucide-react';
import { postJSON } from '../lib/api';
import { toast } from 'sonner';

export function UnifiedRegister() {
  const navigate = useNavigate();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'bg-emerald-400' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        phone: phone || null,
        password,
      };

      await postJSON('/register', payload, false);

      toast.success('Registration successful! Please verify your email.');
      navigate('/tourist/verify-email', {
        state: {
          email,
          role: 'tourist',
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-black tracking-tight">DiscoverMansalay</p>
                <p className="text-white/50 text-[10px] font-semibold">Oriental Mindoro, Philippines</p>
              </div>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mt-8">
              Start your <br />
              <span className="text-pink-400">journey</span> today.
            </h2>
            <p className="text-white/60 text-xs leading-relaxed mt-3 max-w-[280px]">
              Create an account to discover attractions, book resort stays, and explore local business offerings in Mansalay.
            </p>
          </div>

          {/* Bottom Stats & Security */}
          <div className="relative z-10 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '50+', label: 'Attractions' },
                { value: '20+', label: 'Resorts' },
                { value: '1K+', label: 'Travelers' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                  <p className="text-white text-lg font-black">{s.value}</p>
                  <p className="text-white/50 text-[9px] font-bold uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/10">
              <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <p className="text-white/70 text-[10px] font-semibold">
                Secured registration — your information is safely encrypted.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Simple Register Form ── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute top-5 right-5 z-10 p-2 text-gray-400 hover:text-pink-600 bg-gray-100 hover:bg-pink-50 rounded-full transition-all hover:scale-110 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-1">Get Started</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Enter your details to create an account. You will select your account type after email verification.
            </p>
          </div>

          {/* ── FORM ── */}
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09171234567"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      passwordStrength.score <= 1 ? 'text-red-500' :
                      passwordStrength.score <= 2 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white outline-none transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/10'
                        : confirmPassword && confirmPassword === password
                        ? 'border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10'
                        : 'border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10'
                    }`}
                  />
                  {confirmPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {confirmPassword === password ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1">Passwords don't match</p>
                )}
              </div>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group mt-2">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${
                  agreed
                    ? 'bg-pink-500 border-pink-500'
                    : 'border-gray-300 group-hover:border-gray-400'
                }`}>
                  {agreed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
              <span className="text-[11px] text-gray-500 font-medium leading-relaxed">
                I agree to the <span className="text-pink-600 font-bold hover:underline cursor-pointer">Terms of Service</span> and{' '}
                <span className="text-pink-600 font-bold hover:underline cursor-pointer">Privacy Policy</span> of DiscoverMansalay.
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Divider + Login Link */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-extrabold text-pink-600 hover:text-pink-700 hover:underline transition-colors">
                Sign In →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
