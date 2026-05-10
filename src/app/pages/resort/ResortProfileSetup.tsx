import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, Image as ImageIcon, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { getJSON, postJSON } from '../../lib/api';

const AMENITIES = [
  'WiFi',
  'Pool',
  'Restaurant',
  'Parking',
  'Air Conditioning',
  'Breakfast',
  'Beach Access',
  'Gym',
  'Spa',
  'Shuttle',
];

type Step = 1 | 2 | 3 | 4;

export function ResortProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  const [resortName, setResortName] = useState('');
  const [resortDescription, setResortDescription] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [facilities, setFacilities] = useState('');
  const [policies, setPolicies] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getJSON('/resort-profile');
        if (profile?.resort_is_setup) {
          navigate('/resort/profile');
        }
      } catch {
        // Ignore; user may not be authenticated yet.
      }
    })();
  }, [navigate]);

  const canProceedStep1 = resortName.trim() !== '' && resortDescription.trim() !== '' && Number(pricePerNight) > 0;
  const canProceedStep2 = images.length > 0;

  const totalImagesLabel = useMemo(() => `${images.length} of 10 images`, [images.length]);

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;

    const nextFiles: File[] = [];
    let invalidType = 0;
    let invalidSize = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        invalidType += 1;
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        invalidSize += 1;
        return;
      }
      nextFiles.push(file);
    });

    if (invalidType > 0) {
      toast.error('Only image files are allowed');
    }
    if (invalidSize > 0) {
      toast.error('Some images exceed the 5MB limit');
    }

    const combined = [...images, ...nextFiles].slice(0, 10);
    setImages(combined);
    setImagePreviews(combined.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    const nextFiles = images.filter((_, i) => i !== index);
    setImages(nextFiles);
    setImagePreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async () => {
    if (!canProceedStep1 || !canProceedStep2) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('resort_name', resortName.trim());
      formData.append('resort_description', resortDescription.trim());
      formData.append('resort_price_per_night', pricePerNight);
      // Send amenities as form-array entries so Laravel receives them as an array
      if (amenities.length > 0) {
        amenities.forEach((amenity) => formData.append('resort_amenities[]', amenity));
      }

      if (facilities.trim()) {
        formData.append('resort_facilities', facilities.trim());
      }

      if (policies.trim()) {
        formData.append('resort_policies', policies.trim());
      }

      images.forEach((image) => formData.append('images[]', image));

      await postJSON('/resort-profile/setup', formData, true);
      toast.success('Resort profile setup completed');
      navigate('/resort/profile');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to setup resort profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/resort/dashboard')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="mb-2">Set Up Your Resort Profile</h1>
            <p className="text-muted-foreground">
              Complete your resort details so tourists can discover and book your property.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>1</span>
            <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>2</span>
            <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>3</span>
            <span className={`px-3 py-1 rounded-full ${step >= 4 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>4</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Resort Name *</label>
              <input
                value={resortName}
                onChange={(e) => setResortName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter resort name"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Description *</label>
              <textarea
                value={resortDescription}
                onChange={(e) => setResortDescription(e.target.value)}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[140px]"
                placeholder="Describe your resort, location highlights, and unique features"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Price Per Night (PHP) *</label>
              <input
                type="number"
                min="1"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="e.g. 2500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="mb-1">Resort Images *</h3>
                <p className="text-sm text-muted-foreground">Upload at least one image. Max 10 images.</p>
              </div>
              <span className="text-sm text-muted-foreground">{totalImagesLabel}</span>
            </div>
            <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="resort-images"
                onChange={(e) => handleAddImages(e.target.files)}
              />
              <label htmlFor="resort-images" className="cursor-pointer inline-flex items-center gap-2 text-primary">
                <Upload className="h-4 w-4" />
                Add Photos
              </label>
              <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, WebP up to 5MB each.</p>
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={preview} className="relative rounded-lg overflow-hidden border">
                    <img src={preview} alt="Resort" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      amenities.includes(amenity)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Facilities (optional)</label>
              <textarea
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[120px]"
                placeholder="List facilities like cottages, function hall, spa, etc."
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Policies (optional)</label>
              <textarea
                value={policies}
                onChange={(e) => setPolicies(e.target.value)}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[120px]"
                placeholder="Check-in time, cancellation policy, house rules, etc."
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3>Review & Submit</h3>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>Name:</strong> {resortName}</p>
                <p><strong>Price per night:</strong> ₱{pricePerNight}</p>
                <p><strong>Description:</strong> {resortDescription}</p>
                <p><strong>Amenities:</strong> {amenities.length ? amenities.join(', ') : 'None selected'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {imagePreviews.length > 0 ? (
                imagePreviews.map((preview) => (
                  <div key={preview} className="rounded-lg overflow-hidden border">
                    <img src={preview} alt="Resort" className="w-full h-24 object-cover" />
                  </div>
                ))
              ) : (
                <div className="col-span-2 md:col-span-4 flex items-center gap-3 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                  No images uploaded
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
          <button
            type="button"
            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
            className="px-5 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            disabled={step === 1}
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !canProceedStep1) {
                  toast.error('Please complete all required fields');
                  return;
                }
                if (step === 2 && !canProceedStep2) {
                  toast.error('Please upload at least one image');
                  return;
                }
                setStep((prev) => ((prev + 1) as Step));
              }}
              className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-70"
            >
              <CheckCircle className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
