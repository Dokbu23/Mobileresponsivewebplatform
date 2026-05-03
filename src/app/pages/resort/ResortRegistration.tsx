import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

export function ResortRegistration() {
  const navigate = useNavigate();
  const { setUserType } = useApp();
  const [formData, setFormData] = useState({
    resortName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    facilities: '',
    priceRange: '',
    rooms: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserType('resort');
    toast.success('Registration submitted! Awaiting admin approval.');
    setTimeout(() => {
      navigate('/resort/dashboard');
    }, 1500);
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
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Complete address"
                required
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
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG up to 10MB (Multiple files allowed)
            </p>
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
