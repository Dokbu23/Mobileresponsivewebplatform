import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { Hotel, MapPin, Star, ChevronDown, ChevronUp, Calendar, CreditCard, Building2, LogIn, Upload, X, Truck, ExternalLink } from 'lucide-react';
import { useApp, Accommodation } from '../../context/AppContext';
import { toast } from 'sonner';
import { getPublicJSON, postJSON, getJSON, API_BASE } from '../../lib/api';
import { showTransactionSuccess } from '../../lib/sweetAlert';
import { SearchBar } from '../../components/SearchBar';
import { FilterButton } from '../../components/FilterButton';
import { FilterSidebar } from '../../components/FilterSidebar';
import { FilterChips } from '../../components/FilterChips';
import { useSearchAndFilter } from '../../hooks/useSearchAndFilter';
import { AvailabilityCalendar } from '../../components/AvailabilityCalendar';

export function Accommodations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc' | 'cod'>('online');
  const { addBooking, userType, currentUser } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Accommodation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Payment-related state
  const [businessPaymentDetails, setBusinessPaymentDetails] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Room selection state
  const [resortRooms, setResortRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const bookingAccommodation = useMemo(
    () => items.find(item => item.id === bookingModal) ?? null,
    [items, bookingModal]
  );

  const bookingNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const bookingTotal = bookingAccommodation && bookingNights > 0
    ? (selectedRoom ? selectedRoom.price_per_night : bookingAccommodation.pricePerNight) * bookingNights
    : 0;

  // Initialize search and filter hook
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch accommodations with query parameters (backend only supports search)
  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON(`/accommodations${queryParams}`);
        const mapped = data.map((d: any) => ({
          ...d,
          id: String(d.id),
          pricePerNight: d.price_per_night ?? d.pricePerNight,
          availability: d.availability ?? d.availability,
          user_id: d.user_id,
          is_registered: d.is_registered ?? false,
          type: d.type ?? 'static',
          resort_amenities: d.resort_amenities ?? [],
          resort_facilities: d.resort_facilities ?? null,
          resort_policies: d.resort_policies ?? null,
          resort_images: d.resort_images ?? [],
          image: d.image
            ? (String(d.image).startsWith('http') ? d.image : `${API_BASE}${d.image}`)
            : '',
        }));
        setItems(mapped);
      } catch (e) {
        setItems([]);
      }
    })();
  }, [queryParams]);

  // Apply frontend date filtering using availability JSON field
  const filteredAccommodations = useMemo(() => {
    let filtered = items;

    // Filter by month and year if specified
    if (filters.month || filters.year) {
      filtered = filtered.filter(accommodation => {
        // Check if any availability date matches the selected month/year
        const availabilityDates = Object.keys(accommodation.availability || {});
        
        return availabilityDates.some(dateStr => {
          const date = new Date(dateStr);
          const matchesMonth = !filters.month || (date.getMonth() + 1) === parseInt(filters.month);
          const matchesYear = !filters.year || date.getFullYear() === parseInt(filters.year);
          
          return matchesMonth && matchesYear;
        });
      });
    }

    return filtered;
  }, [items, filters.month, filters.year]);

  // Handle filter removal from chips
  const handleRemoveFilter = (filterKey: keyof typeof filters) => {
    updateFilter({ [filterKey]: '' });
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    clearAllFilters();
    setIsSidebarOpen(false);
  };

  const handleOpenBooking = (accommodationId: string) => {
    if (!userType) {
      toast.error('Please login to book accommodations');
      navigate('/select-role');
      return;
    }

    // Only tourists can book accommodations (enterprise and resort are business accounts)
    if (userType !== 'tourist') {
      toast.error('Only tourists can book accommodations. Business accounts are for management only.');
      return;
    }

    // Block booking for unregistered static listings
    const accommodation = items.find(item => item.id === accommodationId);
    if (accommodation && !accommodation.is_registered && !accommodation.user_id) {
      toast.error('This accommodation is not available for online booking. Please contact them directly.');
      return;
    }

    // Fetch resort payment details when opening booking modal
    fetchResortPaymentDetails(accommodationId);
    setBookingModal(accommodationId);
    setSelectedRoom(null);
    setResortRooms([]);
    setBlockedDates([]);
  };

  // Fetch resort payment details for advance payment
  const fetchResortPaymentDetails = async (accommodationId: string) => {
    try {
      const accommodation = items.find(item => item.id === accommodationId);
      if (accommodation?.user_id) {
        // Fetch resort owner details
        const resortResponse = await getJSON(`/business-users/${accommodation.user_id}`);
        const paymentDetails = resortResponse.payment_details || [];
        
        // Add business_id to each payment method for receipt upload
        const detailsWithBusinessId = paymentDetails.map((payment: any) => ({
          ...payment,
          business_id: accommodation.user_id
        }));
        
        setBusinessPaymentDetails(detailsWithBusinessId);

        // Fetch rooms for this resort
        try {
          const roomsResponse = await getPublicJSON(`/resort-rooms/${accommodation.user_id}`);
          setResortRooms(Array.isArray(roomsResponse) ? roomsResponse : []);
        } catch {
          setResortRooms([]);
        }

        // Fetch blocked dates for this resort
        try {
          const blockedResponse = await getPublicJSON(`/resort-availability/${accommodation.user_id}`);
          setBlockedDates(Array.isArray(blockedResponse) ? blockedResponse : []);
        } catch {
          setBlockedDates([]);
        }
      }
    } catch (error) {
      console.error('Error fetching resort payment details:', error);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleBookNow = async (accommodation: Accommodation) => {
    if (!userType) {
      toast.error('Please login to book accommodations');
      navigate('/select-role');
      return;
    }

    if (userType !== 'tourist') {
      toast.error('Only tourists can book accommodations. Business accounts are for management only.');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    // Check if any date in the range is blocked
    if (blockedDates.length > 0) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const blockedSet = new Set(blockedDates);
      const current = new Date(checkInDate);
      while (current < checkOutDate) {
        const dateStr = current.toISOString().split('T')[0];
        if (blockedSet.has(dateStr)) {
          toast.error(`${dateStr} is not available. Please choose different dates.`);
          return;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // For online payment, validate receipt upload
    if (paymentMethod === 'online') {
      if (resortRooms.length === 0 && businessPaymentDetails.length === 0) {
        // No payment details — allow booking without receipt (will be paid on arrival)
      } else if (businessPaymentDetails.length === 0) {
        toast.error('This resort has no payment methods set up. Please choose Cash on Arrival or Pay at Resort.');
        return;
      } else {
        if (!selectedPayment) {
          toast.error('Please select a payment account');
          return;
        }
        if (!receiptFile) {
          toast.error('Please upload your payment receipt screenshot');
          return;
        }
        if (!paymentReference) {
          toast.error('Please enter the transaction/reference number');
          return;
        }
      }
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const total = (selectedRoom ? selectedRoom.price_per_night : accommodation.pricePerNight) * nights;

    try {
      const booking = await postJSON('/bookings', {
        accommodation_type: accommodation.type ?? 'static',
        accommodation_id: accommodation.type === 'resort_profile' ? null : Number(accommodation.id),
        resort_user_id: accommodation.type === 'resort_profile' ? accommodation.user_id : null,
        accommodation_snapshot: {
          ...accommodation,
          selected_room: selectedRoom ?? null,
          pricePerNight: selectedRoom ? selectedRoom.price_per_night : accommodation.pricePerNight,
        },
        check_in: checkIn,
        check_out: checkOut,
        payment_method: paymentMethod,
        total,
        user_role: userType,
        user_id: currentUser?.id,
      });

      // If online payment, upload receipt
      if (paymentMethod === 'online' && receiptFile && selectedPayment) {
        const formData = new FormData();
        formData.append('type', 'booking');
        formData.append('reference_id', booking.id.toString());
        formData.append('business_id', selectedPayment.business_id.toString());
        formData.append('receipt_image', receiptFile);
        formData.append('amount', total.toString());
        formData.append('payment_method', selectedPayment.type);
        formData.append('payment_reference', paymentReference);
        formData.append('notes', paymentNotes);

        const token = localStorage.getItem('discover-mansalay:token');
        const receiptRes = await fetch(`${API_BASE}/api/payment-receipts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!receiptRes.ok) {
          // Booking was created but receipt upload failed — warn but don't block
          const errData = await receiptRes.json().catch(() => ({}));
          toast.error(`Booking created but receipt upload failed: ${errData.message ?? 'Please contact the resort.'}`);
        }
      }

      addBooking({
        accommodation,
        checkIn,
        checkOut,
        status: booking.status ?? 'pending',
        paymentMethod,
        total,
      });

      const result = await showTransactionSuccess('booking');
      setBookingModal(null);
      setCheckIn('');
      setCheckOut('');
      setSelectedPayment(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setPaymentReference('');
      setPaymentNotes('');
      setSelectedRoom(null);
      setResortRooms([]);
      setBlockedDates([]);      
      if (result.isConfirmed) {
        navigate('/status');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    }
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

      {userType && userType !== 'tourist' && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <Hotel className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="mb-1 text-blue-900">Business Account - Browse Only</h3>
              <p className="text-sm text-blue-700">
                You are logged in as <strong>{userType}</strong>. This is a business management account. Only tourists can book accommodations.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="mb-2">Accommodations</h1>
        <p className="text-muted-foreground">
          Find the perfect place to stay during your visit to Mansalay
        </p>
      </div>

      {/* Search Bar with Filter Button */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={filters.search}
          onChange={(value) => updateFilter({ search: value })}
          placeholder="Search accommodations by name or description..."
          className="flex-1"
        />
        <FilterButton
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          activeFilterCount={activeFilterCount}
          isOpen={isSidebarOpen}
        />
      </div>

      {/* Filter Chips */}
      <FilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={handleClearAllFilters}
        availableBarangays={[]}
        showBarangayFilter={false}
        showDateFilters={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAccommodations.map(accommodation => {
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
                  {/* Registered business: show View Business Page link */}
                  {accommodation.user_id && (accommodation as any).is_registered && (
                    <Link
                      to={`/business/resort/${accommodation.user_id}`}
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Business Page
                    </Link>
                  )}
                  {accommodation.type === 'resort_profile' && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Resort Profile
                    </span>
                  )}
                  {/* Unregistered static listing badge */}
                  {!(accommodation as any).is_registered && !accommodation.user_id && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Static Listing
                    </span>
                  )}
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

                  {/* Unregistered static listing — no online booking */}
                  {!(accommodation as any).is_registered && !(accommodation as any).user_id ? (
                    <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 border-2 border-gray-200 rounded-lg inline-flex items-center justify-center gap-2 text-sm cursor-default">
                      <Hotel className="h-4 w-4" />
                      Contact Directly
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenBooking(accommodation.id)}
                      disabled={userType !== 'tourist' && userType !== null}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {!userType ? (
                        <>
                          <LogIn className="h-4 w-4" />
                          Login to Book
                        </>
                      ) : userType !== 'tourist' ? (
                        <>
                          <Building2 className="h-4 w-4" />
                          Business Account
                        </>
                      ) : (
                        <>
                          <Hotel className="h-4 w-4" />
                          Book Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Booking Modal */}
              {isBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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

                      {/* Availability Calendar — read-only for tourists */}
                      {blockedDates.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Availability
                          </label>
                          <div className="border-2 border-primary/20 rounded-xl p-3 bg-primary/5">
                            <AvailabilityCalendar
                              blockedDates={blockedDates}
                              onToggleDate={() => {}}
                              readOnly
                            />
                            <p className="text-xs text-red-600 mt-2 text-center">
                              🔴 Red dates are fully booked — please avoid selecting them
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Room Selection */}
                      {resortRooms.length > 0 && (                        <div>
                          <label className="block text-sm font-medium mb-2">Select Room</label>
                          <div className="space-y-2">
                            {resortRooms.map((room: any) => {
                              const roomImg = room.image
                                ? (String(room.image).startsWith('http') ? room.image : `${API_BASE}${room.image}`)
                                : null;
                              return (
                                <label
                                  key={room.id}
                                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedRoom?.id === room.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-primary/20 hover:border-primary/50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="roomSelect"
                                    checked={selectedRoom?.id === room.id}
                                    onChange={() => setSelectedRoom(room)}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  {roomImg && (
                                    <img src={roomImg} alt={room.name} className="w-16 h-12 object-cover rounded" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{room.name}</p>
                                      {room.type && (
                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{room.type}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Up to {room.capacity} guests</p>
                                    {room.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">{room.description}</p>
                                    )}
                                  </div>
                                  <p className="text-primary font-semibold text-sm whitespace-nowrap">
                                    ₱{Number(room.price_per_night).toLocaleString()}/night
                                  </p>
                                </label>
                              );
                            })}
                          </div>
                          {selectedRoom && bookingNights > 0 && (
                            <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                              <p className="text-sm font-medium">
                                {selectedRoom.name} × {bookingNights} night{bookingNights > 1 ? 's' : ''} = <span className="text-primary">₱{bookingTotal.toLocaleString()}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm mb-2">Payment Method</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="online"
                              checked={paymentMethod === 'online'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
                            />
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span className="text-sm">Online Payment (Advance Payment)</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="cod"
                              checked={paymentMethod === 'cod'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
                            />
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="text-sm">Cash on Arrival</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="otc"
                              checked={paymentMethod === 'otc'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
                            />
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">Pay at Resort</span>
                          </label>
                        </div>
                      </div>

                      {/* Resort Payment Details for Online Payment */}
                      {paymentMethod === 'online' && (
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
                          {businessPaymentDetails.length === 0 ? (
                            <div className="text-center py-3">
                              <CreditCard className="h-8 w-8 mx-auto text-orange-400 mb-2" />
                              <p className="text-sm font-medium text-orange-800">No payment details set up</p>
                              <p className="text-xs text-orange-700 mt-1">
                                This resort hasn't added payment methods yet. Please choose Cash on Arrival or Pay at Resort.
                              </p>
                            </div>
                          ) : (
                            <>
                              <h4 className="mb-2 font-semibold">Resort Payment Details</h4>
                              <div className="bg-white rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Amount to transfer</span>
                                <span className="font-bold text-primary">
                                  {bookingTotal > 0 ? `₱${bookingTotal.toLocaleString()}` : 'Select dates first'}
                                </span>
                              </div>

                              <div className="space-y-2 mb-4">
                                {businessPaymentDetails.map((payment, index) => (
                                  <label key={index} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${selectedPayment === payment ? 'border-primary bg-white' : 'border-primary/20 hover:border-primary/50'}`}>
                                    <input
                                      type="radio"
                                      name="resortPayment"
                                      checked={selectedPayment === payment}
                                      onChange={() => setSelectedPayment(payment)}
                                      className="w-4 h-4 text-primary"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold text-white bg-primary px-1.5 py-0.5 rounded uppercase">{payment.type}</span>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>

                              {selectedPayment && (
                                <div className="space-y-3 bg-white rounded-lg p-3 border border-primary/10">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload Payment Proof</p>
                                  <div>
                                    <label className="block text-xs mb-1">Reference / Transaction No. *</label>
                                    <input
                                      type="text"
                                      value={paymentReference}
                                      onChange={(e) => setPaymentReference(e.target.value)}
                                      className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
                                      placeholder="e.g. 1234567890"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs mb-1">Receipt Screenshot *</label>
                                    {!receiptPreview ? (
                                      <label
                                        htmlFor="booking-receipt-upload"
                                        className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                                      >
                                        <Upload className="h-6 w-6 text-primary/40 mb-1" />
                                        <span className="text-xs text-muted-foreground">Click to upload screenshot</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={handleReceiptUpload}
                                          className="hidden"
                                          id="booking-receipt-upload"
                                        />
                                      </label>
                                    ) : (
                                      <div className="relative">
                                        <img
                                          src={receiptPreview}
                                          alt="Receipt preview"
                                          className="w-full h-32 object-cover rounded-lg border-2 border-primary/20"
                                        />
                                        <button
                                          onClick={removeReceipt}
                                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-xs mb-1">Notes (Optional)</label>
                                    <textarea
                                      value={paymentNotes}
                                      onChange={(e) => setPaymentNotes(e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm resize-none"
                                      placeholder="Any additional info..."
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setBookingModal(null);
                          setSelectedPayment(null);
                          setReceiptFile(null);
                          setReceiptPreview(null);
                          setPaymentReference('');
                          setPaymentNotes('');
                        }}
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
