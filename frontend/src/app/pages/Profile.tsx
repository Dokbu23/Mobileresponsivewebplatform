import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Store, Hotel, Shield, Camera, Save, Lock, Eye, EyeOff, Loader2, Edit3, Facebook, Instagram, Twitter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getJSON, patchJSON, postJSON, API_BASE, getAuthToken, formatImageUrl } from '../lib/api';
import { toast } from 'sonner';
import { showSuccessAlert } from '../lib/sweetAlert';
import Swal from 'sweetalert2';
import { Link } from 'react-router';

export function Profile() {
  const { currentUser, userType, setCurrentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  // Tourism Contact Settings state (for Admin)
  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    address: '',
    facebook: '',
    instagram: '',
    twitter: '',
  });
  const [savingContact, setSavingContact] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    fetchProfile();
    if (userType === 'admin') {
      fetchContactSettings();
    }
  }, [userType]);

  const fetchContactSettings = async () => {
    try {
      const data = await getJSON('/site-settings/contact');
      if (data) {
        setContactForm({
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          twitter: data.twitter || '',
        });
      }
    } catch {
      // quiet fallback
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await postJSON('/site-settings/contact', contactForm);
      const savedData = res?.settings || contactForm;

      // Update localStorage immediately
      try {
        localStorage.setItem('discover-mansalay:site-contact', JSON.stringify(savedData));
      } catch {}

      // Dispatch global event so Footer updates instantly with NO REFRESH needed!
      window.dispatchEvent(new CustomEvent('site-settings:contact-updated', { detail: savedData }));

      await showSuccessAlert('Saved Successfully! 🎉', 'Official tourism contact and social links have been updated in the website footer.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contact settings');
    } finally {
      setSavingContact(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await getJSON('/me');
      const user = data.user ?? data;
      setProfile(user);
      if (user && user.id) {
        setCurrentUser(user);
      }
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB.');
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload profile picture');
      }

      const newAvatar = data.avatar || data.user?.avatar;
      const updatedUser = data.user || { ...currentUser, avatar: newAvatar };

      // Update local profile & global AppContext
      setProfile((prev: any) => ({ ...prev, avatar: newAvatar }));
      setCurrentUser(updatedUser);
      setAvatarPreview(null);
      setAvatarFile(null);

      // Force refresh stored user in localStorage so page reload always has it
      localStorage.setItem('discover-mansalay:currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('discover-mansalay:user', JSON.stringify(updatedUser));

      toast.success('Profile picture updated successfully! 📸', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image. Please try again.', { id: toastId });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (userType === 'tourist' && form.phone && form.phone.trim()) {
      const cleanPhone = form.phone.trim();
      if (!/^09\d{9}$/.test(cleanPhone)) {
        toast.error('Ang Phone Number ay dapat 11 digits at nagsisimula sa 09 (Halimbawa: 09123456789)');
        return;
      }
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

  // Change Email with SweetAlert & 6-digit Verification Code
  const handleChangeEmail = async () => {
    const currentEmail = profile?.email || currentUser?.email || '';

    // Step 1: Prompt for New Email Address with SweetAlert
    const { value: newEmailResult } = await Swal.fire({
      title: 'Change Gmail / Email',
      html: `
        <div class="text-left text-xs text-gray-600 mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          Kasalukuyang Email: <strong class="text-gray-900">${currentEmail}</strong>
        </div>
        <p class="text-xs text-gray-600 mb-2 text-left leading-relaxed">
          Ilagay ang iyong bagong Gmail / Email address. Padadalhan ka ng <strong>6-digit verification code</strong> bago ito opisyal na mapalitan:
        </p>
      `,
      input: 'email',
      inputPlaceholder: 'bagong.email@gmail.com',
      showCancelButton: true,
      confirmButtonText: 'Send Verification Code 📩',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ec4899',
      cancelButtonColor: '#9ca3af',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return 'Pakilagay ang iyong bagong email address!';
        }
        const cleaned = val.trim().toLowerCase();
        if (cleaned === currentEmail.toLowerCase()) {
          return 'Kailangan magkaiba ang bagong email sa kasalukuyang email!';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          return 'Pakilagay ang wastong email address format!';
        }
        return null;
      },
      preConfirm: async (val) => {
        try {
          const res = await postJSON('/profile/change-email/send-code', {
            new_email: val.trim().toLowerCase(),
          });
          return { newEmail: val.trim().toLowerCase(), message: res?.message };
        } catch (err: any) {
          Swal.showValidationMessage(err?.message || 'Hindi maipadala ang verification code. Pakisubukan muli.');
          return false;
        }
      },
    });

    if (!newEmailResult) return;

    const targetNewEmail = typeof newEmailResult === 'object' ? newEmailResult.newEmail : newEmailResult;

    // Step 2: Prompt for 6-digit Verification Code with SweetAlert
    const { value: verificationResult } = await Swal.fire({
      title: 'Enter Verification Code',
      html: `
        <div class="text-center text-xs text-gray-600 mb-3">
          Naipadala na ang 6-digit verification code sa:<br/>
          <strong class="text-pink-600 text-sm tracking-wide font-bold">${targetNewEmail}</strong>
        </div>
        <p class="text-[11px] text-gray-400 mb-1">
          Pakitingnan ang iyong inbox o Spam/Junk folder.
        </p>
      `,
      input: 'text',
      inputPlaceholder: '000000',
      inputAttributes: {
        maxlength: '6',
        inputmode: 'numeric',
        style: 'text-align: center; font-family: monospace; font-size: 1.75rem; letter-spacing: 0.3em; font-weight: 800; padding: 0.5rem;',
      },
      showCancelButton: true,
      confirmButtonText: 'Verify & Change Email ✅',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ec4899',
      cancelButtonColor: '#9ca3af',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      inputValidator: (val) => {
        if (!val || val.trim().length !== 6) {
          return 'Pakilagay ang eksaktong 6-digit verification code!';
        }
        return null;
      },
      preConfirm: async (code) => {
        try {
          const res = await postJSON('/profile/change-email/verify', {
            new_email: targetNewEmail,
            code: code.trim(),
          });
          return res;
        } catch (err: any) {
          Swal.showValidationMessage(err?.message || 'Maling verification code o nag-expire na.');
          return false;
        }
      },
    });

    if (!verificationResult) return;

    // Step 3: Success SweetAlert Modal & Synchronize State
    await Swal.fire({
      icon: 'success',
      title: 'Email Changed Successfully! 🎉',
      html: `
        <p class="text-sm text-gray-700">
          Matagumpay nang napalitan ang iyong email sa:<br/>
          <strong class="text-emerald-600 font-bold text-base">${targetNewEmail}</strong>
        </p>
      `,
      confirmButtonColor: '#ec4899',
      confirmButtonText: 'Ayos!',
    });

    // Update state & localStorage
    setProfile((prev: any) => ({ ...(prev || {}), email: targetNewEmail }));
    if (currentUser) {
      const updatedUser = { ...currentUser, email: targetNewEmail };
      setCurrentUser(updatedUser);
      localStorage.setItem('discover-mansalay:currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('discover-mansalay:user', JSON.stringify(updatedUser));
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
    const raw = profile?.avatar || currentUser?.avatar;
    if (raw) {
      return formatImageUrl(raw);
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

  if (userType === 'admin') {
    return (
      <div className="min-h-screen bg-[#FFF8FA] py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* PAGE TITLE & SUBTITLE */}
          <div>
            <h1 className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
              My Profile
            </h1>
            <p className="text-sm text-[#4B5563] mt-1 font-normal">
              Manage your account information and website contact details.
            </p>
          </div>

          {/* PROFILE SUMMARY CARD (Full-width at the top) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
              {/* Large circular profile photo with overlapping camera button */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#FFE8F0] bg-white flex items-center justify-center overflow-hidden shadow-xs">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()!}
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#FFE8F0]/50 flex items-center justify-center text-[#FF3D7F]">
                      <User className="w-12 h-12 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}

                <label
                  className={`absolute bottom-0.5 right-0.5 bg-[#FF3D7F] hover:bg-[#E62E6E] text-white rounded-full p-2 cursor-pointer transition-colors shadow-sm z-20 ${
                    uploadingAvatar ? 'pointer-events-none opacity-50' : ''
                  }`}
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Admin name, role badge, email and description */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1F2937]">
                    {profile?.name || 'Administrator'}
                  </h2>
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FFE8F0] text-[#FF3D7F]">
                    Administrator
                  </span>
                </div>
                <p className="text-sm text-[#4B5563] font-medium mb-1.5">
                  {profile?.email || 'admin@discovermansalay.gov.ph'}
                </p>
                <p className="text-xs text-[#6B7280] leading-relaxed max-w-2xl">
                  Manage municipal tourism management and website contact details.
                </p>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN LAYOUT UNDERNEATH */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ── LEFT COLUMN: Personal Information & Change Password ── */}
            <div className="space-y-8">
              {/* PERSONAL INFORMATION CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#1F2937]">
                    Personal Information
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
                    Update your personal account details.
                  </p>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <User className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <User className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={form.store_name}
                        onChange={(e) => setForm(f => ({ ...f, store_name: e.target.value }))}
                        placeholder="Enter username"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Mail className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="email"
                        value={form.resort_name}
                        onChange={(e) => setForm(f => ({ ...f, resort_name: e.target.value }))}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Role (Read-only / disabled) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Role
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Shield className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value=""
                        placeholder="Administrator"
                        disabled
                        readOnly
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/80 text-gray-500 cursor-not-allowed outline-none text-xs placeholder:text-gray-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Solid Pink Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 bg-[#FF3D7F] hover:bg-[#E62E6E] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Save className="w-4 h-4 stroke-[2]" />
                      )}
                      <span>Update Information</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* CHANGE PASSWORD CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#1F2937]">
                    Change Password
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
                    Update your account password for better security.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Lock className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={pwForm.current_password}
                        onChange={(e) => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                        placeholder="Enter current password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(v => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showCurrentPw ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Lock className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={pwForm.password}
                        onChange={(e) => setPwForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Lock className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={pwForm.password_confirmation}
                        onChange={(e) => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))}
                        placeholder="Confirm new password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(v => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
                      </button>
                    </div>
                  </div>

                  {/* Solid Pink Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="w-full py-3 bg-[#FF3D7F] hover:bg-[#E62E6E] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {pwSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Lock className="w-4 h-4 stroke-[2]" />
                      )}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Public Contact & Social Links ── */}
            <div className="space-y-8">
              {/* PUBLIC CONTACT & SOCIAL LINKS CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#1F2937]">
                    Public Contact & Social Links (Footer)
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
                    Update the official contact information and social media links that will appear in the website footer.
                  </p>
                </div>

                <form onSubmit={handleSaveContact} className="space-y-4">
                  {/* Official Contact Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Official Contact Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Mail className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm(c => ({ ...c, email: e.target.value }))}
                        placeholder="Enter official contact email"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Official Contact / Hotline Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Official Contact / Hotline Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Phone className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm(c => ({ ...c, phone: e.target.value }))}
                        placeholder="Enter official hotline number"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Facebook Page Link */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Facebook Page Link
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Facebook className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={contactForm.facebook}
                        onChange={(e) => setContactForm(c => ({ ...c, facebook: e.target.value }))}
                        placeholder="Enter Facebook page URL"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Instagram Page Link */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Instagram Page Link
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Instagram className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={contactForm.instagram}
                        onChange={(e) => setContactForm(c => ({ ...c, instagram: e.target.value }))}
                        placeholder="Enter Instagram page URL"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Twitter / X Link */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                      Twitter / X Link
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF3D7F]">
                        <Twitter className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        value={contactForm.twitter}
                        onChange={(e) => setContactForm(c => ({ ...c, twitter: e.target.value }))}
                        placeholder="Enter Twitter / X page URL"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF3D7F] focus:ring-2 focus:ring-[#FFE8F0] outline-none text-xs text-[#1F2937] placeholder:text-gray-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Solid Pink Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingContact}
                      className="w-full py-3 bg-[#FF3D7F] hover:bg-[#E62E6E] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {savingContact ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Save className="w-4 h-4 stroke-[2]" />
                      )}
                      <span>Update Contact Details</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
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
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-gray-50"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-white shadow-md flex items-center justify-center">
                  {getRoleIcon()}
                </div>
              )}

              {/* Uploading Spinner Overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white z-10 border-4 border-white">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}

              <label 
                className={`absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow z-20 ${
                  uploadingAvatar ? 'pointer-events-none opacity-50' : ''
                }`}
                title="Change profile picture"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
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

        {userType === 'tourist' ? (
          /* ── TOURIST FORM: ONLY NAME, GMAIL, PH 11-DIGIT PHONE, AND ADDRESS ── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-pink-500" /> Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-pink-500" /> Gmail / Email Address
                  </label>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Change Email
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    value={profile?.email || currentUser?.email || ''}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-gray-50 text-gray-700 font-medium rounded-lg cursor-not-allowed outline-none text-sm pr-24"
                    title="Click Change Email to update your registered email address"
                  />
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="absolute right-1.5 px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 border border-pink-200 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-pink-500" /> Phone Number
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    {form.phone?.length || 0}/11
                  </span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setForm(f => ({ ...f, phone: cleaned }));
                  }}
                  placeholder="09123456789"
                  className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm font-mono tracking-wider transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-pink-500" /> Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street, Barangay, City/Municipality"
                  className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm transition-all"
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── BUSINESS FORM: RESORT & ENTERPRISE ACCOUNTS ── */
          <div className="space-y-4">
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
                <span>Manage Rooms</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
