import { Link } from 'react-router';
import { Settings as SettingsIcon, MapPin } from 'lucide-react';
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
        <h1>Settings</h1>
      </div>

      <div className="grid gap-4">
        <Link
          to="/settings/shipping"
          className="flex items-center justify-between gap-4 bg-white border-2 border-primary/20 rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Shipping Addresses</p>
              <p className="text-sm text-muted-foreground">Manage saved addresses for checkout.</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Manage</span>
        </Link>
      </div>
    </div>
  );
}
