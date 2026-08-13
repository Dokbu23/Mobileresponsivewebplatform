import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Store, Hotel, Shield, Camera, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getJSON, patchJSON, postJSON, API_BASE, getAuthToken } from '../lib/api';
import { toast } from 'sonner';
import { showSuccessAlert } from '../lib/sweetAlert';
import { Link } from 'react-router';

export function Profile() {
  const { currentUser, userType, setCurrentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    resort_name: '',
    store_name: '',
    phone: '',
    facebook_link: '',
    instagram_link: '',
    address: '',
    barangay: '',
    description: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Change password state
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getJSON('/me');
      const user = data.user ?? data;
      setProfile(user);
      setForm({
        name: user.name ?? '',
        resort_name: user.resort_name ?? '',
        store_name: user.store_name ?? '',
        phone: user.phone ?? '',
        facebook_link: user.facebook_link ?? '',
        instagram_link: user.instagram_link ?? '',
        address: user.address ?? '',
        barangay: user.barangay ?? '',
        description: user.description ?? '',
      });
      return user;
    } catch {
      toast.error('Failed to load profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      // If avatar file selected, upload via FormData
      if (avatarFile) {
        const token = getAuthToken();
        const formData = new FormData();
        formData.append('name', form.name.trim());
        formData.append('resort_name', form.resort_name.trim());
        formData.append('store_name', form.store_name.trim());
        formData.append('phone', form.phone.trim());
        formData.append('facebook_link', form.facebook_link.trim());
        formData.append('instagram_link', form.instagram_link.trim());
        formData.append('address', form.address.trim());
        formData.append('barangay', form.barangay.trim());
        formData.append('description', form.description.trim());
        formData.append('avatar', avatarFile);
        formData.append('_method', 'PATCH');

        const res = await fetch(`${API_BASE}/api/profile`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to update profile');
      } else {
        await patchJSON('/profile', {
          name: form.name.trim(),
          resort_name: form.resort_name.trim(),
          store_name: form.store_name.trim(),
          phone: form.phone.trim(),
          facebook_link: form.facebook_link.trim(),
          instagram_link: form.instagram_link.trim(),
          address: form.address.trim(),
          barangay: form.barangay.trim(),
          description: form.description.trim(),
        });
      }

      await showSuccessAlert('Profile Updated!', 'Your profile has been saved.');
      const refreshed = await fetchProfile();
      setAvatarFile(null);
      // Update currentUser in AppContext so Navbar reflects new avatar immediately
      if (refreshed) {
        setCurrentUser({
          id: refreshed.id,
          name: refreshed.name,
          email: refreshed.email,
          role: refreshed.role,
          avatar: refreshed.avatar ?? null,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.password || !pwForm.password_confirmation) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (pwForm.password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwForm.password !== pwForm.password_confirmation) {
      toast.error('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await postJSON('/profile/change-password', {
        current_password: pwForm.current_password,
        password: pwForm.password,
        password_confirmation: pwForm.password_confirmation,
      });
      await showSuccessAlert('Password Changed!', 'Your password has been updated successfully.');
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const getRoleIcon = () => {
    switch (userType) {
      case 'enterprise': return <Store className="h-6 w-6 text-pink-600" />;
      case 'resort': return <Hotel className="h-6 w-6 text-green-600" />;
      case 'admin': return <Shield className="h-6 w-6 text-purple-600" />;
      default: return <User className="h-6 w-6 text-blue-600" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (userType) {
      case 'enterprise': return 'bg-pink-100 text-pink-700';
      case 'resort': return 'bg-green-100 text-green-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (profile?.avatar) {
      return profile.avatar.startsWith('http')
        ? profile.avatar
        : `${API_BASE}${profile.avatar}`;
    }
    return null;
  };

  if (!userType || !currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="mb-4">Please Login to View Profile</h2>
        <Link to="/select-role" className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Login Now
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        My Profile
      </h1>

      {/* Profile Card Header */}
      <div className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/10" />

        {/* Avatar + Role */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            {/* Avatar */}
            <div className="relative">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()!}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-white shadow-md flex items-center justify-center">
                  {getRoleIcon()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow">
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mb-1">
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              {profile?.resort_name && userType === 'resort' && (
                <p className="text-sm font-semibold text-primary">{profile.resort_name}</p>
              )}
              {profile?.store_name && userType === 'enterprise' && (
                <p className="text-sm font-semibold text-primary">{profile.store_name}</p>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getRoleBadgeColor()}`}>
                {userType}
              </span>
            </div>
          </div>

          {/* Read-only info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {profile?.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" /> {profile.email}
              </span>
            )}
            {profile?.barangay && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {profile.barangay}, Mansalay
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white border-2 border-primary/20 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 mb-4">Edit Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name (Owner) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              required
            />
          </div>

          {userType === 'resort' && (
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Hotel className="h-4 w-4 text-primary" /> Resort / Accommodation Name
              </label>
              <input
                type="text"
                value={form.resort_name}
                onChange={(e) => setForm(f => ({ ...f, resort_name: e.target.value }))}
                placeholder="e.g. Paradise Cove Beach Resort"
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>
          )}

          {userType === 'enterprise' && (
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Store className="h-4 w-4 text-primary" /> Store / Business Name
              </label>
              <input
                type="text"
                value={form.store_name}
                onChange={(e) => setForm(f => ({ ...f, store_name: e.target.value }))}
                placeholder="e.g. Mansalay Handicrafts & Weaving"
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <Phone className="h-4 w-4" /> Phone Number (Call Direct)
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="09123456789"
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Barangay
            </label>
            <input
              type="text"
              value={form.barangay}
              onChange={(e) => setForm(f => ({ ...f, barangay: e.target.value }))}
              placeholder="e.g. Poblacion"
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <span className="font-bold text-blue-600">FB</span> Facebook Page URL / Link
            </label>
            <input
              type="text"
              value={form.facebook_link}
              onChange={(e) => setForm(f => ({ ...f, facebook_link: e.target.value }))}
              placeholder="e.g. facebook.com/yourbusiness"
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <span className="font-bold text-pink-600">IG</span> Instagram Profile URL / Link
            </label>
            <input
              type="text"
              value={form.instagram_link}
              onChange={(e) => setForm(f => ({ ...f, instagram_link: e.target.value }))}
              placeholder="e.g. instagram.com/yourbusiness"
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Street, Building, etc."
            className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
          />
        </div>

        {(userType === 'enterprise' || userType === 'resort') && (
          <div>
            <label className="block text-sm font-medium mb-1">Business Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Tell customers about your business..."
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white border-2 border-primary/20 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Change Password
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <div className="relative">
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={pwForm.current_password}
              onChange={(e) => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="Enter current password"
              className="w-full px-4 py-2.5 pr-10 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
            <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNewPw ? 'text' : 'password'}
              value={pwForm.password}
              onChange={(e) => setPwForm(f => ({ ...f, password: e.target.value }))}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 pr-10 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
            <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPw ? 'text' : 'password'}
              value={pwForm.password_confirmation}
              onChange={(e) => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))}
              placeholder="Repeat new password"
              className="w-full px-4 py-2.5 pr-10 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
            <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pwSaving}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <Lock className="h-4 w-4" />
          {pwSaving ? 'Changing...' : 'Change Password'}
        </button>
      </form>

      {/* Role-specific quick links */}
      <div className="mt-6 bg-white border-2 border-primary/20 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Quick Links</h3>
        <div className="space-y-2">
          {userType === 'tourist' && (
            <>
              <Link to="/itinerary" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>My Trip Itineraries</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link to="/attractions" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>Explore Tourist Attractions</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link to="/products" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>Browse Local Products</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            </>
          )}
          {userType === 'enterprise' && (
            <>
              <Link to="/enterprise/profile" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>Manage Promotional Products</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link to="/enterprise/profile/setup" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>Store Logo & Banner</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            </>
          )}
          {userType === 'resort' && (
            <>
              <Link to="/resort/profile" className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm">
                <span>Manage Resort Profile</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
