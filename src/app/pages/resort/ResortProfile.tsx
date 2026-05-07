import { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, Edit, Trash2, Calendar, DollarSign, Users, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getJSON, patchJSON, postJSON } from '../../lib/api';
import { showProductSuccess, showStatusUpdateSuccess } from '../../lib/sweetAlert';

interface Accommodation {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  image: string;
  availability: { [date: string]: 'available' | 'booked' | 'full' };
}

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

export function ResortProfile() {
  const { currentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccommodation, setShowAddAccommodation] = useState(false);
  const [editingAccommodationId, setEditingAccommodationId] = useState<string | null>(null);
  const [newAccommodation, setNewAccommodation] = useState({
    name: '',
    description: '',
    pricePerNight: 0,
    image: '',
  });

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

  const bookingStatusFlow = {
    pending: 'confirmed' as const,
    confirmed: 'checked-in' as const,
    'checked-in': 'completed' as const,
    completed: null,
  };

  useEffect(() => {
    (async () => {
      try {
        const [accommodationsResponse, bookingsResponse] = await Promise.all([
          getJSON('/api/accommodations'),
          getJSON('/api/bookings'),
        ]);

        setAccommodations(Array.isArray(accommodationsResponse) ? accommodationsResponse.map((accommodation: any) => ({
          id: String(accommodation.id),
          name: accommodation.name,
          description: accommodation.description ?? '',
          pricePerNight: Number(accommodation.price_per_night ?? accommodation.pricePerNight) || 0,
          image: accommodation.image ?? '',
          availability: accommodation.availability ?? {},
        })) : []);

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
        setAccommodations([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    { icon: Calendar, label: 'Total Bookings', value: bookings.length.toString(), color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: DollarSign, label: 'Revenue (Live)', value: `₱${bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0).toLocaleString()}`, color: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: Users, label: 'Stays Listed', value: accommodations.length.toString(), color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: TrendingUp, label: 'Occupancy Rate', value: `${accommodations.length ? Math.round((bookings.length / accommodations.length) * 100) : 0}%`, color: 'bg-pink-50', iconColor: 'text-pink-600' },
  ];

  const bookingSummary = useMemo(() => {
    const summary = new Map<string, number>();
    bookings.forEach(booking => {
      const name = (booking as any).accommodation_snapshot?.name ?? 'Accommodation';
      summary.set(name, (summary.get(name) ?? 0) + 1);
    });
    return Array.from(summary.entries()).map(([name, count]) => ({ name, count }));
  }, [bookings]);

  const handleSaveAccommodation = async () => {
    if (!newAccommodation.name || !newAccommodation.pricePerNight) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingAccommodationId) {
        await patchJSON(`/api/accommodations/${editingAccommodationId}`, {
          name: newAccommodation.name,
          description: newAccommodation.description,
          price_per_night: newAccommodation.pricePerNight,
          image: newAccommodation.image,
          availability: {},
        });
        await showProductSuccess('updated', newAccommodation.name);
      } else {
        await postJSON('/api/accommodations', {
          name: newAccommodation.name,
          description: newAccommodation.description,
          price_per_night: newAccommodation.pricePerNight,
          image: newAccommodation.image,
          availability: {},
        });
        await showProductSuccess('added', newAccommodation.name);
      }

      const freshAccommodations = await getJSON('/api/accommodations');
      setAccommodations(Array.isArray(freshAccommodations) ? freshAccommodations.map((accommodation: any) => ({
        id: String(accommodation.id),
        name: accommodation.name,
        description: accommodation.description ?? '',
        pricePerNight: Number(accommodation.price_per_night ?? accommodation.pricePerNight) || 0,
        image: accommodation.image ?? '',
        availability: accommodation.availability ?? {},
      })) : []);

      setNewAccommodation({ name: '', description: '', pricePerNight: 0, image: '' });
      setEditingAccommodationId(null);
      setShowAddAccommodation(false);
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save accommodation');
    }
  };

  const handleEditAccommodation = (accommodation: Accommodation) => {
    setEditingAccommodationId(accommodation.id);
    setNewAccommodation({
      name: accommodation.name,
      description: accommodation.description,
      pricePerNight: accommodation.pricePerNight,
      image: accommodation.image,
    });
    setShowAddAccommodation(true);
    setIsEditing(true);
  };

  const handleDeleteAccommodation = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/accommodations/${id}`, { method: 'DELETE' });
      setAccommodations(prev => prev.filter(accommodation => accommodation.id !== id));
      await showProductSuccess('deleted');
    } catch {
      toast.error('Failed to delete accommodation');
    }
  };

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
      await patchJSON(`/api/bookings/${currentBooking.id}`, { status: nextStatus });
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
      const response = await getJSON('/me');
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
      await showProductSuccess('added', 'payment method');
    } catch (error) {
      toast.error('Failed to add payment method');
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      const updatedPayments = paymentDetails.filter((_, i) => i !== index);
      await patchJSON('/payment-details', { payment_details: updatedPayments });
      setPaymentDetails(updatedPayments);
      await showProductSuccess('deleted', 'payment method');
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
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setShowAddAccommodation(!isEditing);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Add Accommodation'}
            </button>
          </div>
        </div>
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

      {/* Accommodation Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2>Accommodation Inventory</h2>
          <button
            onClick={() => {
              setEditingAccommodationId(null);
              setNewAccommodation({ name: '', description: '', pricePerNight: 0, image: '' });
              setShowAddAccommodation(true);
              setIsEditing(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Accommodation
          </button>
        </div>

        {showAddAccommodation && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Accommodation Name</label>
                <input
                  type="text"
                  value={newAccommodation.name}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Price per Night</label>
                <input
                  type="number"
                  value={newAccommodation.pricePerNight || ''}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, pricePerNight: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Description</label>
                <textarea
                  value={newAccommodation.description}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveAccommodation}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editingAccommodationId ? 'Update Accommodation' : 'Add Accommodation'}
              </button>
              <button
                onClick={() => {
                  setShowAddAccommodation(false);
                  setIsEditing(false);
                  setEditingAccommodationId(null);
                }}
                className="px-6 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3">Name</th>
                <th className="text-left pb-3">Price</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accommodations.map((accommodation) => (
                <tr key={accommodation.id} className="border-b border-primary/10">
                  <td className="py-4">{accommodation.name}</td>
                  <td className="py-4">₱{accommodation.pricePerNight.toLocaleString()}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAccommodation(accommodation)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccommodation(accommodation.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
