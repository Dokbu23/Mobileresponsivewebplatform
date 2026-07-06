import { Package, Hotel, Clock, CheckCircle, Truck, MapPin, LogIn, RefreshCw, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { getJSON, getOrderReviewStatus, postJSON } from '../../lib/api';
import { showConfirmDialog } from '../../lib/sweetAlert';
import { toast } from 'sonner';
import ReviewModal from '../../components/ReviewModal';

export function OrderStatus() {
  const { userType, currentUser } = useApp();
  const { showOrderStatusNotification } = useNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderStatuses, setLastOrderStatuses] = useState<Record<string, string>>({});
  const [orderReviews, setOrderReviews] = useState<Record<number, any>>({});
  
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (!userType || userType !== 'tourist') {
      setLoading(false);
      return;
    }

    fetchOrdersAndBookings();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchOrdersAndBookings, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [userType]);

  const fetchOrdersAndBookings = async () => {
    if (!userType || userType !== 'tourist') {
      console.log('Not fetching orders - user type:', userType);
      return;
    }

    try {
      console.log('Fetching orders and bookings for tourist...');
      console.log('Current user:', currentUser);
      
      const [ordersResponse, bookingsResponse] = await Promise.all([
        getJSON('/orders/my'),
        getJSON('/bookings/my'),
      ]);

      console.log('Orders response:', ordersResponse);
      console.log('Bookings response:', bookingsResponse);

      // Check for status changes and show notifications
      if (Array.isArray(ordersResponse)) {
        ordersResponse.forEach((order: any) => {
          const orderId = String(order.id);
          const currentStatus = order.status;
          const lastStatus = lastOrderStatuses[orderId];
          
          if (lastStatus && lastStatus !== currentStatus) {
            showOrderStatusNotification(orderId, lastStatus, currentStatus);
          }
        });

        // Update last known statuses
        const newStatuses: Record<string, string> = {};
        ordersResponse.forEach((order: any) => {
          newStatuses[String(order.id)] = order.status;
        });
        setLastOrderStatuses(newStatuses);
      }

      setOrders(Array.isArray(ordersResponse) ? ordersResponse : []);
      setBookings(Array.isArray(bookingsResponse) ? bookingsResponse : []);
      
      // Fetch review status for delivered orders
      if (Array.isArray(ordersResponse)) {
        const deliveredOrders = ordersResponse.filter((order: any) => 
          order.status === 'delivered' || order.status === 'completed'
        );
        
        for (const order of deliveredOrders) {
          try {
            const reviewResponse = await getOrderReviewStatus(order.id);
            if (reviewResponse.success) {
              setOrderReviews(prev => ({
                ...prev,
                [order.id]: reviewResponse.reviews
              }));
            }
          } catch (err) {
            console.error(`Failed to fetch reviews for order ${order.id}:`, err);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching orders and bookings:', err);
      console.error('Error details:', {
        message: err?.message,
        stack: err?.stack,
        userType,
        currentUser
      });
      toast.error('Failed to load orders and bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReview = (orderId: number, productId: number, productName: string) => {
    const reviews = orderReviews[orderId] || {};
    const existingReview = reviews[productId];
    
    setSelectedOrderId(orderId);
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setExistingReview(existingReview || null);
    setReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    // Refresh orders to get updated review status
    fetchOrdersAndBookings();
  };

  const handleCancelOrder = async (orderId: number) => {
    const confirmed = await showConfirmDialog(
      'Cancel Order',
      'Are you sure you want to cancel this order? This cannot be undone.',
      'Yes, Cancel Order',
      'Keep Order'
    );
    if (!confirmed) return;

    setCancellingOrderId(orderId);
    try {
      await postJSON(`/orders/${orderId}/cancel`, {});
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
      );
      toast.success('Order cancelled successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    const confirmed = await showConfirmDialog(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This cannot be undone.',
      'Yes, Cancel Booking',
      'Keep Booking'
    );
    if (!confirmed) return;

    setCancellingBookingId(bookingId);
    try {
      await postJSON(`/bookings/${bookingId}/cancel`, {});
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b)
      );
      toast.success('Booking cancelled successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  if (!userType) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <LogIn className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
        <h2 className="mb-4">Please Login to View Orders</h2>
        <p className="text-muted-foreground mb-8">
          You need to be logged in to view your orders and bookings
        </p>
        <Link
          to="/select-role"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Login Now
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
        <h2 className="mb-4">Loading Orders & Bookings</h2>
        <p className="text-muted-foreground">
          Please wait while we fetch your latest information...
        </p>
      </div>
    );
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'online':
        return 'Online Payment';
      case 'otc':
        return 'Over-the-Counter';
      case 'cod':
        return 'Cash on Delivery';
      default:
        return method || 'Unknown';
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'delivered':
        return <MapPin className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getOrderStatusLabel = (status: string) => {
    if (status === 'confirmed') {
      return 'Ready for delivery';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getBookingStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'checked-in':
        return <Hotel className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getBookingStatusLabel = (status: string) => {
    if (status === 'confirmed') {
      return 'Payment verified';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'shipped':
      case 'checked-in':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const bookingNodes = bookings.map((booking: any) => {
    const acc = booking.accommodation ?? booking.accommodation_snapshot ?? null;
    const accName = acc?.name ?? 'Accommodation';
    const accPrice = acc?.pricePerNight ?? acc?.price_per_night ?? Number(booking.price_per_night || 0);
    const bookingTotal = Number(booking.total || 0);

    return (
      <div key={booking.id} className="bg-white border-2 border-primary/20 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Booking ID</p>
            <p>{booking.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${getStatusColor(booking.status)}`}>
            {getBookingStatusIcon(booking.status)}
            {getBookingStatusLabel(booking.status)}
          </div>
        </div>

        <div className="mb-3">
          <p>{accName}</p>
          <p className="text-sm text-muted-foreground">₱{Number(accPrice || 0).toFixed(2)} per night</p>
        </div>

        <div className="border-t border-primary/20 pt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Check-in</p>
            <p className="text-sm">{new Date(booking.checkIn).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Check-out</p>
            <p className="text-sm">{new Date(booking.checkOut).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="border-t border-primary/20 mt-3 pt-3 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-primary">₱{bookingTotal.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Payment</p>
            <p className="text-sm">{booking.paymentMethod === 'online' ? 'Online' : 'Over-the-Counter'}</p>
          </div>
        </div>

        {booking.paymentMethod === 'online' && booking.status === 'pending' && (
          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
            Awaiting owner verification of your receipt.
          </div>
        )}

        {/* Check-In Voucher — shown when status is checked-in */}
        {booking.status === 'checked-in' && (
          <div className="mt-4 rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
            {/* Voucher header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                <span className="font-bold text-sm">CHECK-IN VOUCHER</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">✓ Active Stay</span>
            </div>
            {/* Voucher body */}
            <div className="p-4 space-y-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-800">#{String(booking.id).padStart(6, '0')}</p>
                <p className="text-xs text-blue-600">Booking Reference</p>
              </div>
              <div className="border-t border-blue-200 pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Guest</p>
                  <p className="font-medium text-blue-900">{booking.customer_name ?? 'Guest'}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Resort</p>
                  <p className="font-medium text-blue-900 text-xs">
                    {(accName).replace(/&amp;/g, '&')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Check-in</p>
                  <p className="font-medium text-blue-900">{new Date(booking.checkIn ?? booking.check_in).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Check-out</p>
                  <p className="font-medium text-blue-900">{new Date(booking.checkOut ?? booking.check_out).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                {(booking.accommodation_snapshot?.selected_room) && (
                  <div className="col-span-2">
                    <p className="text-xs text-blue-500 font-semibold uppercase">Room</p>
                    <p className="font-medium text-blue-900">{booking.accommodation_snapshot.selected_room.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Total Paid</p>
                  <p className="font-bold text-blue-900">₱{bookingTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold uppercase">Payment</p>
                  <p className="font-medium text-blue-900 capitalize">{booking.paymentMethod ?? booking.payment_method ?? '—'}</p>
                </div>
              </div>
              <div className="border-t border-blue-200 pt-3 text-center">
                <p className="text-xs text-blue-600">Present this voucher to the resort staff</p>
                <p className="text-xs text-blue-500 mt-0.5">Checked in on {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Booking Button — only for pending or confirmed */}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <div className="mt-3">
            <button
              onClick={() => handleCancelBooking(booking.id)}
              disabled={cancellingBookingId === booking.id}
              className="px-3 py-1 text-sm bg-red-50 border border-red-300 text-red-700 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {cancellingBookingId === booking.id ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            This booking has been cancelled.
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1>Order & Booking Status</h1>
        <button
          onClick={fetchOrdersAndBookings}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Orders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-6 w-6 text-primary" />
            <h2>Product Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No orders yet</p>
              <Link
                to="/products"
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="bg-white border-2 border-primary/20 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p>#{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${getStatusColor(order.status)}`}>
                        {getOrderStatusIcon(order.status)}
                        {getOrderStatusLabel(order.status)}
                      </div>
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="px-3 py-1 text-sm bg-red-50 border border-red-300 text-red-700 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {cancellingOrderId === order.id ? 'Cancelling…' : 'Cancel Order'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {Array.isArray(order.items) && order.items.map((item: any, index: number) => {
                      const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                      const variation = item.selectedVariation;
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.name ?? 'Item'}
                            {variation && (
                              <span className="text-pink-600 ml-1">
                                ({variation.name}: {variation.value})
                              </span>
                            )}
                            {' × '}{item.quantity ?? 0}
                          </span>
                          <span>₱{itemTotal.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-primary/20 pt-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-primary font-semibold">₱{Number(order.total || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <p className="text-sm">{getPaymentMethodLabel(order.payment_method)}</p>
                    </div>
                  </div>

                  {/* Business Owner Info */}
                  {order.business_owner && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Business</p>
                      <p className="text-sm font-medium">{order.business_owner.name}</p>
                    </div>
                  )}

                  {/* Status-specific messages */}
                  {order.payment_method === 'online' && order.status === 'pending' && (
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      Awaiting business owner verification of your receipt.
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      Your order is confirmed and being prepared for delivery.
                    </div>
                  )}

                  {order.status === 'shipped' && (
                    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                      Your order is on the way! It should arrive soon.
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                        Your order has been delivered successfully. Thank you for your purchase!
                      </div>
                      
                      {/* Review buttons for each product */}
                      {Array.isArray(order.items) && order.items.map((item: any, index: number) => {
                        const reviews = orderReviews[order.id] || {};
                        const hasReview = reviews[item.product_id];
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleWriteReview(order.id, item.product_id, item.name)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              hasReview
                                ? 'bg-yellow-50 border border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${hasReview ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            <span className="text-sm font-medium">
                              {hasReview ? `Update Review for ${item.name}` : `Write Review for ${item.name}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accommodation Bookings */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Hotel className="h-6 w-6 text-primary" />
            <h2>Accommodation Bookings</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookingNodes}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedOrderId && selectedProductId && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          orderId={selectedOrderId}
          productId={selectedProductId}
          productName={selectedProductName}
          existingReview={existingReview}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
