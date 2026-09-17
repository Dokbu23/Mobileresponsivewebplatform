import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Hotel, Store, User, Building, CheckCircle2, ChevronRight, Sparkles, Loader2, ShieldCheck, AlertCircle, Phone, ExternalLink, LogOut } from 'lucide-react';
import { postJSON, setAuthToken, removeAuthToken } from '../lib/api';
import { useApp } from '../context/AppContext';
import { showLogoutConfirm, showLogoutSuccess } from '../lib/sweetAlert';
import { toast } from 'sonner';

type AccountRole = 'tourist' | 'resort' | 'enterprise';

import { MANSALAY_BARANGAYS } from '../lib/constants';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete?: (updatedUser: any) => void;
}

export function ProfileSetupModal({ isOpen, onComplete }: ProfileSetupModalProps) {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, setUserType, setIsAdmin } = useApp();

  const [step, setStep] = useState<'splash' | 'choose' | 'details'>('splash');
  const [selectedRole, setSelectedRole] = useState<AccountRole>('tourist');

  // Additional details
  const [businessName, setBusinessName] = useState('');
  const [barangay, setBarangay] = useState('Barangay I (Poblacion)');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Splash auto-transition (1.5 seconds)
  useEffect(() => {
    if (!isOpen) return;
    setStep('splash');
    const timer = setTimeout(() => {
      setStep('choose');
    }, 1600);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'tourist') {
      submitProfile('tourist');
    } else {
      setStep('details');
    }
  };

  const submitProfile = async (roleToSubmit: AccountRole) => {
    setLoading(true);
    try {
      const payload = {
        role: roleToSubmit,
        business_name: roleToSubmit !== 'tourist' ? businessName : undefined,
        barangay: roleToSubmit !== 'tourist' ? barangay : undefined,
        phone: phone || undefined,
        facebook_link: facebookLink || undefined,
        instagram_link: instagramLink || undefined,
      };

      const response = await postJSON('/setup-profile', payload);
      const updatedUser = response.user || response;
      const newToken = response.token;

      if (newToken) {
        setAuthToken(newToken);
      }

      const role = updatedUser.role || roleToSubmit;

      localStorage.setItem('discover-mansalay:userType', role);
      localStorage.setItem('discover-mansalay:isAdmin', role === 'admin' ? 'true' : 'false');
      localStorage.setItem('discover-mansalay:user', JSON.stringify(updatedUser));

      setUserType(role);
      setIsAdmin(role === 'admin');
      setCurrentUser(updatedUser);

      toast.success(`Profile setup completed as ${role === 'tourist' ? 'Tourist' : role === 'resort' ? 'Resort Owner' : 'Enterprise Merchant'}!`);

      if (onComplete) {
        onComplete(updatedUser);
      }

      // Redirect logic
      if (role === 'resort') {
        toast.info('Your Resort profile is pending verification. Please complete subscription payment to unlock full features.', { duration: 6000 });
        navigate('/resort/dashboard', { state: { showSubscriptionModal: true } });
      } else if (role === 'enterprise') {
        toast.info('Your Enterprise profile is pending verification. Please complete subscription payment to unlock full features.', { duration: 6000 });
        navigate('/enterprise/dashboard', { state: { showSubscriptionModal: true } });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Setup profile error:', err);
      toast.error(err.message || 'Failed to complete profile setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const result = await showLogoutConfirm();
    if (!result.isConfirmed) {
      return;
    }

    removeAuthToken();
    setUserType(null);
    setIsAdmin(false);
    setCurrentUser(null);
    window.localStorage.removeItem('discover-mansalay:userType');
    window.localStorage.removeItem('discover-mansalay:isAdmin');
    window.localStorage.removeItem('discover-mansalay:user');
    window.localStorage.removeItem('discover-mansalay:currentUser');
    window.localStorage.removeItem('user');
    await showLogoutSuccess();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 p-6 sm:p-9 my-auto">
        
        {/* Top-Right Logout Button */}
        {step !== 'splash' && (
          <button
            type="button"
            onClick={handleLogout}
            className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 rounded-full transition-all border border-rose-200/80 dark:border-rose-900/50 cursor-pointer shadow-xs active:scale-95"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        )}
        
        {/* ── STEP 1: SPLASH ANIMATION ── */}
        {step === 'splash' && (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-500">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping" />
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Sparkles className="h-8 w-8 text-white animate-bounce" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Setting up your profile...
              </h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                Welcome to DiscoverMansalay! Just one more step.
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
            </div>
          </div>
        )}

        {/* ── STEP 2: CHOOSE ACCOUNT TYPE ── */}
        {step === 'choose' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <span className="px-3 py-1 bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-pink-100 dark:border-pink-900/50">
                Step 1 of 2
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-2">
                Choose Account Type
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                Select how you plan to use DiscoverMansalay platform
              </p>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-3">
              {/* Tourist Option */}
              <div
                onClick={() => setSelectedRole('tourist')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                  selectedRole === 'tourist'
                    ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/40 shadow-md shadow-pink-500/10'
                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedRole === 'tourist' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Tourist / Visitor</h3>
                    {selectedRole === 'tourist' && <CheckCircle2 className="h-5 w-5 text-pink-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Discover Mansalay attractions, plan itineraries, save favorites, and book resort stays & local products.
                  </p>
                </div>
              </div>

              {/* Resort Owner Option */}
              <div
                onClick={() => setSelectedRole('resort')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                  selectedRole === 'resort'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-md shadow-emerald-500/10'
                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedRole === 'resort' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <Hotel className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Resort Owner</h3>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold rounded-md">Business</span>
                    </div>
                    {selectedRole === 'resort' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    List your resort, add rooms & amenities, manage bookings, and reach thousands of tourists in Mansalay.
                  </p>
                </div>
              </div>

              {/* Enterprise Option */}
              <div
                onClick={() => setSelectedRole('enterprise')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                  selectedRole === 'enterprise'
                    ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/40 shadow-md shadow-violet-500/10'
                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedRole === 'enterprise' ? 'bg-violet-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <Store className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Enterprise Merchant</h3>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 text-[9px] font-bold rounded-md">Business</span>
                    </div>
                    {selectedRole === 'enterprise' && <CheckCircle2 className="h-5 w-5 text-violet-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Sell local crafts, agricultural goods, and delicacies online to tourists and residents.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Continue as {selectedRole === 'tourist' ? 'Tourist' : selectedRole === 'resort' ? 'Resort Owner' : 'Enterprise Merchant'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 3: BUSINESS DETAILS (FOR RESORT & ENTERPRISE) ── */}
        {step === 'details' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs font-bold text-pink-500 hover:underline mb-2 inline-block"
              >
                ← Back to Account Selection
              </button>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {selectedRole === 'resort' ? 'Resort Profile Details' : 'Enterprise Store Details'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                Please provide your official business information in Mansalay
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitProfile(selectedRole);
              }}
              className="space-y-4"
            >
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {selectedRole === 'resort' ? 'Resort Name' : 'Store / Enterprise Name'}
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={selectedRole === 'resort' ? 'e.g. Paradise Cove Beach Resort' : 'e.g. Mansalay Weavers Shop'}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Barangay Location */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Barangay Location in Mansalay
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:border-pink-500 outline-none cursor-pointer"
                  >
                    {MANSALAY_BARANGAYS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone Number (Call Link)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Facebook Page URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Facebook Page Link (Optional)
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                  <input
                    type="text"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="e.g. facebook.com/yourbusiness"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Instagram Profile URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Instagram Profile Link (Optional)
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                  <input
                    type="text"
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                    placeholder="e.g. instagram.com/yourbusiness"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Business Verification Note */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  <span className="font-extrabold">Verification & Subscription Required:</span> Business accounts require admin verification and subscription payment. Features will remain locked until payment is uploaded & verified.
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Complete Business Profile</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
