import { Package, Hotel, Clock, CheckCircle, Truck, MapPin, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router';

export function OrderStatus() {
  const { orders, bookings, userType } = useApp();

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="mb-8">Order & Booking Status</h1>

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
                      <p>{order.id}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${getStatusColor(order.status)}`}>
                      {getOrderStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} × {item.quantity}
                        </span>
                        <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-primary/20 pt-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-primary">₱{order.total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <p className="text-sm">{order.paymentMethod === 'online' ? 'Online' : 'Over-the-Counter'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Placed on {new Date(order.date).toLocaleDateString()}
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
              {bookings.map(booking => (
                <div
                  key={booking.id}
                  className="bg-white border-2 border-primary/20 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p>{booking.id}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                      {getBookingStatusIcon(booking.status)}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p>{booking.accommodation.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₱{booking.accommodation.pricePerNight} per night
                    </p>
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
                      <p className="text-primary">₱{booking.total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <p className="text-sm">{booking.paymentMethod === 'online' ? 'Online' : 'Over-the-Counter'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
