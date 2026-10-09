import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getAuthToken } from '../../lib/api';
import { toast } from 'sonner';
import { MonthlyTourismReports } from './MonthlyTourismReports';

export function AdminReports() {
  const { userType } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken();
    const storedRole = localStorage.getItem('discover-mansalay:userType');
    
    // Verify admin authentication and authorization
    if (!token || (userType && userType !== 'admin') || (storedRole && storedRole !== 'admin')) {
      toast.error('Unauthorized access. Admin privileges required.');
      navigate('/admin/login', { replace: true });
    }
  }, [userType, navigate]);

  // Prevent flash of protected UI if user is not an administrator
  if (userType && userType !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-900 py-6 sm:py-8 font-sans text-gray-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <MonthlyTourismReports embedded={false} />
      </div>
    </div>
  );
}
