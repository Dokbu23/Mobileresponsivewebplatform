import { Link } from 'react-router';
import { Settings as SettingsIcon, User, Calendar, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Settings() {
  const { userType } = useApp();

  if (!userType) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="mb-4">Please Login to View Settings</h2>
        <p className="text-muted-foreground mb-8">
          You need to be logged in to manage settings.
        </p>
        <Link
          to="/select-role"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>

      <div className="grid gap-4">
        <Link
          to="/profile"
          className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-xl p-5 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold text-gray-800">Profile Information</p>
              <p className="text-sm text-muted-foreground">Manage your personal account details and preferences.</p>
            </div>
          </div>
          <span className="text-sm text-primary font-medium">Manage →</span>
        </Link>

        {userType !== 'admin' && (
          <Link
            to="/itinerary"
            className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-xl p-5 hover:border-primary transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-gray-800">Saved Trip Plans</p>
                <p className="text-sm text-muted-foreground">View and manage your saved tourism itineraries.</p>
              </div>
            </div>
            <span className="text-sm text-primary font-medium">View →</span>
          </Link>
        )}

        <Link
          to="/profile"
          className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-xl p-5 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold text-gray-800">Security & Password</p>
              <p className="text-sm text-muted-foreground">Update your account password and security settings.</p>
            </div>
          </div>
          <span className="text-sm text-primary font-medium">Update →</span>
        </Link>
      </div>
    </div>
  );
}
