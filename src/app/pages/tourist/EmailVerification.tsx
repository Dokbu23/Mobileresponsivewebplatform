import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { postJSON } from '../../lib/api';
import { showErrorAlert } from '../../lib/sweetAlert';

export function EmailVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const email = location.state?.email || '';
  const role = location.state?.role || 'tourist'; // Detect role from state

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Determine paths based on role
  const getRegisterPath = () => {
    switch (role) {
      case 'resort': return '/resort/register';
      case 'enterprise': return '/enterprise/register';
      default: return '/tourist/register';
    }
  };

  const getLoginPath = () => {
    switch (role) {
      case 'resort': return '/resort/login';
      case 'enterprise': return '/enterprise/login';
      default: return '/tourist/login';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'resort': return 'Resort Owner';
      case 'enterprise': return 'Enterprise';
      default: return 'Tourist';
    }
  };

  useEffect(() => {
    if (!email) {
      navigate(getRegisterPath());
      return;
    }

    // Send initial code
    sendVerificationCode();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    try {
      await postJSON('/email/send-code', { email }, false);
      toast.success('Verification code sent to your email');
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send code');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) {
      toast.error('Please paste numbers only');
      return;
    }

    const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setCode(newCode);

    // Auto-verify if 6 digits pasted
    if (pastedData.length === 6) {
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeString: string) => {
    setIsVerifying(true);

    try {
      // Verify the code
      await postJSON('/email/verify-code', {
        email,
        code: codeString,
      }, false);
      
      // Show success message
      toast.success('Email verified! Redirecting to login...');
      
      // Redirect to appropriate login page with success message
      setTimeout(() => {
        navigate(getLoginPath(), {
          state: {
            verificationSuccess: true,
            email: email,
          },
        });
      }, 1500);
    } catch (error: any) {
      await showErrorAlert('Verification failed', error.message || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (canResend) {
      sendVerificationCode();
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border-2 border-primary/20 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2">Verify Your Email</h2>
          <p className="text-muted-foreground mb-1">
            {getRoleLabel()} Account Verification
          </p>
          <p className="text-muted-foreground mb-2">
            We sent a 6-digit code to
          </p>
          <p className="font-semibold text-primary">{email}</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-3 text-center">Enter Verification Code</label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  disabled={isVerifying}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-primary hover:underline text-sm"
              >
                Resend Code
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Resend code in {countdown}s
              </p>
            )}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm">
            <p className="text-blue-700">
              💡 <strong>Tip:</strong> Check your spam folder if you don't see the email.
            </p>
          </div>

          <button
            onClick={() => navigate(getRegisterPath())}
            className="w-full py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            Back to Registration
          </button>
        </div>
      </div>
    </div>
  );
}
