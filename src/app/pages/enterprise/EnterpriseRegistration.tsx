import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Store, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { showRegistrationSuccess } from '../../lib/sweetAlert';

export function EnterpriseRegistration() {
  const navigate = useNavigate();
  const { setUserType } = useApp();
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    barangay: '',
    city: 'Mansalay', // Locked to Mansalay
    province: 'Oriental Mindoro', // Locked to Oriental Mindoro
    description: '',
    category: '',
    registrationNumber: '',
  });
  const [businessPermitFile, setBusinessPermitFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.businessName || !formData.ownerName || !formData.email || !formData.phone || 
        !formData.password || !formData.confirmPassword || !formData.address || !formData.barangay || 
        !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Call registration API
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: formData.businessName,
          email: formData.email,
          password: formData.password,
          role: 'enterprise',
          phone: formData.phone,
          address: `${formData.address}, ${formData.barangay}, ${formData.city}, ${formData.province}`,
          barangay: formData.barangay,
          description: formData.description,
          owner_name: formData.ownerName,
          category: formData.category,
          registration_number: formData.registrationNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect to email verification page
      navigate('/enterprise/verify-email', {
        state: {
          email: formData.email,
          role: 'enterprise',
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1>Enterprise Registration</h1>
        </div>
        <p className="text-muted-foreground">
          Register your business with DiscoverMansalay to showcase your products
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter business name"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Owner Name *</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter owner name"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="+63 912 345 6789"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Create a password"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Re-enter password"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Business Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Street, House/Unit Number"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Barangay *</label>
              <select
                name="barangay"
                value={formData.barangay}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                required
              >
                <option value="">Select Barangay</option>
                <optgroup label="A - D">
                  <option value="B. Del Mundo">B. Del Mundo</option>
                  <option value="Balugo">Balugo</option>
                  <option value="Bonbon">Bonbon</option>
                  <option value="Budburan">Budburan</option>
                  <option value="Cabalwa">Cabalwa</option>
                  <option value="Don Pedro">Don Pedro</option>
                </optgroup>
                <optgroup label="M - P">
                  <option value="Maliwanag">Maliwanag</option>
                  <option value="Manaul">Manaul</option>
                  <option value="Panaytayan">Panaytayan</option>
                  <option value="Poblacion">Poblacion</option>
                </optgroup>
                <optgroup label="R - S">
                  <option value="Roma">Roma</option>
                  <option value="Santa Brigida (Sta. Brigida)">Santa Brigida (Sta. Brigida)</option>
                  <option value="Santa Maria">Santa Maria</option>
                  <option value="Santa Teresita">Santa Teresita</option>
                </optgroup>
                <optgroup label="V - W">
                  <option value="Villa Celestial">Villa Celestial</option>
                  <option value="Wasig">Wasig</option>
                  <option value="Waygan">Waygan</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">City/Municipality *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Mansalay"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Province</label>
              <input
                type="text"
                name="province"
                value={formData.province}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Oriental Mindoro"
                disabled
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Business Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Business Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                required
              >
                <option value="">Select category</option>
                <option value="handicrafts">Handicrafts</option>
                <option value="food">Food & Beverages</option>
                <option value="clothing">Clothing & Textiles</option>
                <option value="souvenirs">Souvenirs & Gifts</option>
                <option value="agriculture">Agricultural Products</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Business Registration Number</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="DTI/SEC Registration Number (if applicable)"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Business Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Describe your business, products, and what makes you unique"
                required
              />
            </div>
          </div>
        </div>

        {/* Documents Upload */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Business Documents</h2>
          <div className="space-y-4">
            <label className="block border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Check file size (10MB limit)
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('File size must be less than 10MB');
                      return;
                    }
                    setBusinessPermitFile(file);
                    toast.success('File uploaded successfully');
                  }
                }}
                className="hidden"
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Upload Business Permits & Licenses
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, PNG, JPG up to 10MB
              </p>
            </label>

            {/* Display uploaded file */}
            {businessPermitFile && (
              <div className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{businessPermitFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(businessPermitFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBusinessPermitFile(null);
                    toast.success('File removed');
                  }}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Submit Registration
          </button>
        </div>
      </form>
    </div>
  );
}
