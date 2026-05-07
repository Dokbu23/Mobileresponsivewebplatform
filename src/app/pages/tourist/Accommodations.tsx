import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, MapPin, Star, ChevronDown, ChevronUp, Calendar, CreditCard, Building2, LogIn, Upload, X } from 'lucide-react';
import { useApp, Accommodation } from '../../context/AppContext';
import { toast } from 'sonner';
import { getPublicJSON, postJSON, getJSON, API_BASE } from '../../lib/api';
import { showTransactionSuccess } from '../../lib/sweetAlert';

export function Accommodations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc'>('online');
  const { addBooking, userType, currentUser } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Accommodation[]>([]);

  // Payment-related state
  const [businessPaymentDetails, setBusinessPaymentDetails] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON('/accommodations');
        const mapped = data.map((d: any) => ({
          ...d,
          id: String(d.id),
          pricePerNight: d.price_per_night ?? d.pricePerNight,
          availability: d.availability ?? d.availability,
          user_id: d.user_id,
        }));
        setItems(mapped);
      } catch (e) {
        setItems([]);
      }
    })();
  }, []);

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

    // Fetch resort payment details when opening booking modal
    fetchResortPaymentDetails(accommodationId);
    setBookingModal(accommodationId);
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

    // For online payment, validate receipt upload
    if (paymentMethod === 'online') {
      if (!selectedPayment) {
        toast.error('Please select a payment method');
        return;
      }
      if (!receiptFile) {
        toast.error('Please upload payment receipt');
        return;
      }
      if (!paymentReference) {
        toast.error('Please enter payment reference number');
        return;
      }
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const total = accommodation.pricePerNight * nights;

    try {
      const booking = await postJSON('/api/bookings', {
        accommodation_id: Number(accommodation.id),
        accommodation_snapshot: accommodation,
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
        await fetch(`${API_BASE}/api/payment-receipts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(accommodation => {
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
                            <span className="text-sm">Online Payment (Advance Payment)</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border-2 border-primary/20 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              value="otc"
                              checked={paymentMethod === 'otc'}
                              onChange={(e) => setPaymentMethod(e.target.value as 'otc')}
                            />
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">Pay at Resort</span>
                          </label>
                        </div>
                      </div>

                      {/* Resort Payment Details for Online Payment */}
                      {paymentMethod === 'online' && businessPaymentDetails.length > 0 && (
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
                          <h4 className="mb-3">Resort Payment Details</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Select a payment method and send your advance payment, then upload the receipt below.
                          </p>
                          
                          <div className="space-y-3 mb-4">
                            {businessPaymentDetails.map((payment, index) => (
                              <label key={index} className="flex items-center gap-3 p-3 border-2 border-primary/20 rounded-lg cursor-pointer hover:border-primary transition-colors">
                                <input
                                  type="radio"
                                  name="resortPayment"
                                  checked={selectedPayment === payment}
                                  onChange={() => setSelectedPayment(payment)}
                                  className="w-4 h-4 text-primary"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-primary uppercase">{payment.type}</span>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm font-medium">{payment.name}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Account: {payment.account_number} - {payment.account_name}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>

                          {selectedPayment && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm mb-2">Payment Reference Number *</label>
                                <input
                                  type="text"
                                  value={paymentReference}
                                  onChange={(e) => setPaymentReference(e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                                  placeholder="Enter transaction/reference number"
                                />
                              </div>

                              <div>
                                <label className="block text-sm mb-2">Receipt Image *</label>
                                <div className="space-y-3">
                                  {!receiptPreview ? (
                                    <div className="relative">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReceiptUpload}
                                        className="hidden"
                                        id="booking-receipt-upload"
                                      />
                                      <label
                                        htmlFor="booking-receipt-upload"
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary transition-colors"
                                      >
                                        <Upload className="h-8 w-8 text-primary/60 mb-2" />
                                        <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                                        <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                                      </label>
                                    </div>
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
                              </div>

                              <div>
                                <label className="block text-sm mb-2">Additional Notes (Optional)</label>
                                <textarea
                                  value={paymentNotes}
                                  onChange={(e) => setPaymentNotes(e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                                  placeholder="Any additional information about the payment..."
                                />
                              </div>
                            </div>
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
