import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { deleteJSON, getJSON, patchJSON } from '../../lib/api';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'tourist' | 'admin' | 'resort' | 'enterprise';
  listing_status?: 'pending' | 'approved' | 'rejected';
  is_active?: boolean;
  created_at?: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'tourist', listing_status: 'approved' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getJSON('/users');
      const mapped = Array.isArray(data) ? data : [];
      setUsers(mapped);
    } catch (error) {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (user: UserRow, action: string) => {
    if (!action) return;

    if (action === 'edit') {
      setEditingUser(user);
      setEditForm({
        name: user.name ?? '',
        email: user.email ?? '',
        role: user.role ?? 'tourist',
        listing_status: user.listing_status ?? 'approved',
      });
      return;
    }

    if (action === 'deactivate') {
      await updateUser(user.id, { is_active: false });
      return;
    }

    if (action === 'activate') {
      await updateUser(user.id, { is_active: true });
      return;
    }

    if (action === 'delete') {
      await deleteUser(user.id);
    }
  };

  const updateUser = async (id: number, payload: Partial<UserRow>) => {
    try {
      await patchJSON(`/users/${id}`, payload);
      await fetchUsers();
      toast.success('User updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await deleteJSON(`/users/${id}`);
      await fetchUsers();
      toast.success('User deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      };

      if (editingUser.role === 'resort' || editingUser.role === 'enterprise') {
        payload.listing_status = editForm.listing_status;
      }

      await patchJSON(`/users/${editingUser.id}`, payload);
      setEditingUser(null);
      await fetchUsers();
      toast.success('User updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
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
        <p className="text-muted-foreground">Manage all registered accounts</p>
      </div>

      {editingUser && (
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6">
          <h2 className="mb-4">Edit User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
              placeholder="Name"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
              placeholder="Email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <select
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
              value={editForm.role}
              onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as UserRow['role'] }))}
            >
              <option value="tourist">Tourist</option>
              <option value="enterprise">Enterprise</option>
              <option value="resort">Resort</option>
              <option value="admin">Admin</option>
            </select>
            {(editingUser.role === 'resort' || editingUser.role === 'enterprise') && (
              <select
                className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
                value={editForm.listing_status}
                onChange={(e) => setEditForm(prev => ({ ...prev, listing_status: e.target.value }))}
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={saveEdit}
              className="px-6 py-2 bg-primary text-white rounded-lg"
            >
              Save
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="px-6 py-2 border-2 border-primary text-primary rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-primary/5">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Name</th>
                <th className="px-4 py-3 text-left text-sm">Email</th>
                <th className="px-4 py-3 text-left text-sm">Role</th>
                <th className="px-4 py-3 text-left text-sm">Status</th>
                <th className="px-4 py-3 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-primary/10">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 capitalize">{user.role}</td>
                  <td className="px-4 py-3">
                    {user.is_active === false ? 'Inactive' : 'Active'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="px-3 py-2 border-2 border-primary/20 rounded-lg"
                      defaultValue=""
                      onChange={(e) => {
                        handleAction(user, e.target.value);
                        e.currentTarget.value = '';
                      }}
                    >
                      <option value="" disabled>
                        Action
                      </option>
                      <option value="edit">Edit</option>
                      {user.is_active === false ? (
                        <option value="activate">Activate</option>
                      ) : (
                        <option value="deactivate">Deactivate</option>
                      )}
                      <option value="delete">Delete</option>
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
