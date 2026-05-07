import { useState, useEffect, useRef } from 'react';
import { Users, Shield, Hotel, Store, User as UserIcon, Search, Filter, MoreVertical, Edit, Trash2, Check, X, UserX, UserCheck } from 'lucide-react';
import { getJSON, deleteJSON, patchJSON, getAuthToken } from '../../lib/api';
import { showSuccessAlert, showConfirmAlert } from '../../lib/sweetAlert';
import { toast } from 'sonner';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'tourist' | 'admin' | 'resort' | 'enterprise';
  email_verified_at: string | null;
  created_at: string;
  is_active?: boolean;
}

export function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'tourist' | 'admin' | 'resort' | 'enterprise'>('all');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      console.log('Token:', getAuthToken());
      const response = await getJSON('/users');
      console.log('Users response:', response);
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      setUsers([]);
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-600" />;
      case 'resort':
        return <Hotel className="h-5 w-5 text-green-600" />;
      case 'enterprise':
        return <Store className="h-5 w-5 text-pink-600" />;
      default:
        return <UserIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border-purple-300',
      resort: 'bg-green-100 text-green-700 border-green-300',
      enterprise: 'bg-pink-100 text-pink-700 border-pink-300',
      tourist: 'bg-blue-100 text-blue-700 border-blue-300',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm border ${colors[role as keyof typeof colors] || colors.tourist}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const handleDeleteUser = async (user: User) => {
    setOpenDropdown(null);
    const result = await showConfirmAlert(
      'Delete User?',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`
    );

    if (result.isConfirmed) {
      try {
        await deleteJSON(`/users/${user.id}`);
        await showSuccessAlert('User Deleted!', `${user.name} has been deleted successfully.`);
        fetchUsers();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete user');
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    setOpenDropdown(null);
    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    const result = await showConfirmAlert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
      `Are you sure you want to ${action} ${user.name}?`
    );

    if (result.isConfirmed) {
      try {
        await patchJSON(`/users/${user.id}`, { is_active: newStatus });
        await showSuccessAlert(
          `User ${action.charAt(0).toUpperCase() + action.slice(1)}d!`,
          `${user.name} has been ${action}d successfully.`
        );
        fetchUsers();
      } catch (error: any) {
        toast.error(error.message || `Failed to ${action} user`);
      }
    }
  };

  const handleEditUser = (user: User) => {
    setOpenDropdown(null);
    toast.info('Edit feature coming soon');
  };

  const roleStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    tourist: users.filter(u => u.role === 'tourist').length,
    resort: users.filter(u => u.role === 'resort').length,
    enterprise: users.filter(u => u.role === 'enterprise').length,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Manage all registered users and their roles
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl text-primary">{roleStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700">Admins</p>
              <p className="text-2xl text-purple-600">{roleStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700">Tourists</p>
              <p className="text-2xl text-blue-600">{roleStats.tourist}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Hotel className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Resorts</p>
              <p className="text-2xl text-green-600">{roleStats.resort}</p>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-pink-600" />
            <div>
              <p className="text-sm text-pink-700">Enterprises</p>
              <p className="text-2xl text-pink-600">{roleStats.enterprise}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="tourist">Tourist</option>
              <option value="resort">Resort</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b-2 border-primary/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm">User</th>
                <th className="px-6 py-4 text-left text-sm">Email</th>
                <th className="px-6 py-4 text-left text-sm">Role</th>
                <th className="px-6 py-4 text-left text-sm">Status</th>
                <th className="px-6 py-4 text-left text-sm">Joined</th>
                <th className="px-6 py-4 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.email_verified_at ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-sm flex items-center gap-1 w-fit">
                          <Check className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-300 rounded-full text-sm flex items-center gap-1 w-fit">
                          <X className="h-4 w-4" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative" ref={openDropdown === user.id ? dropdownRef : null}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {openDropdown === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-primary/20 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="w-full px-4 py-2 text-left hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                              <span>Edit User</span>
                            </button>
                            
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="w-full px-4 py-2 text-left hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm border-t border-primary/10"
                            >
                              {user.is_active !== false ? (
                                <>
                                  <UserX className="h-4 w-4 text-orange-600" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="w-full px-4 py-2 text-left hover:bg-red-50 transition-colors flex items-center gap-2 text-sm border-t border-primary/10 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete User</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}