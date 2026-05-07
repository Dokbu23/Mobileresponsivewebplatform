import { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, Edit, Trash2, Calendar, DollarSign, Users, TrendingUp, BarChart3, ChevronDown } from 'lucide-react';
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
    </div>
  );
}
