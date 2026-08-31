import { useEffect, useMemo, useState } from 'react';
import { Hotel, Bed, Plus, Edit, Calendar, DollarSign, Users, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle, Upload, Image as ImageIcon, X, Trash2, Play } from 'lucide-react';
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
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';
  payment_method: 'online' | 'otc' | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

interface BookingRow {
  id: number;
  accommodation: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';
  paymentMethod: 'online' | 'otc' | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}

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
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

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

  // Room management state
  const [rooms, setRooms] = useState<any[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: '',
    price_per_night: '',
    capacity: '2',
    description: '',
    is_available: true,
  });
  const [roomImageFiles, setRoomImageFiles] = useState<File[]>([]);
  const [roomImagePreviews, setRoomImagePreviews] = useState<string[]>([]);
  const [existingRoomImages, setExistingRoomImages] = useState<string[]>([]);

  const fetchRooms = async () => {
    try {
      const response = await getJSON('/resort-rooms');
      setRooms(Array.isArray(response) ? response : []);
    } catch {
      setRooms([]);
    }
  };

  const resetRoomForm = () => {
    setRoomForm({ name: '', type: '', price_per_night: '', capacity: '2', description: '', is_available: true });
    setRoomImageFiles([]);
    setRoomImagePreviews([]);
    setExistingRoomImages([]);
    setEditingRoomId(null);
    setShowRoomForm(false);
  };

  const handleSaveRoom = async () => {
    if (!roomForm.name.trim() || !roomForm.price_per_night) {
      toast.error('Room name and price are required');
      return;
    }
    setRoomSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', roomForm.name.trim());
      if (roomForm.type.trim()) formData.append('type', roomForm.type.trim());
      formData.append('price_per_night', roomForm.price_per_night);
      formData.append('capacity', roomForm.capacity || '2');
      if (roomForm.description.trim()) formData.append('description', roomForm.description.trim());
      formData.append('is_available', roomForm.is_available ? '1' : '0');

      // Append multiple images
      roomImageFiles.forEach((file) => {
        formData.append('images[]', file);
      });
      if (roomImageFiles.length > 0) {
        formData.append('image', roomImageFiles[0]);
      }
      if (existingRoomImages.length > 0) {
        formData.append('existing_images', JSON.stringify(existingRoomImages));
      }

      if (editingRoomId) {
        formData.append('_method', 'PUT');
        await postJSON(`/resort-rooms/${editingRoomId}`, formData, true);
        toast.success('Room updated');
      } else {
        await postJSON('/resort-rooms', formData, true);
        toast.success('Room added');
      }
      resetRoomForm();
      await fetchRooms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save room');
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleEditRoom = (room: any) => {
    setEditingRoomId(room.id);
    setRoomForm({
      name: room.name || '',
      type: room.type || '',
      price_per_night: String(room.price_per_night || ''),
      capacity: String(room.capacity || '2'),
      description: room.description || '',
      is_available: room.is_available !== false,
    });
    
    let existingImgs: string[] = [];
    if (Array.isArray(room.images) && room.images.length > 0) {
      existingImgs = room.images.map((img: string) => String(img).startsWith('http') ? img : `${API_BASE}${img}`);
    } else if (room.image) {
      existingImgs = [String(room.image).startsWith('http') ? room.image : `${API_BASE}${room.image}`];
    }
    setExistingRoomImages(existingImgs);
    setRoomImageFiles([]);
    setRoomImagePreviews([]);
    setShowRoomForm(true);
  };

  const handleDeleteRoom = async (id: number) => {
    try {
      await deleteJSON(`/resort-rooms/${id}`);
      toast.success('Room deleted');
      await fetchRooms();
    } catch {
      toast.error('Failed to delete room');
    }
  };

  const handleToggleRoomAvailability = async (room: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !room.is_available;
      const formData = new FormData();
      formData.append('name', room.name);
      formData.append('price_per_night', String(room.price_per_night));
      formData.append('capacity', String(room.capacity || 2));
      formData.append('is_available', newStatus ? '1' : '0');
      formData.append('_method', 'PUT');

      await postJSON(`/resort-rooms/${room.id}`, formData, true);
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_available: newStatus } : r));
      toast.success(`Room "${room.name}" marked as ${newStatus ? 'Active & Available' : 'Inactive / Hidden'}`);
    } catch {
      toast.error('Failed to update room availability');
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
      if (attractionImageFile) {
        formData.append('image', attractionImageFile);
      } else if (resortProfile?.resort_images?.[0]) {
        formData.append('image', resortProfile.resort_images[0]);
      }

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

  const loadResortProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await getJSON('/resort-profile');
      setResortProfile(data);
    } catch {
      setResortProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const bookingStatusFlow: Record<string, string | null> = {
    pending: 'confirmed',
    confirmed: 'checked-in',
    'checked-in': 'completed',
    completed: null,
    cancelled: null,
  };

  const bookingStatusLabels: Record<string, string> = {
    pending: 'Confirm Booking',
    confirmed: 'Check In',
    'checked-in': 'Complete Stay',
    completed: '',
    cancelled: '',
  };

  useEffect(() => {
    loadResortProfile();
    fetchAttractions();
    fetchRooms();
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
                accommodation: (booking.accommodation_snapshot?.name ?? 'Accommodation')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"'),
                checkIn: booking.check_in,
                checkOut: booking.check_out,
                total: Number(booking.total) || 0,
                status: booking.status,
                paymentMethod: booking.payment_method,
                customerName: booking.customer_name ?? 'Guest',
                customerEmail: booking.customer_email ?? null,
                customerPhone: booking.customer_phone ?? null,
              }))
            : []
        );
      } catch {
        setBookings([]);
      }

      setLoading(false);
    })();
  }, []);



  const bookingSummary = useMemo(() => {
    const summary = new Map<string, number>();
    bookings.forEach(booking => {
      const name = (booking as any).accommodation_snapshot?.name ?? 'Accommodation';
      summary.set(name, (summary.get(name) ?? 0) + 1);
    });
    return Array.from(summary.entries()).map(([name, count]) => ({ name, count }));
  }, [bookings]);

  const handleUpdateBookingStatus = async (bookingId: number) => {
    const currentBooking = bookings.find(booking => booking.id === bookingId);
    if (!currentBooking) {
      return;
    }

    const nextStatus = bookingStatusFlow[currentBooking.status];
    if (!nextStatus) {
      return;
    }

    try {
      await patchJSON(`/bookings/${currentBooking.id}`, { status: nextStatus });
      setBookings(prev => prev.map(booking => (booking.id === currentBooking.id ? { ...booking, status: nextStatus as BookingRow['status'] } : booking)));
      await showStatusUpdateSuccess('booking', `BKG-${String(currentBooking.id).padStart(3, '0')}`, nextStatus);
    } catch {
      toast.error('Failed to update booking');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 border-orange-300',
      confirmed: 'bg-green-100 text-green-700 border-green-300',
      'checked-in': 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-gray-100 text-gray-700 border-gray-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
    };
    return `px-3 py-1 rounded-full border text-sm ${styles[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`;
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

  // Load payment details and receipts on component mount, poll every 30s for new receipts
  useEffect(() => {
    fetchPaymentDetails();
    fetchReceipts();

    const interval = setInterval(fetchReceipts, 30000);
    return () => clearInterval(interval);
  }, []);

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
              <Bed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Rooms</h1>
              <p className="text-sm text-muted-foreground">Add, update, and manage your rooms, availability, and inventory</p>
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

      {/* Room Management Header & Controls */}
      <div className="bg-white border-2 border-primary/20 rounded-2xl overflow-hidden mb-8 shadow-sm">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Room Management</h2>
              <p className="text-xs text-muted-foreground">Manage your resort rooms, prices, capacity, and active availability</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-bold">
              Total: {rooms.length}
            </span>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold">
              ✓ Active: {rooms.filter(r => r.is_available).length}
            </span>
            {rooms.filter(r => !r.is_available).length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">
                ✗ Inactive: {rooms.filter(r => !r.is_available).length}
              </span>
            )}
            <button
              onClick={() => {
                if (showRoomForm && !editingRoomId) {
                  resetRoomForm();
                } else {
                  resetRoomForm();
                  setShowRoomForm(true);
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add/Edit Room Form */}
          {showRoomForm && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                  {editingRoomId ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <h3 className="text-base font-bold">{editingRoomId ? 'Edit Room' : 'Add New Room'}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Room Name *</label>
                  <input
                    type="text"
                    value={roomForm.name}
                    onChange={e => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white shadow-sm text-sm"
                    placeholder="e.g. Deluxe Room, Family Suite"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Room Type</label>
                  <select
                    value={roomForm.type}
                    onChange={e => setRoomForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white shadow-sm text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Family">Family</option>
                    <option value="Cottage">Cottage</option>
                    <option value="Villa">Villa</option>
                    <option value="Dormitory">Dormitory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Price Per Night (₱) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₱</span>
                    <input
                      type="number"
                      min="1"
                      value={roomForm.price_per_night}
                      onChange={e => setRoomForm(prev => ({ ...prev, price_per_night: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white shadow-sm text-sm"
                      placeholder="2500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Max Guests</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={roomForm.capacity}
                      onChange={e => setRoomForm(prev => ({ ...prev, capacity: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white shadow-sm text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                  <textarea
                    value={roomForm.description}
                    onChange={e => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white shadow-sm text-sm resize-none"
                    placeholder="Describe the room — bed type, view, special features..."
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Room Photos (Multiple Photos Allowed)
                    </label>
                    <span className="text-xs text-muted-foreground font-medium">
                      {existingRoomImages.length + roomImagePreviews.length} photos selected
                    </span>
                  </div>

                  {/* Thumbnail Grid for Existing & New Previews */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {/* Existing Uploaded Images */}
                    {existingRoomImages.map((imgUrl, idx) => (
                      <div key={`existing-${idx}`} className="relative group rounded-xl overflow-hidden border-2 border-primary/20 bg-gray-100 aspect-video">
                        <img src={imgUrl} alt={`Existing room ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setExistingRoomImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-transform hover:scale-110"
                          title="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded font-bold">Saved</span>
                      </div>
                    ))}

                    {/* New Upload Previews */}
                    {roomImagePreviews.map((previewUrl, idx) => (
                      <div key={`new-${idx}`} className="relative group rounded-xl overflow-hidden border-2 border-primary/40 bg-gray-100 aspect-video ring-2 ring-primary/20">
                        <img src={previewUrl} alt={`New upload ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setRoomImageFiles(prev => prev.filter((_, i) => i !== idx));
                            setRoomImagePreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-transform hover:scale-110"
                          title="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded font-bold">New</span>
                      </div>
                    ))}

                    {/* Add More Photos Box */}
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-white aspect-video min-h-[90px] p-2 text-center">
                      <Upload className="h-6 w-6 text-primary/60 mb-1" />
                      <span className="text-xs font-semibold text-primary">
                        {existingRoomImages.length + roomImagePreviews.length > 0 ? '+ Add More Photos' : 'Upload Photos'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Select multiple (PNG/JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length === 0) return;
                          
                          const validFiles: File[] = [];
                          const validPreviews: string[] = [];

                          files.forEach(f => {
                            if (f.size > 5 * 1024 * 1024) {
                              toast.error(`"${f.name}" is over 5MB`);
                            } else {
                              validFiles.push(f);
                              validPreviews.push(URL.createObjectURL(f));
                            }
                          });

                          setRoomImageFiles(prev => [...prev, ...validFiles]);
                          setRoomImagePreviews(prev => [...prev, ...validPreviews]);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-11 h-6 rounded-full transition-colors relative ${roomForm.is_available ? 'bg-primary' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${roomForm.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      <input
                        type="checkbox"
                        checked={roomForm.is_available}
                        onChange={e => setRoomForm(prev => ({ ...prev, is_available: e.target.checked }))}
                        className="sr-only"
                      />
                    </div>
                    <span className="text-sm font-medium">Room is available for booking</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-primary/10">
                <button
                  onClick={handleSaveRoom}
                  disabled={roomSubmitting}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 font-medium text-sm shadow-sm"
                >
                  {roomSubmitting ? 'Saving...' : editingRoomId ? 'Update Room' : 'Save Room'}
                </button>
                <button
                  onClick={resetRoomForm}
                  className="px-6 py-2.5 bg-white border-2 border-primary/20 text-muted-foreground rounded-xl hover:border-primary hover:text-primary transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {rooms.length === 0 && !showRoomForm && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Hotel className="h-8 w-8 text-primary/40" />
              </div>
              <p className="font-semibold text-muted-foreground mb-1">No rooms yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add rooms so tourists can pick their preferred room when booking</p>
              <button
                onClick={() => { resetRoomForm(); setShowRoomForm(true); }}
                className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Your First Room
              </button>
            </div>
          )}

          {/* Room Cards */}
          {rooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => {
                const imgUrl = room.image
                  ? (String(room.image).startsWith('http') ? room.image : `${API_BASE}${room.image}`)
                  : null;
                const roomImagesCount = Array.isArray(room.images) ? room.images.length : (room.image ? 1 : 0);

                return (
                  <div key={room.id} className={`group border-2 rounded-2xl overflow-hidden hover:shadow-md transition-all ${room.is_available ? 'border-primary/20 bg-white' : 'border-gray-300 bg-gray-50/70 opacity-90'}`}>
                    {/* Room Image */}
                    <div className="relative">
                      {imgUrl ? (
                        <img src={imgUrl} alt={room.name} className="w-full h-44 object-cover" />
                      ) : (
                        <div className="w-full h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Hotel className="h-12 w-12 text-primary/20" />
                        </div>
                      )}
                      {/* Availability status badge */}
                      <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-bold shadow-md ${room.is_available ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {room.is_available ? '✓ Active & Available' : '✗ Inactive (Hidden)'}
                      </span>
                      {/* Type badge */}
                      {room.type && (
                        <span className="absolute top-3 left-3 text-xs bg-black/60 text-white px-2.5 py-1 rounded-full backdrop-blur-sm font-medium">
                          {room.type}
                        </span>
                      )}
                      {/* Photos Count Badge */}
                      {roomImagesCount > 1 && (
                        <span className="absolute bottom-3 right-3 text-[11px] bg-black/70 text-white px-2 py-0.5 rounded-lg backdrop-blur-sm font-semibold flex items-center gap-1">
                          📷 {roomImagesCount} photos
                        </span>
                      )}
                    </div>

                    {/* Room Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-base text-gray-900 leading-snug">{room.name}</h4>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-primary font-bold text-lg">
                          ₱{Number(room.price_per_night).toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground">/night</span>
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium bg-gray-100 px-2 py-1 rounded-md">
                          <Users className="h-3.5 w-3.5" />
                          Capacity: {room.capacity}
                        </span>
                      </div>
                      {room.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{room.description}</p>
                      )}

                      {/* Quick Status Toggle */}
                      <div className="mb-3 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRoomAvailability(room, e)}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                            room.is_available
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${room.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                          {room.is_available ? 'Status: Active (Click to Deactivate)' : 'Status: Inactive (Click to Activate)'}
                        </button>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-primary/10">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-colors text-xs font-bold inline-flex items-center justify-center gap-1"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit Room
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-colors text-xs font-bold inline-flex items-center justify-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending Payment Receipts */}
      {receipts.filter((r: any) => r.status === 'pending').length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl overflow-hidden mb-8">
          <div className="bg-orange-100 px-6 py-4 flex items-center justify-between border-b border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-orange-900">Pending Payment Receipts</h2>
                <p className="text-xs text-orange-700">Verify these payments to confirm bookings</p>
              </div>
            </div>
            <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              {receipts.filter((r: any) => r.status === 'pending').length} pending
            </span>
          </div>
          <div className="p-6 space-y-4">
            {receipts.filter((r: any) => r.status === 'pending').map((receipt: any) => (
              <div key={receipt.id} className="bg-white rounded-xl border border-orange-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={`${API_BASE}${receipt.receipt_image}`}
                      alt="Payment receipt"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-orange-100"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold">
                          🏨 Accommodation Booking — ₱{Number(receipt.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          From: <span className="font-medium">{receipt.tourist?.name ?? 'Customer'}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Via: <span className="uppercase font-medium text-primary">{receipt.payment_method}</span>
                          {receipt.payment_reference && ` · Ref: ${receipt.payment_reference}`}
                        </p>
                        {receipt.notes && (
                          <p className="text-xs text-muted-foreground mt-1">Note: {receipt.notes}</p>
                        )}
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full whitespace-nowrap font-medium">
                        Awaiting Verification
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, 'verified')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify & Confirm Booking
                      </button>
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, 'rejected', 'Invalid receipt')}
                        className="flex-1 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}








      {/* Payment Receipts — inline, always visible */}
      {receipts.length > 0 && (
        <div className="bg-white border-2 border-primary/20 rounded-2xl overflow-hidden mb-8">
          <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">Payment Receipts</h2>
                <p className="text-xs text-muted-foreground">Receipts submitted by customers for their bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {receipts.filter((r: any) => r.status === 'pending').length > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {receipts.filter((r: any) => r.status === 'pending').length} pending
                </span>
              )}
              <span className="text-xs text-muted-foreground">{receipts.length} total</span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {receipts.map((receipt: any) => (
              <div key={receipt.id} className={`rounded-xl border-2 overflow-hidden ${
                receipt.status === 'pending' ? 'border-orange-200' :
                receipt.status === 'verified' ? 'border-green-200' : 'border-red-200'
              }`}>
                <div className={`px-4 py-2 flex items-center justify-between ${
                  receipt.status === 'pending' ? 'bg-orange-50' :
                  receipt.status === 'verified' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      receipt.status === 'pending' ? 'bg-orange-200 text-orange-800' :
                      receipt.status === 'verified' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {receipt.status === 'pending' ? '⏳ Pending' : receipt.status === 'verified' ? '✓ Verified' : '✗ Rejected'}
                    </span>
                    <span className="text-sm font-semibold">
                      {receipt.type === 'order' ? '🛍️ Order' : '🏨 Booking'} — ₱{Number(receipt.amount).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(receipt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  <a
                    href={`${API_BASE}${receipt.receipt_image}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img
                      src={`${API_BASE}${receipt.receipt_image}`}
                      alt="Payment receipt"
                      className="w-40 h-40 object-cover rounded-lg border-2 border-primary/10 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                    <p className="text-xs text-primary text-center mt-1">Click to enlarge</p>
                  </a>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Customer</p>
                      <p className="font-medium">{receipt.tourist?.name ?? 'Customer'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Payment Method</p>
                        <p className="text-sm font-medium uppercase">{receipt.payment_method}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Reference No.</p>
                        <p className="text-sm font-mono">{receipt.payment_reference ?? '—'}</p>
                      </div>
                    </div>
                    {receipt.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Notes</p>
                        <p className="text-sm text-muted-foreground">{receipt.notes}</p>
                      </div>
                    )}
                    {receipt.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleVerifyReceipt(receipt.id, 'verified')}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Verify & Confirm Booking
                        </button>
                        <button
                          onClick={() => handleVerifyReceipt(receipt.id, 'rejected', 'Invalid receipt')}
                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-colors inline-flex items-center gap-2 text-sm font-medium"
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
        </div>
      )}
    </div>
  );
}
