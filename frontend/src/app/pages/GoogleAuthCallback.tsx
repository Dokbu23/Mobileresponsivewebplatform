import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { postJSON, setAuthToken } from '../lib/api';
import { showErrorAlert, showLoginSuccess } from '../lib/sweetAlert';
import { toast } from 'sonner';
import { MapPin, ShieldCheck, AlertCircle } from 'lucide-react';

const roleNameMap: Record<string, string> = {
  tourist: 'Tourist',
  admin: 'Admin',
  resort: 'Resort Owner',
  enterprise: 'Enterprise',
};

export function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser, setUserType, setIsAdmin } = useApp();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Handle user cancellation or OAuth error
    if (error) {
      if (error === 'access_denied') {
        toast.info('Google authentication was cancelled.');
      } else {
        toast.error(errorDescription || 'Google sign-in was denied.');
      }
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      setErrorMessage('Missing authorization code from Google.');
      toast.error('Authentication code was not received.');
      navigate('/login', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const redirectUri = `${currentOrigin}/auth/google/callback`;

        const response = await postJSON(
          '/auth/google/callback',
          {
            code,
            state,
            redirect_uri: redirectUri,
          },
          false
        );

        const user = response.user || response;
        const role = (user.role || 'tourist') as string;
        const token = response.token || response.access_token;

        if (token) {
          setAuthToken(token);
        }

        if (response.requires_setup || !role || role === 'pending') {
          localStorage.setItem('discover-mansalay:userType', 'pending');
          localStorage.setItem('discover-mansalay:isAdmin', 'false');
          localStorage.setItem('discover-mansalay:user', JSON.stringify(user));
          setUserType('pending');
          setIsAdmin(false);
          setCurrentUser(user);
          // Navigate to dashboard where RootLayout automatically activates the existing ProfileSetupModal
          navigate('/dashboard', { replace: true });
          return;
        }

        localStorage.setItem('discover-mansalay:userType', role);
        localStorage.setItem('discover-mansalay:isAdmin', role === 'admin' ? 'true' : 'false');
        localStorage.setItem('discover-mansalay:user', JSON.stringify(user));

        setUserType(role as any);
        setIsAdmin(role === 'admin');
        setCurrentUser(user);

        await showLoginSuccess(user.name || 'User', roleNameMap[role] || role);

        // Role-based automatic redirect
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'resort') {
          navigate('/resort/dashboard', { replace: true });
        } else if (role === 'enterprise') {
          navigate('/enterprise/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('Google Callback Error:', err);
        const msg = err?.message || 'Failed to authenticate with Google. Please try again.';
        setErrorMessage(msg);
        await showErrorAlert('Authentication Failed', msg);
        navigate('/login', { replace: true });
      }
    };

    exchangeCode();
  }, [searchParams, navigate, setCurrentUser, setUserType, setIsAdmin]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-900/20 via-slate-950/80 to-slate-950 -z-10" />

      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30 mb-6 animate-pulse">
          <MapPin className="h-7 w-7 text-white" />
        </div>

        {errorMessage ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Authentication Error</h2>
            <p className="text-sm text-white/60 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="py-2.5 px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
              Verifying Google Sign-In
            </h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-xs mb-6">
              Establishing a secure connection and preparing your account session...
            </p>
            <div className="flex items-center gap-2 text-white/40 text-[11px] font-semibold bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>OAuth 2.0 Secure Session</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
