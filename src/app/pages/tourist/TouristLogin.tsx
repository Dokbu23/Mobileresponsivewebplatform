import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, User, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

export function TouristLogin() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { setUserType } = useApp();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email) {
      toast.error('Please fill in all fields');
      return;
    }

    setUserType('tourist');
    toast.success(`Welcome, ${name}!`);
    navigate('/');
  };

  const handleGuestContinue = () => {
    setUserType('tourist');
    toast.success('Welcome, Guest!');
    navigate('/');
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
            <label className="block text-sm mb-2">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter your name"
              />
            </div>
          </div>

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
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In as Tourist
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-muted-foreground">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestContinue}
            className="w-full py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            Continue as Guest
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>New to DiscoverMansalay?</p>
          <p>Just enter your details to start exploring!</p>
        </div>
      </div>
    </div>
  );
}
