import React, { useState } from 'react';
import { getJSON } from '../lib/api';
import { toast } from 'sonner';

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  className?: string;
  disabled?: boolean;
}

export function GoogleAuthButton({
  mode = 'signin',
  className = '',
  disabled = false,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      // Build dynamic redirect URI according to current origin
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const redirectUri = `${currentOrigin}/auth/google/callback`;

      // Request authorization URL from backend
      const response = await getJSON(`/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);

      if (response?.url) {
        // Redirect to Google OAuth consent screen
        window.location.href = response.url;
      } else {
        toast.error('Unable to initialize Google authentication. Please try again later.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Google Auth Init Error:', err);
      const message = err?.message || 'Google authentication service is currently unavailable.';
      toast.error(message);
      setLoading(false);
    }
  };

  const label = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading || disabled}
      aria-label={label}
      className={`w-full py-3 px-4 bg-white hover:bg-gray-50/90 active:bg-gray-100 disabled:bg-gray-50 border border-gray-300/90 hover:border-gray-400/80 rounded-xl text-gray-700 font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 group relative select-none ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform group-hover:scale-105"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      )}
      <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors">
        {loading ? 'Connecting to Google...' : label}
      </span>
    </button>
  );
}
