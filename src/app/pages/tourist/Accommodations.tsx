import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, MapPin, Star, ChevronDown, ChevronUp, Calendar, CreditCard, Building2, LogIn } from 'lucide-react';
import { useApp, Accommodation } from '../../context/AppContext';
import { toast } from 'sonner';

const mockAccommodations: Accommodation[] = [
  {
    id: 'a1',
    name: 'Seaside Beach Resort',
    description: 'Beachfront resort with stunning ocean views, infinity pool, and world-class amenities. Perfect for families and couples.',
    pricePerNight: 3500,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
    availability: {
      '2026-04-30': 'available',
      '2026-05-01': 'available',
      '2026-05-02': 'booked',
      '2026-05-03': 'available',
      '2026-05-04': 'available',
      '2026-05-05': 'full',
    },
  },
  {
    id: 'a2',
    name: 'Mountain View Lodge',
    description: 'Cozy mountain retreat surrounded by lush forests. Ideal for nature lovers and hikers.',
    pricePerNight: 2500,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    availability: {
      '2026-04-30': 'available',
      '2026-05-01': 'available',
      '2026-05-02': 'available',
      '2026-05-03': 'booked',
      '2026-05-04': 'available',
      '2026-05-05': 'available',
    },
  },
  {
    id: 'a3',
    name: 'Downtown Boutique Hotel',
    description: 'Modern boutique hotel in the heart of town with easy access to restaurants and shops.',
    pricePerNight: 2000,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    availability: {
      '2026-04-30': 'available',
      '2026-05-01': 'available',
      '2026-05-02': 'available',
      '2026-05-03': 'available',
      '2026-05-04': 'full',
      '2026-05-05': 'available',
    },
  },
];

export function Accommodations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc'>('online');
  const { addBooking, userType } = useApp();
  const navigate = useNavigate();

  const handleOpenBooking = (accommodationId: string) => {
    if (!userType) {
      toast.error('Please login to book accommodations');
      navigate('/select-role');
      return;
    }
    setBookingModal(accommodationId);
  };

  const handleBookNow = (accommodation: Accommodation) => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const total = accommodation.pricePerNight * nights;

    addBooking({
      accommodation,
      checkIn,
      checkOut,
      status: 'pending',
      paymentMethod,
      total,
    });

    toast.success('Booking confirmed!');
    setBookingModal(null);
    setCheckIn('');
    setCheckOut('');
    navigate('/status');
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'booked':
        return 'bg-orange-100 text-orange-700';
      case 'full':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {!userType && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/20 border-2 border-primary/20 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="mb-1">👋 Browsing as Guest</h3>
              <p className="text-sm text-muted-foreground">
                Login to book accommodations and view availability
              </p>
            </div>
            <button
              onClick={() => navigate('/select-role')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap inline-flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Login Now
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="mb-2">Accommodations</h1>
        <p className="text-muted-foreground">
          Find the perfect place to stay during your visit to Mansalay
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockAccommodations.map(accommodation => {
          const isExpanded = expandedId === accommodation.id;
          const isBooking = bookingModal === accommodation.id;

          return (
            <div
              key={accommodation.id}
              className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all hover:shadow-lg"
            >
              <img
                src={accommodation.image}
                alt={accommodation.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3>{accommodation.name}</h3>
                  <div className="text-right">
                    <p className="text-primary">₱{accommodation.pricePerNight}</p>
                    <p className="text-xs text-muted-foreground">per night</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Mansalay
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    4.8
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {accommodation.description}
                  </p>
                )}

                {isExpanded && (
                  <div className="mb-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {accommodation.description}
                    </p>

                    <div className="bg-primary/5 p-4 rounded-lg">
                      <h4 className="mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Availability Calendar
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(accommodation.availability).map(([date, status]) => (
                          <div
                            key={date}
                            className={`p-2 rounded text-xs text-center ${getAvailabilityColor(status)}`}
                          >
                            <p>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            <p className="capitalize">{status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : accommodation.id)}
                    className="flex-1 px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {isExpanded ? (
                      <>
                        Less Details <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        More Details <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenBooking(accommodation.id)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {!userType ? (
                      <>
                        <LogIn className="h-4 w-4" />
                        Login to Book
                      </>
                    ) : (
                      <>
                        <Hotel className="h-4 w-4" />
                        Book Now
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Booking Modal */}
              {isBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-md w-full p-6">
                    <h3 className="mb-4">Book {accommodation.name}</h3>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm mb-2">Check-in Date</label>
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Check-out Date</label>
                        <input
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          min={checkIn || new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Payment Method</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="online"
                              checked={paymentMethod === 'online'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'online')}
                            />
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span className="text-sm">Online Payment</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="otc"
                              checked={paymentMethod === 'otc'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'otc')}
                            />
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">Over-the-Counter</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setBookingModal(null)}
                        className="flex-1 px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleBookNow(accommodation)}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Confirm Booking
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
