import { useEffect, useMemo, useState } from 'react';
import { Hotel, Users, DollarSign, Calendar, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router';
import { getJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { SubscriptionPaymentModal } from '../../components/SubscriptionPaymentModal';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

export function ResortDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    category: '',
    capacity: '',
    description: '',
    full_description: '',
    image: '',
  });

  // Check for subscription verification and show congratulations
  useEffect(() => {
    if (previousStatus === 'pending' && subscriptionStatus?.subscription_status === 'paid') {
      Swal.fire({
        title: 'Congratulations!',
        html: 'Your payment has been verified!<br/>You now have full access to all features.',
        icon: 'success',
        confirmButtonText: 'Start Managing',
        customClass: {
          popup: 'swal-success-popup'
        }
      });
    }
    if (subscriptionStatus) {
      setPreviousStatus(subscriptionStatus.subscription_status);
    }
  }, [subscriptionStatus, previousStatus]);

  useEffect(() => {
    if (!subscriptionStatus || subscriptionStatus.subscription_status !== 'paid' || hasCheckedProfile) {
      return;
    }

    (async () => {
      try {
        const profile = await getJSON('/resort-profile');
        if (!profile?.resort_is_setup) {
          navigate('/resort/profile/setup');
        }
      } catch {
        // Ignore; keep resort owner in dashboard if profile check fails.
      } finally {
        setHasCheckedProfile(true);
      }
    })();
  }, [subscriptionStatus, hasCheckedProfile, navigate]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        // Check subscription status first
        const statusResponse = await getJSON('/subscription/status');
        setSubscriptionStatus(statusResponse);
        
        // Show modal if unpaid
        if (statusResponse.subscription_status === 'unpaid') {
          setShowSubscriptionModal(true);
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    };

    // Initial check
    checkSubscriptionStatus();

    // Poll every 30 seconds to check for status updates
    const interval = setInterval(checkSubscriptionStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [bookingsResponse, accommodationsResponse, eventsResponse] = await Promise.all([
          getJSON('/bookings'),
          getJSON('/accommodations'),
          getJSON('/events/my'),
        ]);

        setBookings(Array.isArray(bookingsResponse) ? bookingsResponse : []);
        setAccommodations(Array.isArray(accommodationsResponse) ? accommodationsResponse : []);
        setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
      } catch {
        setBookings([]);
        setAccommodations([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePaymentSubmitted = async () => {
    // Refresh subscription status
    try {
      const statusResponse = await getJSON('/subscription/status');
      setSubscriptionStatus(statusResponse);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await putJSON(`/events/${editingEvent.id}`, eventForm);
        toast.success('Event updated successfully');
      } else {
        await postJSON('/events', eventForm);
        toast.success('Event created successfully');
      }
      setShowEventModal(false);
      setEditingEvent(null);
      setEventForm({
        name: '',
        date: '',
        time: '',
        location: '',
        category: '',
        capacity: '',
        description: '',
        full_description: '',
        image: '',
      });
      // Refresh events — only my events
      const eventsResponse = await getJSON('/events/my');
      setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      category: event.category || '',
      capacity: event.capacity || '',
      description: event.description || '',
      full_description: event.full_description || '',
      image: event.image || '',
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteJSON(`/events/${id}`);
        toast.success('Event deleted successfully');
        setEvents(events.filter(e => e.id !== id));
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const bookingTrends = useMemo(() => {
    return Array.from(
      bookings.reduce((grouped, booking) => {
        const dateKey = new Date(booking.created_at ?? booking.check_in ?? new Date().toISOString()).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()).entries()
    ).slice(-7).map((entry) => {
      const [date, bookingsCount] = entry as [string, number];
      return { date, bookings: bookingsCount };
    });
  }, [bookings]);

  const monthlyRevenue = useMemo(() => {
    return Array.from(
      bookings.reduce((grouped, booking) => {
        const monthKey = new Date(booking.created_at ?? booking.check_in ?? new Date().toISOString()).toLocaleDateString('en-US', {
          month: 'short',
        });
        grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + Number(booking.total || 0));
        return grouped;
      }, new Map<string, number>()).entries()
    ).slice(-4).map((entry) => {
      const [month, revenue] = entry as [string, number];
      return { month, revenue };
    });
  }, [bookings]);

  const roomTypeBookings = useMemo(() => {
    return Array.from(
      bookings.reduce((grouped, booking) => {
        const type = booking.accommodation_snapshot?.name ?? 'Accommodation';
        grouped.set(type, (grouped.get(type) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()).entries()
    ).slice(0, 4).map((entry) => {
      const [type, bookingsCount] = entry as [string, number];
      return { type, bookings: bookingsCount };
    });
  }, [bookings]);

  const topCustomers = useMemo(() => {
    return Array.from(
      bookings.reduce((grouped, booking) => {
        const name = booking.accommodation_snapshot?.name ?? 'Accommodation';
        const current = grouped.get(name) ?? { bookings: 0, revenue: 0 };
        grouped.set(name, {
          bookings: current.bookings + 1,
          revenue: current.revenue + Number(booking.total || 0),
        });
      return grouped;
      }, new Map<string, { bookings: number; revenue: number }>()).entries()
    ).map((entry) => {
      const [name, metrics] = entry as [string, { bookings: number; revenue: number }];
      return { name, bookings: metrics.bookings, revenue: metrics.revenue };
    }).slice(0, 4);
  }, [bookings]);

  // Calculate Performance Summary metrics
  const avgBookingValue = useMemo(() => {
    if (bookings.length === 0) return 0;
    const total = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    return total / bookings.length;
  }, [bookings]);

  const avgStayDuration = useMemo(() => {
    if (bookings.length === 0) return 0;
    
    const totalNights = bookings.reduce((sum, booking) => {
      if (!booking.check_in || !booking.check_out) return sum;
      
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const nights = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      
      return sum + nights;
    }, 0);
    
    return totalNights / bookings.length;
  }, [bookings]);

  const stats = [
    {
      icon: Calendar,
      label: 'Total Bookings',
      value: String(bookings.length),
      change: 'Live',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Revenue (Live)',
      value: `₱${bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0).toLocaleString()}`,
      change: 'Live',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Users,
      label: 'Accommodations',
      value: String(accommodations.length),
      change: 'Live',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Occupancy Rate',
      value: `${accommodations.length ? Math.min(100, Math.round((bookings.length / accommodations.length) * 100)) : 0}%`,
      change: 'Live',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading resort analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onPaymentSubmitted={handlePaymentSubmitted}
        userRole="resort"
      />

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2">Resort Dashboard</h1>
            <p className="text-muted-foreground">
              Track your resort's performance and analytics
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/resort/profile"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Hotel className="h-4 w-4" />
              Manage Profile
            </Link>
            <button
              onClick={() => {
                setEditingEvent(null);
                setEventForm({
                  name: '',
                  date: '',
                  time: '',
                  location: '',
                  category: '',
                  capacity: '',
                  description: '',
                  full_description: '',
                  image: '',
                });
                setShowEventModal(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {subscriptionStatus && subscriptionStatus.subscription_status !== 'paid' && (
        <div className={`border-2 rounded-lg p-4 mb-6 ${
          subscriptionStatus.subscription_status === 'pending' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold mb-1 ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-yellow-900' 
                  : 'text-orange-900'
              }`}>
                {subscriptionStatus.subscription_status === 'pending' 
                  ? '⏳ Payment Pending Verification' 
                  : '🔒 Subscription Required'}
              </h3>
              <p className={`text-sm ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-yellow-700' 
                  : 'text-orange-700'
              }`}>
                {subscriptionStatus.subscription_status === 'pending'
                  ? 'Your payment is being reviewed by admin. You\'ll get full access once verified.'
                  : 'Subscribe now for ₱50/year to unlock all features and start managing your accommodations.'}
              </p>
            </div>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Subscribe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl text-primary">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Booking Trends */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Booking Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={bookingTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFC0CB" />
              <XAxis dataKey="date" stroke="#666666" />
              <YAxis stroke="#666666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #FFC0CB',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#FF69B4"
                strokeWidth={3}
                dot={{ fill: '#FF69B4', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFC0CB" />
              <XAxis dataKey="month" stroke="#666666" />
              <YAxis stroke="#666666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #FFC0CB',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `₱${value.toLocaleString()}`}
              />
              <Bar dataKey="revenue" fill="#FF69B4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Room Type Performance & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Booked Room Types */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Most Booked Room Types</h3>
          <div className="space-y-4">
            {roomTypeBookings.length > 0 ? (
              roomTypeBookings.map((room, index) => (
                <div key={room.type} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{room.type}</p>
                    <p className="text-sm text-muted-foreground">{room.bookings} bookings</p>
                  </div>
                  <div className="w-32 bg-primary/10 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(room.bookings / roomTypeBookings[0].bookings) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No booking data yet</p>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Top Customers
          </h3>
          <div className="space-y-4">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, index) => (
                <div key={customer.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.bookings} bookings · ₱{customer.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-24 bg-primary/10 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(customer.bookings / topCustomers[0].bookings) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No booking data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-primary/20 rounded-lg p-6">
        <h3 className="mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Booking Value</p>
            <p className="text-2xl text-primary">
              {bookings.length > 0 ? `₱${avgBookingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Stay Duration</p>
            <p className="text-2xl text-primary">
              {bookings.length > 0 ? `${avgStayDuration.toFixed(1)} nights` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
            <p className="text-2xl text-primary flex items-center gap-2">
              {bookings.length} <Calendar className="h-5 w-5 text-primary" />
            </p>
          </div>
        </div>
      </div>

      {/* Events Management */}
      <div className="mt-8 bg-white border-2 border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Events
          </h3>
          <span className="px-3 py-1 bg-primary/10 rounded-full text-sm text-primary">
            {events.length} events
          </span>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-muted-foreground">No events yet</p>
            <button
              onClick={() => {
                setEditingEvent(null);
                setEventForm({
                  name: '',
                  date: '',
                  time: '',
                  location: '',
                  category: '',
                  capacity: '',
                  description: '',
                  full_description: '',
                  image: '',
                });
                setShowEventModal(true);
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center bg-primary text-white rounded-lg px-3 py-2 min-w-[60px]">
                    <span className="text-sm font-semibold">
                      {new Date(event.date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{event.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {event.location} • {event.category}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.time || 'All day'} • Capacity: {event.capacity || 'Unlimited'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit event"
                  >
                    <Hotel className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete event"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {events.length > 3 && (
              <div className="text-center pt-4">
                <Link
                  to="/events"
                  className="text-primary hover:underline text-sm"
                >
                  View all {events.length} events
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Management Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Mansalay Town Plaza"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Festival, Workshop"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input
                    type="text"
                    value={eventForm.capacity}
                    onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 100 people"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Short description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Description</label>
                <textarea
                  value={eventForm.full_description}
                  onChange={(e) => setEventForm({ ...eventForm, full_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={4}
                  placeholder="Detailed event information"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
