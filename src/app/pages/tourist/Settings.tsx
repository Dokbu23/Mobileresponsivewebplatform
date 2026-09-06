import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Settings as SettingsIcon, 
  User, 
  Calendar, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Loader2, 
  ArrowRight, 
  X, 
  RefreshCw, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { postJSON, getJSON } from '../../lib/api';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export function Settings() {
  const { currentUser, setCurrentUser, userType } = useApp();

  // State for Email Change modal & process
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync / refresh latest user profile email
  const [displayEmail, setDisplayEmail] = useState(currentUser?.email || '');

  useEffect(() => {
    if (currentUser?.email) {
      setDisplayEmail(currentUser.email);
    } else {
      // Fetch fresh profile if not already in context
      getJSON('/me')
        .then((data) => {
          const user = data.user ?? data;
          if (user?.email) {
            setDisplayEmail(user.email);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Resend OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const openEmailModal = () => {
    setStep('input');
    setNewEmail('');
    setOtpCode('');
    setErrorMessage(null);
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    if (isSubmitting) return;
    setIsEmailModalOpen(false);
    setStep('input');
    setErrorMessage(null);
  };

  // Step 1: Request OTP code for new email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setErrorMessage('Pakilagay ang iyong bagong email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage('Pakilagay ang wastong format ng email address.');
      return;
    }

    if (emailTrimmed === displayEmail.toLowerCase()) {
      setErrorMessage('Kailangang magkaiba ang bagong email sa kasalukuyang email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await postJSON('/profile/change-email/send-code', {
        new_email: emailTrimmed,
      });

      toast.success(res?.message || 'Naipadala na ang 6-digit verification code!');
      setResendCooldown(60);
      setStep('otp');
    } catch (err: any) {
      const msg = err?.message || 'Hindi maipadala ang verification code. Pakisubukan muli.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP code and update email
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const codeTrimmed = otpCode.trim();
    if (!codeTrimmed || codeTrimmed.length !== 6) {
      setErrorMessage('Pakilagay ang eksaktong 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const emailTrimmed = newEmail.trim().toLowerCase();
      const res = await postJSON('/profile/change-email/verify', {
        new_email: emailTrimmed,
        code: codeTrimmed,
      });

      // Update state
      setDisplayEmail(emailTrimmed);
      if (currentUser) {
        const updated = { ...currentUser, email: emailTrimmed };
        setCurrentUser(updated);
        localStorage.setItem('discover-mansalay:currentUser', JSON.stringify(updated));
        localStorage.setItem('discover-mansalay:user', JSON.stringify(updated));
      }

      setStep('success');
      toast.success('Matagumpay na napalitan ang iyong email address! 🎉');

      // Also trigger success alert
      Swal.fire({
        icon: 'success',
        title: 'Email Changed Successfully! 🎉',
        html: `
          <p class="text-sm text-gray-700">
            Ang iyong bagong email address ay:<br/>
            <strong class="text-emerald-600 font-bold text-base">${emailTrimmed}</strong>
          </p>
        `,
        confirmButtonColor: '#ec4899',
        confirmButtonText: 'Sige, Salamat!',
      });
    } catch (err: any) {
      const msg = err?.message || 'Maling verification code o nag-expire na. Pakisubukan muli.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userType) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Please Login to View Settings</h2>
        <p className="text-muted-foreground mb-8">
          You need to be logged in to manage settings.
        </p>
        <Link
          to="/select-role"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow"
        >
          Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal profile, registered email, trip plans, and account security.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {/* Highlighted Feature: Email Address & Change Email Card */}
        <div className="bg-white border-2 border-primary/20 rounded-2xl p-5 md:p-6 shadow-sm hover:border-primary/40 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-800">Email Address</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Used for account login, booking vouchers, itinerary reminders, and receipts.
                </p>

                {/* Display Current Email */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Current Registered Email:</span>
                  <span className="font-mono text-sm font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                    {displayEmail || 'No email registered'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openEmailModal}
              className="self-start md:self-center inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              Change Email
            </button>
          </div>
        </div>

        {/* Profile Information Card */}
        <Link
          to="/profile"
          className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-2xl p-5 hover:border-primary transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">Profile Information</p>
              <p className="text-sm text-muted-foreground">Manage your personal details, avatar photo, and contact number.</p>
            </div>
          </div>
          <span className="text-sm text-primary font-medium flex items-center gap-1">
            Manage <ChevronRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Saved Trip Plans */}
        {userType !== 'admin' && (
          <Link
            to="/itinerary"
            className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-2xl p-5 hover:border-primary transition-all shadow-sm group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">Saved Trip Plans</p>
                <p className="text-sm text-muted-foreground">View, customize, and manage your saved tourism itineraries in Mansalay.</p>
              </div>
            </div>
            <span className="text-sm text-primary font-medium flex items-center gap-1">
              View <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        )}

        {/* Security & Password */}
        <Link
          to="/profile"
          className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-2xl p-5 hover:border-primary transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">Security & Password</p>
              <p className="text-sm text-muted-foreground">Update your account password and security credentials.</p>
            </div>
          </div>
          <span className="text-sm text-primary font-medium flex items-center gap-1">
            Update <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      {/* Change Email Modal Dialog */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Change Email Address</h3>
                  <p className="text-xs text-muted-foreground">Update your registered login email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Error Message Box */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Enter New Email */}
              {step === 'input' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                    <span className="text-xs text-gray-500 block">Kasalukuyang Email (Current Email):</span>
                    <span className="text-sm font-semibold text-gray-900 font-mono">
                      {displayEmail}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bagong Email Address (New Email) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="halimbawa: bagong.email@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border-2 border-primary/20 focus:border-primary outline-none text-sm transition-all placeholder:text-gray-400"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      Padadalhan ka namin ng <strong className="text-gray-700">6-digit verification code</strong> sa email na ito upang kumpirmahin ang pagpapalit.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={closeEmailModal}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Kanselahin
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newEmail.trim()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Pinapadala...
                        </>
                      ) : (
                        <>
                          Send Code
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter 6-digit Verification Code */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center p-3 bg-pink-50/70 border border-pink-100 rounded-xl">
                    <p className="text-xs text-gray-600">
                      Naipadala ang 6-digit code sa:
                    </p>
                    <p className="text-sm font-bold text-pink-600 font-mono break-all mt-0.5">
                      {newEmail}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      disabled={isSubmitting}
                      className="text-[11px] text-gray-500 underline hover:text-gray-800 mt-1 cursor-pointer block mx-auto"
                    >
                      Maling email? Palitan
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 text-center">
                      Ilagay ang 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.35em] font-mono font-bold text-2xl py-2.5 rounded-lg border-2 border-primary/30 focus:border-primary outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-300"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <p className="text-[11px] text-center text-gray-400 mt-1">
                      Pakitingnan ang iyong inbox o Spam/Junk folder.
                    </p>
                  </div>

                  {/* Resend Code */}
                  <div className="flex items-center justify-center gap-1 text-xs">
                    {resendCooldown > 0 ? (
                      <span className="text-gray-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Puwede mag-resend sa loob ng {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestOtp()}
                        disabled={isSubmitting}
                        className="text-pink-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Muling ipadala ang code (Resend)
                      </button>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Bumalik
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || otpCode.trim().length !== 6}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Nagve-verify...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Kumpirmahin & Palitan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success Confirmation */}
              {step === 'success' && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Matagumpay na Napalitan!</h4>
                  <p className="text-sm text-gray-600">
                    Ang iyong registered email address ay matagumpay nang na-update sa:
                  </p>
                  <p className="text-base font-bold text-emerald-600 font-mono bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                    {displayEmail}
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={closeEmailModal}
                      className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all shadow cursor-pointer"
                    >
                      Tapos Na (Close)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
