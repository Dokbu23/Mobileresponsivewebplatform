import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Store, Upload } from 'lucide-react';
import { API_BASE, getAuthToken } from '../../lib/api';
import { toast } from 'sonner';
import { showSuccessAlert } from '../../lib/sweetAlert';

export function EnterpriseProfileSetup() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logoFile && !bannerFile) {
      toast.error('Please upload at least a logo or banner image');
      return;
    }

    setSaving(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      if (storeName.trim()) {
        formData.append('store_name', storeName.trim());
      }
      if (logoFile) formData.append('logo', logoFile);
      if (bannerFile) formData.append('banner', bannerFile);

      const res = await fetch(`${API_BASE}/api/enterprise-profile/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to set up store profile');
      }

      await showSuccessAlert('Store Profile Set Up!', 'Your store is now visible to tourists.');
      navigate('/enterprise/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save store profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Set Up Your Store</h1>
        <p className="text-muted-foreground">
          Complete your store profile so tourists can find and visit your shop
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-primary/20 rounded-lg p-6 space-y-6">
        {/* Store Name Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Shop / Business Name</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. AWATI Shop, Mansalay Crafts"
            className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Leave blank to use the business name you entered during registration.</p>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Store Logo <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary/50" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Banner Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Store Banner</label>
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner preview" className="w-full h-32 object-cover rounded-lg border-2 border-primary/20 mb-2" />
          ) : (
            <div className="w-full h-32 rounded-lg bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center mb-2">
              <div className="text-center">
                <Upload className="h-6 w-6 text-primary/50 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Upload a banner image</span>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBannerChange}
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || (!logoFile && !bannerFile)}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
        >
          {saving ? 'Setting up...' : 'Complete Store Setup'}
        </button>
      </form>
    </div>
  );
}
