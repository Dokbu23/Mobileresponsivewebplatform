import { useNavigate } from 'react-router';
import { MapPin, Shield, Hotel, Store, LogIn, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function RoleSelection() {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const roles = [
    {
      type: 'tourist',
      icon: MapPin,
      title: 'Tourist',
      description: 'Explore attractions, book accommodations, and shop local products',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200 hover:border-blue-400',
      loginPath: '/tourist/login',
      hasRegister: false,
    },
    {
      type: 'admin',
      icon: Shield,
      title: 'Admin',
      description: 'Manage platform, approve listings, and view analytics',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200 hover:border-purple-400',
      loginPath: '/admin/login',
      hasRegister: false,
    },
    {
      type: 'resort',
      icon: Hotel,
      title: 'Resort Owner',
      description: 'Register your resort and manage bookings',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200 hover:border-green-400',
      loginPath: '/resort/login',
      registerPath: '/resort/register',
      hasRegister: true,
    },
    {
      type: 'enterprise',
      icon: Store,
      title: 'Enterprise',
      description: 'Sell local products and manage your inventory',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200 hover:border-pink-400',
      loginPath: '/enterprise/login',
      registerPath: '/enterprise/register',
      hasRegister: true,
    },
  ];

  // If user is already logged in, show a message instead of role selection
  if (currentUser) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-4">You're already logged in!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Welcome back, {currentUser.name}
          </p>
          <button
            onClick={() => {
              switch (currentUser.role) {
                case 'admin':
                  navigate('/admin/dashboard');
                  break;
                case 'enterprise':
                  navigate('/enterprise/dashboard');
                  break;
                case 'resort':
                  navigate('/resort/dashboard');
                  break;
                case 'tourist':
                  navigate('/dashboard');
                  break;
              }
            }}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-4">Welcome to DiscoverMansalay</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your role to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.type}
                className={`bg-white border-2 ${role.borderColor} rounded-lg p-8 hover:shadow-lg transition-all`}
              >
                <div className={`${role.color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`h-8 w-8 ${role.iconColor}`} />
                </div>
                <h3 className="mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {role.description}
                </p>

                {role.hasRegister ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(role.loginPath)}
                      className="flex-1 px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </button>
                    <button
                      onClick={() => navigate(role.registerPath!)}
                      className={`flex-1 px-4 py-2 ${role.iconColor === 'text-green-600' ? 'bg-green-600 hover:bg-green-700' : 'bg-pink-600 hover:bg-pink-700'} text-white rounded-lg transition-colors inline-flex items-center justify-center gap-2`}
                    >
                      <UserPlus className="h-4 w-4" />
                      Register
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(role.loginPath)}
                    className={`w-full px-4 py-3 ${role.iconColor === 'text-blue-600' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg transition-colors inline-flex items-center justify-center gap-2`}
                  >
                    <LogIn className="h-4 w-4" />
                    {role.type === 'tourist' ? 'Get Started' : 'Login'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Skip and browse as guest
          </button>
        </div>
      </div>
    </div>
  );
}
