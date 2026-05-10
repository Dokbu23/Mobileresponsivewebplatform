import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { showRegistrationSuccess } from '../../lib/sweetAlert';

export function ResortRegistration() {
  const navigate = useNavigate();
  const { setUserType } = useApp();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    resortName: '',
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
    facilities: '',
    priceRange: '',
    rooms: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.resortName || !formData.ownerName || !formData.email || !formData.phone || 
        !formData.password || !formData.confirmPassword || !formData.address || !formData.barangay || 
        !formData.description || !formData.rooms || !formData.priceRange) {
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
          name: formData.resortName,
          email: formData.email,
          password: formData.password,
          role: 'resort',
          phone: formData.phone,
          address: `${formData.address}, ${formData.barangay}, ${formData.city}, ${formData.province}`,
          barangay: formData.barangay,
          description: formData.description,
          owner_name: formData.ownerName,
          facilities: formData.facilities,
          price_range: formData.priceRange,
          rooms: formData.rooms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect to email verification page
      navigate('/resort/verify-email', {
        state: {
          email: formData.email,
          role: 'resort',
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image type (PNG, JPG only)`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} exceeds 10MB size limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add new files to existing ones
    setSelectedImages(prev => [...prev, ...validFiles]);

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${validFiles.length} image(s) added`);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Hotel className="h-6 w-6 text-primary" />
          </div>
          <h1>Resort Registration</h1>
        </div>
        <p className="text-muted-foreground">
          Register your resort with DiscoverMansalay to reach more tourists
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Resort Name *</label>
              <input
                type="text"
                name="resortName"
                value={formData.resortName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter resort name"
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
              <label className="block text-sm mb-2">Address *</label>
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

        {/* Resort Details */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Resort Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Describe your resort, amenities, and unique features"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Number of Rooms *</label>
                <input
                  type="number"
                  name="rooms"
                  value={formData.rooms}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="e.g., 20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Price Range *</label>
                <select
                  name="priceRange"
                  value={formData.priceRange}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  required
                >
                  <option value="">Select price range</option>
                  <option value="budget">Budget (₱1,000 - ₱2,000)</option>
                  <option value="mid">Mid-range (₱2,000 - ₱4,000)</option>
                  <option value="luxury">Luxury (₱4,000+)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Facilities & Amenities</label>
              <input
                type="text"
                name="facilities"
                value={formData.facilities}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="e.g., Pool, Restaurant, WiFi, Parking"
              />
            </div>
          </div>
        </div>

        {/* Photos Upload */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Photos</h2>
          
          {/* Upload Area */}
          <label className="block border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG up to 10MB (Multiple files allowed)
            </p>
          </label>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-center mt-1 text-muted-foreground truncate">
                    {selectedImages[index]?.name}
                  </p>
                </div>
              ))}
            </div>
          )}
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
