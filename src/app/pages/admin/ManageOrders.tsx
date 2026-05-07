import { useEffect, useState } from 'react';
import { Package, Hotel, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getJSON, patchJSON } from '../../lib/api';
import { showStatusUpdateSuccess, showSuccessAlert } from '../../lib/sweetAlert';

interface ApiOrder {
  id: number;
  items: Array<{ name?: string; quantity?: number }>;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  payment_method: 'online' | 'otc' | null;
  created_at: string;
}

interface ApiBooking {
  id: number;
  accommodation_snapshot: {
    id?: number;
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

interface Order {
  id: string;
  items: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: string;
  date: string;
  type: 'product';
}

interface Booking {
  id: string;
  accommodation: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  paymentMethod: string;
  type: 'accommodation';
}

export function ManageOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings'>('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ordersResponse, bookingsResponse] = await Promise.all([
          getJSON('/orders'),
          getJSON('/bookings'),
        ]);

        setOrders(
          Array.isArray(ordersResponse)
            ? ordersResponse.map((order: ApiOrder) => ({
                id: `ORD-${String(order.id).padStart(3, '0')}`,
                items: Array.isArray(order.items)
                  ? order.items.map(item => `${item.name ?? 'Item'}${item.quantity ? ` (${item.quantity})` : ''}`).join(', ')
                  : 'Order items',
                total: Number(order.total) || 0,
                status: order.status,
                paymentMethod: order.payment_method ?? 'online',
                date: order.created_at,
                type: 'product' as const,
              }))
            : []
        );

        setBookings(
          Array.isArray(bookingsResponse)
            ? bookingsResponse.map((booking: ApiBooking) => ({
                id: `BKG-${String(booking.id).padStart(3, '0')}`,
                accommodation: booking.accommodation_snapshot?.name ?? 'Accommodation',
                checkIn: booking.check_in,
                checkOut: booking.check_out,
                total: Number(booking.total) || 0,
                status: booking.status,
                paymentMethod: booking.payment_method ?? 'online',
                type: 'accommodation' as const,
              }))
            : []
        );
      } catch {
        setOrders([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const orderStatusFlow: Record<Order['status'], Order['status'] | null> = {
    pending: 'confirmed',
    confirmed: 'shipped',
    shipped: 'delivered',
    delivered: null,
  };

  const bookingStatusFlow: Record<Booking['status'], Booking['status'] | null> = {
    pending: 'confirmed',
    confirmed: 'checked-in',
    'checked-in': 'completed',
    completed: null,
  };

  const handleUpdateOrderStatus = async (orderId: string) => {
    const currentOrder = orders.find(order => order.id === orderId);
    if (!currentOrder) {
      return;
    }

    const nextStatus = orderStatusFlow[currentOrder.status];
    if (!nextStatus) {
      return;
    }

    try {
      const orderNumber = Number(orderId.replace('ORD-', ''));
      await patchJSON(`/orders/${orderNumber}`, { status: nextStatus });
      setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status: nextStatus } : order)));
      await showStatusUpdateSuccess('order', orderId, nextStatus);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order status');
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string) => {
    const currentBooking = bookings.find(booking => booking.id === bookingId);
    if (!currentBooking) {
      return;
    }

    const nextStatus = bookingStatusFlow[currentBooking.status];
    if (!nextStatus) {
      return;
    }

    try {
      const bookingNumber = Number(bookingId.replace('BKG-', ''));
      await patchJSON(`/bookings/${bookingNumber}`, { status: nextStatus });
      setBookings(prev => prev.map(booking => (booking.id === bookingId ? { ...booking, status: nextStatus } : booking)));
      await showStatusUpdateSuccess('booking', bookingId, nextStatus);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update booking status');
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

  const getNextStatusLabel = (status: Order['status'] | Booking['status'], type: 'order' | 'booking') => {
    if (type === 'order') {
      const nextStatus = orderStatusFlow[status as Order['status']];
      return nextStatus ? `Mark as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}` : 'Completed';
    } else {
      const nextStatus = bookingStatusFlow[status as Booking['status']];
      return nextStatus ? `Mark as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}` : 'Completed';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading orders and bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Manage Orders & Bookings</h1>
        <p className="text-muted-foreground">
          View and update order and booking statuses
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b-2 border-primary/20">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 -mb-0.5 transition-colors ${
            activeTab === 'orders'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Orders ({orders.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 -mb-0.5 transition-colors ${
            activeTab === 'bookings'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Accommodation Bookings ({bookings.length})
          </div>
        </button>
      </div>

      {/* Product Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            orders.map(order => (
              <div
                key={order.id}
                className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{order.id}</h3>
                      <span className={`px-3 py-1 rounded-full border text-sm ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Items:</strong> {order.items}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <span><strong>Total:</strong> ₱{order.total.toLocaleString()}</span>
                      <span><strong>Payment:</strong> {order.paymentMethod === 'online' ? 'Online' : 'Over-the-Counter'}</span>
                      <span><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {orderStatusFlow[order.status] && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id)}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {getNextStatusLabel(order.status, 'order')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Accommodation Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
              <p className="text-muted-foreground">No bookings yet</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div
                key={booking.id}
                className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{booking.id}</h3>
                      <span className={`px-3 py-1 rounded-full border text-sm ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Accommodation:</strong> {booking.accommodation}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <span><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</span>
                      <span><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</span>
                      <span><strong>Total:</strong> ₱{booking.total.toLocaleString()}</span>
                      <span><strong>Payment:</strong> {booking.paymentMethod === 'online' ? 'Online' : 'Over-the-Counter'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {bookingStatusFlow[booking.status] && (
                      <button
                        onClick={() => handleUpdateBookingStatus(booking.id)}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {getNextStatusLabel(booking.status, 'booking')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
