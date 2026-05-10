import { Package, Hotel, Clock, CheckCircle, Truck, MapPin, LogIn, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { getJSON } from '../../lib/api';
import { toast } from 'sonner';

export function OrderStatus() {
  const { userType, currentUser } = useApp();
  const { showOrderStatusNotification } = useNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderStatuses, setLastOrderStatuses] = useState<Record<string, string>>({});

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
                    <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${getStatusColor(order.status)}`}>
                      {getOrderStatusIcon(order.status)}
                      {getOrderStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {Array.isArray(order.items) && order.items.map((item: any, index: number) => {
                      const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.name ?? 'Item'} × {item.quantity ?? 0}
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
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                      Your order has been delivered successfully. Thank you for your purchase!
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
    </div>
  );
}
