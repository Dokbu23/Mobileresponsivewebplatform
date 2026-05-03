import { useState } from 'react';
import { Hotel, Edit, Calendar, DollarSign, Users, TrendingUp, BarChart3, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';

export function ResortProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Seaside Beach Resort',
    description: 'Luxury beachfront resort with stunning ocean views and world-class amenities',
    rooms: 50,
    pricePerNight: 3500,
    facilities: 'Pool, Restaurant, WiFi, Spa, Beach Access',
    contact: '+63 912 345 6789',
    email: 'info@seasideresort.com',
  });

  const [bookings, setBookings] = useState([
    {
      id: 'BKG-001',
      guestName: 'John Smith',
      checkIn: '2026-05-01',
      checkOut: '2026-05-05',
      status: 'confirmed' as const,
      total: 14000,
    },
    {
      id: 'BKG-002',
      guestName: 'Maria Garcia',
      checkIn: '2026-05-10',
      checkOut: '2026-05-12',
      status: 'pending' as const,
      total: 7000,
    },
    {
      id: 'BKG-003',
      guestName: 'Carlos Lopez',
      checkIn: '2026-04-28',
      checkOut: '2026-04-30',
      status: 'completed' as const,
      total: 7000,
    },
  ]);

  const bookingStatusFlow = {
    pending: 'confirmed' as const,
    confirmed: 'checked-in' as const,
    'checked-in': 'completed' as const,
    completed: null,
  };

  const stats = [
    { icon: Calendar, label: 'Total Bookings', value: '45', color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: DollarSign, label: 'Revenue (Month)', value: '₱157,500', color: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: Users, label: 'Guests Served', value: '120', color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: TrendingUp, label: 'Occupancy Rate', value: '78%', color: 'bg-pink-50', iconColor: 'text-pink-600' },
  ];

  const handleSave = () => {
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleUpdateBookingStatus = (bookingId: string) => {
    setBookings(prev =>
      prev.map(booking => {
        if (booking.id === bookingId) {
          const nextStatus = bookingStatusFlow[booking.status];
          if (nextStatus) {
            toast.success(`Booking ${bookingId} updated to ${nextStatus}`);
            return { ...booking, status: nextStatus };
          }
        }
        return booking;
      })
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-700 border-orange-300',
      confirmed: 'bg-green-100 text-green-700 border-green-300',
      completed: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return `px-3 py-1 rounded-full border text-sm ${styles[status as keyof typeof styles]}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
            <h1>Resort Profile</h1>
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
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
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

      {/* Profile Information */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <h2 className="mb-6">Resort Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2">Resort Name</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-2">Number of Rooms</label>
            {isEditing ? (
              <input
                type="number"
                value={profile.rooms}
                onChange={(e) => setProfile({ ...profile, rooms: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.rooms}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-2">Price per Night</label>
            {isEditing ? (
              <input
                type="number"
                value={profile.pricePerNight}
                onChange={(e) => setProfile({ ...profile, pricePerNight: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">₱{profile.pricePerNight}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-2">Contact Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.contact}
                onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.contact}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-2">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.email}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.description}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-2">Facilities</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.facilities}
                onChange={(e) => setProfile({ ...profile, facilities: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-muted/50 rounded-lg">{profile.facilities}</p>
            )}
          </div>
        </div>
        {isEditing && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Bookings */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <h2 className="mb-6">Recent Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3">Booking ID</th>
                <th className="text-left pb-3">Guest Name</th>
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
                  <td className="py-4">{booking.id}</td>
                  <td className="py-4">{booking.guestName}</td>
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
                        onClick={() => handleUpdateBookingStatus(booking.id)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 text-sm"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {bookingStatusFlow[booking.status].charAt(0).toUpperCase() + bookingStatusFlow[booking.status]!.slice(1)}
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
