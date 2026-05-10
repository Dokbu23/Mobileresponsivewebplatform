import { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, Edit, Calendar, DollarSign, Users, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle, Upload, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { API_BASE, deleteJSON, getJSON, patchJSON, postJSON, getAuthToken } from '../../lib/api';
import { showPaymentMethodSuccess, showProductSuccess, showStatusUpdateSuccess } from '../../lib/sweetAlert';

interface ApiBooking {
  id: number;
  accommodation_snapshot: {
    name?: string;
    pricePerNight?: number;
    price_per_night?: number;
  };
  check_in: string;
  check_out: string;
  total: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  payment_method: 'online' | 'otc' | null;
}

interface BookingRow {
  id: number;
  accommodation: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  paymentMethod: 'online' | 'otc' | null;
}

interface Event {
  id: number;
  name: string;
  location: string | null;
  category: string | null;
  image: string | null;
  date: string | null;
  time: string | null;
  capacity: string | null;
  description: string | null;
  full_description: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Festival', 'Concert', 'Workshop', 'Sports', 'Cultural', 'Other'];
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

export function ResortProfile() {
  const { currentUser } = useApp();
  const [profileLoading, setProfileLoading] = useState(true);
  const [resortProfile, setResortProfile] = useState<any>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    resort_name: '',
    resort_description: '',
    resort_price_per_night: '',
    resort_amenities: [] as string[],
    resort_facilities: '',
    resort_policies: '',
  });
  const [profileImages, setProfileImages] = useState<File[]>([]);
  const [profileImagePreviews, setProfileImagePreviews] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  // Event management state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    category: '',
    date: '',
    time: '',
    capacity: '',
    description: '',
    full_description: '',
  });
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);

  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'gcash',
    name: '',
    account_number: '',
    account_name: '',
  });
  const [receipts, setReceipts] = useState<any[]>([]);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [showAttractionForm, setShowAttractionForm] = useState(false);
  const [attractionSubmitting, setAttractionSubmitting] = useState(false);
  const [attractionForm, setAttractionForm] = useState({
    name: '',
    location: '',
    category: '',
    description: '',
    full_description: '',
  });
  const [attractionImageFile, setAttractionImageFile] = useState<File | null>(null);
  const [attractionImagePreview, setAttractionImagePreview] = useState<string | null>(null);

  const loadResortProfile = async () => {
    try {
      const profile = await getJSON('/resort-profile');
      setResortProfile(profile);
      setProfileForm({
        resort_name: profile?.resort_name ?? '',
        resort_description: profile?.resort_description ?? '',
        resort_price_per_night: profile?.resort_price_per_night ? String(profile.resort_price_per_night) : '',
        resort_amenities: Array.isArray(profile?.resort_amenities) ? profile.resort_amenities : [],
        resort_facilities: profile?.resort_facilities ?? '',
        resort_policies: profile?.resort_policies ?? '',
      });

      const images = Array.isArray(profile?.resort_images) ? profile.resort_images : [];
      const resolved = images.map((img: string) =>
        String(img).startsWith('http') ? img : `${API_BASE}${img}`
      );
      setProfileImagePreviews(resolved);
    } catch {
      setResortProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchAttractions = async () => {
    try {
      const response = await getJSON('/attractions/my');
      setAttractions(Array.isArray(response) ? response : []);
    } catch {
      setAttractions([]);
    }
  };

  const handleAddAttraction = async () => {
    if (!attractionForm.name.trim()) {
      toast.error('Attraction name is required');
      return;
    }

    setAttractionSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', attractionForm.name.trim());
      if (attractionForm.location.trim()) formData.append('location', attractionForm.location.trim());
      if (attractionForm.category.trim()) formData.append('category', attractionForm.category.trim());
      if (attractionForm.description.trim()) formData.append('description', attractionForm.description.trim());
      if (attractionForm.full_description.trim()) formData.append('full_description', attractionForm.full_description.trim());
      if (attractionImageFile) formData.append('image', attractionImageFile);

      await postJSON('/attractions', formData, true);
      toast.success('Resort added as attraction');
      setShowAttractionForm(false);
      setAttractionForm({ name: '', location: '', category: '', description: '', full_description: '' });
      setAttractionImageFile(null);
      setAttractionImagePreview(null);
      await fetchAttractions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add attraction');
    } finally {
      setAttractionSubmitting(false);
    }
  };

  const handleRemoveAttraction = async (id: number) => {
    try {
      await deleteJSON(`/attractions/${id}`);
      toast.success('Attraction removed');
      await fetchAttractions();
    } catch {
      toast.error('Failed to remove attraction');
    }
  };

  const handleProfileImageAdd = (files: FileList | null) => {
    if (!files) return;
    const incoming: File[] = [];
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
      incoming.push(file);
    });

    if (invalidType > 0) {
      toast.error('Only image files are allowed');
    }
    if (invalidSize > 0) {
      toast.error('Some images exceed the 5MB limit');
    }

    const combined = [...profileImages, ...incoming].slice(0, 10);
    setProfileImages(combined);
    setProfileImagePreviews(combined.map((file) => URL.createObjectURL(file)));
  };

  const removeProfileImage = (index: number) => {
    const nextImages = profileImages.filter((_, i) => i !== index);
    setProfileImages(nextImages);
    setProfileImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
  };

  const toggleProfileAmenity = (amenity: string) => {
    setProfileForm((prev) => ({
      ...prev,
      resort_amenities: prev.resort_amenities.includes(amenity)
        ? prev.resort_amenities.filter((item) => item !== amenity)
        : [...prev.resort_amenities, amenity],
    }));
  };

  const handleSaveProfile = async () => {
    if (!profileForm.resort_name.trim() || !profileForm.resort_description.trim() || !profileForm.resort_price_per_night) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resort_name', profileForm.resort_name.trim());
      formData.append('resort_description', profileForm.resort_description.trim());
      formData.append('resort_price_per_night', profileForm.resort_price_per_night);
      // Send amenities as form-array entries so Laravel receives them as an array
      if (Array.isArray(profileForm.resort_amenities) && profileForm.resort_amenities.length > 0) {
        profileForm.resort_amenities.forEach((amenity) => formData.append('resort_amenities[]', amenity));
      }

      if (profileForm.resort_facilities.trim()) {
        formData.append('resort_facilities', profileForm.resort_facilities.trim());
      }
      if (profileForm.resort_policies.trim()) {
        formData.append('resort_policies', profileForm.resort_policies.trim());
      }

      profileImages.forEach((image) => formData.append('images[]', image));
      formData.append('_method', 'PUT');

      await postJSON('/resort-profile', formData, true);
      toast.success('Resort profile updated');
      setProfileEditMode(false);
      setProfileImages([]);
      await loadResortProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update resort profile');
    }
  };

  const bookingStatusFlow = {
    pending: 'confirmed' as const,
    confirmed: 'checked-in' as const,
    'checked-in': 'completed' as const,
    completed: null,
  };

  useEffect(() => {
    loadResortProfile();
    fetchAttractions();
  }, []);

  useEffect(() => {
    (async () => {
      // Fetch subscription status
      try {
        const statusResponse = await getJSON('/subscription/status');
        setSubscriptionStatus(statusResponse);
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }

      try {
        const bookingsResponse = await getJSON('/bookings');
        setBookings(
          Array.isArray(bookingsResponse)
            ? bookingsResponse.map((booking: ApiBooking) => ({
                id: booking.id,
                accommodation: booking.accommodation_snapshot?.name ?? 'Accommodation',
                checkIn: booking.check_in,
                checkOut: booking.check_out,
                total: Number(booking.total) || 0,
                status: booking.status,
                paymentMethod: booking.payment_method,
              }))
            : []
        );
      } catch {
        setBookings([]);
      }

      try {
        const eventsResponse = await getJSON('/events/my');
        setEvents(
          Array.isArray(eventsResponse)
            ? eventsResponse.map((event: any) => ({
                id: event.id,
                name: event.name || '',
                location: event.location || null,
                category: event.category || null,
                image: event.image || null,
                date: event.date || null,
                time: event.time || null,
                capacity: event.capacity || null,
                description: event.description || null,
                full_description: event.full_description || null,
                user_id: event.user_id || null,
                created_at: event.created_at || new Date().toISOString(),
                updated_at: event.updated_at || new Date().toISOString(),
              }))
            : []
        );
      } catch {
        setEvents([]);
      }

      setLoading(false);
    })();
  }, []);

  const stats = [
    { icon: Calendar, label: 'Total Bookings', value: bookings.length.toString(), color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: DollarSign, label: 'Revenue (Live)', value: `₱${bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0).toLocaleString()}`, color: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: Users, label: 'Stays Listed', value: resortProfile?.resort_is_setup ? '1' : '0', color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: TrendingUp, label: 'Occupancy Rate', value: `${resortProfile?.resort_is_setup ? Math.round((bookings.length / 1) * 100) : 0}%`, color: 'bg-pink-50', iconColor: 'text-pink-600' },
  ];

  const bookingSummary = useMemo(() => {
    const summary = new Map<string, number>();
    bookings.forEach(booking => {
      const name = (booking as any).accommodation_snapshot?.name ?? 'Accommodation';
      summary.set(name, (summary.get(name) ?? 0) + 1);
    });
    return Array.from(summary.entries()).map(([name, count]) => ({ name, count }));
  }, [bookings]);

  const handleUpdateBookingStatus = async (bookingId: string) => {
    const currentBooking = bookings.find(booking => `BKG-${String(booking.id).padStart(3, '0')}` === bookingId);
    if (!currentBooking) {
      return;
    }

    const nextStatus = bookingStatusFlow[currentBooking.status];
    if (!nextStatus) {
      return;
    }

    try {
      await patchJSON(`/bookings/${currentBooking.id}`, { status: nextStatus });
      setBookings(prev => prev.map(booking => (booking.id === currentBooking.id ? { ...booking, status: nextStatus } : booking)));
      await showStatusUpdateSuccess('booking', bookingId, nextStatus);
    } catch {
      toast.error('Failed to update booking');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-700 border-orange-300',
      confirmed: 'bg-green-100 text-green-700 border-green-300',
      completed: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return `px-3 py-1 rounded-full border text-sm ${styles[status as keyof typeof styles]}`;
  };

  // Payment Details Functions
  const fetchPaymentDetails = async () => {
    try {
      const response = await getJSON('/payment-details');
      setPaymentDetails(response.payment_details || []);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.name || !newPayment.account_number || !newPayment.account_name) {
      toast.error('Please fill all payment fields');
      return;
    }

    try {
      const updatedPayments = [...paymentDetails, { ...newPayment }];
      await patchJSON('/payment-details', { payment_details: updatedPayments });
      setPaymentDetails(updatedPayments);
      setNewPayment({ type: 'gcash', name: '', account_number: '', account_name: '' });
      setShowPaymentForm(false);
      await showPaymentMethodSuccess('added', newPayment.name || 'Payment method');
    } catch (error) {
      toast.error('Failed to add payment method');
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      const updatedPayments = paymentDetails.filter((_, i) => i !== index);
      await patchJSON('/payment-details', { payment_details: updatedPayments });
      setPaymentDetails(updatedPayments);
      await showPaymentMethodSuccess('deleted', 'Payment method');
    } catch (error) {
      toast.error('Failed to delete payment method');
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await getJSON('/payment-receipts');
      setReceipts(response || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const handleVerifyReceipt = async (receiptId: number, status: 'verified' | 'rejected', notes?: string) => {
    try {
      await patchJSON(`/payment-receipts/${receiptId}/verify`, { status, notes });
      await fetchReceipts();
      await showProductSuccess(status === 'verified' ? 'updated' : 'deleted', `receipt ${status}`);
    } catch (error) {
      toast.error(`Failed to ${status} receipt`);
    }
  };

  // Load payment details and receipts on component mount
  useEffect(() => {
    fetchPaymentDetails();
    fetchReceipts();
  }, []);

  // Event Management Functions
  const handleAddEvent = async () => {
    if (!newEvent.name.trim()) {
      toast.error('Event name is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newEvent.name);
      if (newEvent.location) formData.append('location', newEvent.location);
      if (newEvent.category) formData.append('category', newEvent.category);
      if (newEvent.date) formData.append('date', newEvent.date);
      if (newEvent.time) formData.append('time', newEvent.time);
      if (newEvent.capacity) formData.append('capacity', newEvent.capacity);
      if (newEvent.description) formData.append('description', newEvent.description);
      if (newEvent.full_description) formData.append('full_description', newEvent.full_description);
      if (eventImageFile) formData.append('image', eventImageFile);

      if (editingEventId) {
        formData.append('_method', 'PUT');
      }

      const baseUrl = 'http://localhost:8000';
      const url = editingEventId ? `${baseUrl}/api/events/${editingEventId}` : `${baseUrl}/api/events`;
      const method = 'POST';

      const token = getAuthToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        : { Accept: 'application/json' };
      const res = await fetch(url, { method, headers, body: formData });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorMsg = `HTTP ${res.status}`;
        if (contentType?.includes('application/json')) {
          try {
            const data = await res.json();
            errorMsg = data.message || data.error || JSON.stringify(data);
          } catch {
            errorMsg = await res.text().catch(() => errorMsg);
          }
        } else {
          errorMsg = await res.text().catch(() => errorMsg);
        }
        throw new Error(errorMsg);
      }

      await showProductSuccess(editingEventId ? 'updated' : 'added', newEvent.name);
      
      // Refresh events list
      const eventsResponse = await getJSON('/events/my');
      setEvents(
        Array.isArray(eventsResponse)
          ? eventsResponse.map((event: any) => ({
              id: event.id,
              name: event.name || '',
              location: event.location || null,
              category: event.category || null,
              image: event.image || null,
              date: event.date || null,
              time: event.time || null,
              capacity: event.capacity || null,
              description: event.description || null,
              full_description: event.full_description || null,
              user_id: event.user_id || null,
              created_at: event.created_at || new Date().toISOString(),
              updated_at: event.updated_at || new Date().toISOString(),
            }))
          : []
      );

      setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
      setEventImageFile(null);
      setEventImagePreview(null);
      setEditingEventId(null);
      setShowAddEvent(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setNewEvent({
      name: event.name,
      location: event.location || '',
      category: event.category || '',
      date: event.date || '',
      time: event.time || '',
      capacity: event.capacity || '',
      description: event.description || '',
      full_description: event.full_description || '',
    });
    setEventImagePreview(event.image ? getEventImageUrl(event.image) : null);
    setEventImageFile(null);
    setShowAddEvent(true);
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/api/events/${id}`, { 
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      await showProductSuccess('deleted');
      
      // Refresh events list
      const eventsResponse = await getJSON('/events/my');
      setEvents(
        Array.isArray(eventsResponse)
          ? eventsResponse.map((event: any) => ({
              id: event.id,
              name: event.name || '',
              location: event.location || null,
              category: event.category || null,
              image: event.image || null,
              date: event.date || null,
              time: event.time || null,
              capacity: event.capacity || null,
              description: event.description || null,
              full_description: event.full_description || null,
              user_id: event.user_id || null,
              created_at: event.created_at || new Date().toISOString(),
              updated_at: event.updated_at || new Date().toISOString(),
            }))
          : []
      );
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const getEventImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:8000${imagePath}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading resort data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
              <div>
                <h1>Resort Profile</h1>
                <p className="text-sm text-muted-foreground">{currentUser?.name ?? 'Live accommodation management'}</p>
              </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/resort/dashboard"
              className="px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {!profileLoading && resortProfile && !resortProfile.resort_is_setup && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="mb-1">Resort Profile Not Yet Setup</h3>
              <p className="text-sm text-yellow-800">
                Finish your resort profile to appear in the accommodations list.
              </p>
            </div>
            <Link
              to="/resort/profile/setup"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors inline-flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Setup Now
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Resort Profile Details</h2>
            <p className="text-sm text-muted-foreground">This profile is your bookable accommodation.</p>
          </div>
          <button
            onClick={() => setProfileEditMode((prev) => !prev)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            {profileEditMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {profileLoading ? (
          <div className="text-sm text-muted-foreground">Loading resort profile...</div>
        ) : profileEditMode ? (
          <div className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Resort Name *</label>
              <input
                value={profileForm.resort_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, resort_name: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Description *</label>
              <textarea
                value={profileForm.resort_description}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, resort_description: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[140px]"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Price Per Night (PHP) *</label>
              <input
                type="number"
                min="1"
                value={profileForm.resort_price_per_night}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, resort_price_per_night: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Amenities</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleProfileAmenity(amenity)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      profileForm.resort_amenities.includes(amenity)
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
              <label className="block text-sm mb-2">Facilities</label>
              <textarea
                value={profileForm.resort_facilities}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, resort_facilities: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Policies</label>
              <textarea
                value={profileForm.resort_policies}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, resort_policies: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Resort Images</label>
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-5 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="profile-image-upload"
                  onChange={(e) => handleProfileImageAdd(e.target.files)}
                />
                <label htmlFor="profile-image-upload" className="cursor-pointer inline-flex items-center gap-2 text-primary">
                  <Upload className="h-4 w-4" />
                  Upload New Images
                </label>
                <p className="text-xs text-muted-foreground mt-2">Uploading images replaces the current gallery.</p>
              </div>
              {profileImagePreviews.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {profileImagePreviews.map((preview, index) => (
                    <div key={`${preview}-${index}`} className="relative rounded-lg overflow-hidden border">
                      <img src={preview} alt="Resort" className="w-full h-28 object-cover" />
                      {profileImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => removeProfileImage(index)}
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <ImageIcon className="h-4 w-4" />
                  No images uploaded yet.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>
        ) : resortProfile ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg mb-1">{resortProfile.resort_name || currentUser?.name}</h3>
              <p className="text-sm text-muted-foreground">₱{resortProfile.resort_price_per_night || 0} per night</p>
            </div>
            <p className="text-sm text-muted-foreground">{resortProfile.resort_description || 'No description provided.'}</p>

            <div>
              <h4 className="text-sm font-medium mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {(resortProfile.resort_amenities || []).length ? (
                  resortProfile.resort_amenities.map((amenity: string) => (
                    <span key={amenity} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {amenity}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No amenities listed</span>
                )}
              </div>
            </div>

            {(resortProfile.resort_facilities || resortProfile.resort_policies) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Facilities</h4>
                  <p className="text-sm text-muted-foreground">{resortProfile.resort_facilities || 'None listed'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Policies</h4>
                  <p className="text-sm text-muted-foreground">{resortProfile.resort_policies || 'None listed'}</p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2">Gallery</h4>
              {profileImagePreviews.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profileImagePreviews.map((preview, index) => (
                    <div key={`${preview}-${index}`} className="rounded-lg overflow-hidden border">
                      <img src={preview} alt="Resort" className="w-full h-24 object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  No images uploaded yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No resort profile data available.</div>
        )}
      </div>

      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Attraction Listing</h2>
            <p className="text-sm text-muted-foreground">Optional: feature your resort in the Attractions page.</p>
          </div>
          <button
            onClick={() => {
              if (subscriptionStatus?.subscription_status !== 'paid') {
                toast.error('Subscription required to add attractions');
                return;
              }
              const defaultName = resortProfile?.resort_name || currentUser?.name || '';
              const defaultDesc = resortProfile?.resort_description || '';
              setAttractionForm({
                name: defaultName,
                location: '',
                category: '',
                description: defaultDesc,
                full_description: '',
              });
              setShowAttractionForm((prev) => !prev);
            }}
            disabled={subscriptionStatus?.subscription_status !== 'paid'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {showAttractionForm ? 'Cancel' : 'Add as Attraction'}
          </button>
        </div>

        {showAttractionForm && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Attraction Name *</label>
                <input
                  value={attractionForm.name}
                  onChange={(e) => setAttractionForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Location</label>
                <input
                  value={attractionForm.location}
                  onChange={(e) => setAttractionForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Barangay or area"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Category</label>
                <input
                  value={attractionForm.category}
                  onChange={(e) => setAttractionForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Nature, Beach, Adventure"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Short Description</label>
                <textarea
                  value={attractionForm.description}
                  onChange={(e) => setAttractionForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Full Description</label>
                <textarea
                  value={attractionForm.full_description}
                  onChange={(e) => setAttractionForm((prev) => ({ ...prev, full_description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Attraction Image (optional)</label>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file && !file.type.startsWith('image/')) {
                          toast.error('Only image files are allowed');
                          return;
                        }
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error('Image must not exceed 5MB');
                          return;
                        }
                        setAttractionImageFile(file);
                        setAttractionImagePreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                  {attractionImagePreview && (
                    <img
                      src={attractionImagePreview}
                      alt="Attraction preview"
                      className="w-full max-w-sm h-40 object-cover rounded-lg border"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddAttraction}
                disabled={attractionSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {attractionSubmitting ? 'Saving...' : 'Save Attraction'}
              </button>
              <button
                onClick={() => setShowAttractionForm(false)}
                className="px-6 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {attractions.length === 0 && !showAttractionForm && (
          <div className="text-sm text-muted-foreground">You have no attractions yet.</div>
        )}

        {attractions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attractions.map((attraction) => (
              <div key={attraction.id} className="border-2 border-primary/10 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="mb-1">{attraction.name}</h3>
                    <p className="text-sm text-muted-foreground">{attraction.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveAttraction(attraction.id)}
                    className="text-sm text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border-2 border-primary/20 rounded-lg p-6"
            >
              <div className={`${stat.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl text-primary">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Payment Details Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Payment Details</h2>
              <p className="text-sm text-muted-foreground">Manage your payment methods for customer bookings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowReceiptsModal(true);
                fetchReceipts();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Receipts ({receipts.length})
            </button>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Payment Method
            </button>
          </div>
        </div>

        {/* Payment Methods List */}
        {paymentDetails.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {paymentDetails.map((payment, index) => (
              <div key={index} className="border-2 border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary uppercase">{payment.type}</span>
                  <button
                    onClick={() => handleDeletePayment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-semibold">{payment.name}</p>
                <p className="text-sm text-muted-foreground">{payment.account_number}</p>
                <p className="text-sm text-muted-foreground">{payment.account_name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Payment Form */}
        {showPaymentForm && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Payment Type *</label>
                <select
                  value={newPayment.type}
                  onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                >
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                  <option value="bank_account">Bank Account</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Display Name *</label>
                <input
                  type="text"
                  value={newPayment.name}
                  onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="e.g., My GCash, Business Account"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Number *</label>
                <input
                  type="text"
                  value={newPayment.account_number}
                  onChange={(e) => setNewPayment({ ...newPayment, account_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="09123456789 or Account Number"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Name *</label>
                <input
                  type="text"
                  value={newPayment.account_name}
                  onChange={(e) => setNewPayment({ ...newPayment, account_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          </div>
        )}

        {paymentDetails.length === 0 && !showPaymentForm && (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment methods added yet</p>
            <p className="text-sm">Add payment methods so customers can pay for bookings</p>
          </div>
        )}
      </div>


      {/* Event Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Event Management</h2>
              <p className="text-sm text-muted-foreground">Manage your events and activities</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (subscriptionStatus?.subscription_status !== 'paid') {
                toast.error('Subscription required to add events');
                return;
              }
              setShowAddEvent(!showAddEvent);
              if (showAddEvent) {
                setEditingEventId(null);
                setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
                setEventImageFile(null);
                setEventImagePreview(null);
              }
            }}
            disabled={subscriptionStatus?.subscription_status !== 'paid'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>

        {showAddEvent && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{editingEventId ? 'Edit Event' : 'Add New Event'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter event name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newEvent.category}
                  onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Capacity</label>
                <input
                  type="text"
                  value={newEvent.capacity}
                  onChange={e => setNewEvent({ ...newEvent, capacity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="e.g., 100 people"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Short Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white resize-none"
                  placeholder="Brief description of the event"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Full Description</label>
                <textarea
                  value={newEvent.full_description}
                  onChange={e => setNewEvent({ ...newEvent, full_description: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white resize-none"
                  placeholder="Detailed description of the event"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Event Image</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors bg-white flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {eventImageFile ? eventImageFile.name : 'Choose image file...'}
                        </span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded">
                          Browse
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast.error('Image size must be less than 5MB');
                            return;
                          }
                          setEventImageFile(f);
                          setEventImagePreview(f ? URL.createObjectURL(f) : null);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {eventImagePreview && (
                    <div className="relative w-full max-w-xs">
                      <img 
                        src={eventImagePreview} 
                        alt="Event preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEventImageFile(null);
                          setEventImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddEvent}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {editingEventId ? 'Update Event' : 'Add Event'}
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEventId(null);
                  setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
                  setEventImageFile(null);
                  setEventImagePreview(null);
                }}
                className="px-6 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3 font-semibold">Image</th>
                <th className="text-left pb-3 font-semibold">Event Name</th>
                <th className="text-left pb-3 font-semibold">Category</th>
                <th className="text-left pb-3 font-semibold">Date</th>
                <th className="text-left pb-3 font-semibold">Location</th>
                <th className="text-left pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No events yet
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="border-b border-primary/10">
                    <td className="py-4">
                      {event.image ? (
                        <img 
                          src={getEventImageUrl(event.image) || ''} 
                          alt={event.name}
                          className="w-16 h-16 object-cover rounded border-2 border-primary/20"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/default-event.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="py-4">{event.name}</td>
                    <td className="py-4">
                      {event.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{event.category}</span>
                      )}
                    </td>
                    <td className="py-4">
                      {event.date ? new Date(event.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4">{event.location || '-'}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to edit events');
                              return;
                            }
                            handleEditEvent(event);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to delete events');
                              return;
                            }
                            handleDeleteEvent(event.id);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <h2 className="mb-6">Recent Bookings</h2>
        {bookingSummary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {bookingSummary.slice(0, 3).map(item => (
              <div key={item.name} className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground">{item.name}</p>
                <p className="text-2xl text-primary">{item.count}</p>
              </div>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3">Booking ID</th>
                <th className="text-left pb-3">Accommodation</th>
                <th className="text-left pb-3">Check-in</th>
                <th className="text-left pb-3">Check-out</th>
                <th className="text-left pb-3">Total</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-primary/10">
                  <td className="py-4">BKG-{String(booking.id).padStart(3, '0')}</td>
                  <td className="py-4">{booking.accommodation}</td>
                  <td className="py-4">{new Date(booking.checkIn).toLocaleDateString()}</td>
                  <td className="py-4">{new Date(booking.checkOut).toLocaleDateString()}</td>
                  <td className="py-4">₱{booking.total.toLocaleString()}</td>
                  <td className="py-4">
                    <span className={getStatusBadge(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4">
                    {bookingStatusFlow[booking.status] && (
                      <button
                        onClick={() => handleUpdateBookingStatus(String(booking.id))}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 text-sm"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {(bookingStatusFlow[booking.status] ? (bookingStatusFlow[booking.status]!.charAt(0).toUpperCase() + bookingStatusFlow[booking.status]!.slice(1)) : '')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipts Modal */}
      {showReceiptsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Payment Receipts</h3>
                <button
                  onClick={() => setShowReceiptsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {receipts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment receipts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border-2 border-primary/20 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold">
                            {receipt.type === 'order' ? 'Product Order' : 'Accommodation Booking'} - ₱{receipt.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {receipt.payment_method} • {receipt.payment_reference}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From: {receipt.tourist?.name || 'Tourist'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            receipt.status === 'verified' 
                              ? 'bg-green-100 text-green-700' 
                              : receipt.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <img
                            src={`http://localhost:8000${receipt.receipt_image}`}
                            alt="Payment receipt"
                            className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                          />
                        </div>
                        <div className="space-y-3">
                          {receipt.notes && (
                            <div>
                              <p className="text-sm font-medium">Notes:</p>
                              <p className="text-sm text-muted-foreground">{receipt.notes}</p>
                            </div>
                          )}
                          
                          {receipt.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyReceipt(receipt.id, 'verified')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyReceipt(receipt.id, 'rejected', 'Invalid receipt')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
