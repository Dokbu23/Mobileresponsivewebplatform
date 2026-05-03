import { useState } from 'react';
import { Package, Hotel, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: string;
  date: string;
  type: 'product';
}

interface Booking {
  id: string;
  customerName: string;
  accommodation: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  paymentMethod: string;
  type: 'accommodation';
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    items: 'Handwoven Baskets (2), Organic Honey (1)',
    total: 1150,
    status: 'pending',
    paymentMethod: 'online',
    date: '2026-04-29',
    type: 'product',
  },
  {
    id: 'ORD-002',
    customerName: 'Jane Smith',
    items: 'Woven Bags (1), Traditional Clothing (1)',
    total: 1150,
    status: 'confirmed',
    paymentMethod: 'otc',
    date: '2026-04-28',
    type: 'product',
  },
];

const mockBookings: Booking[] = [
  {
    id: 'BKG-001',
    customerName: 'Carlos Lopez',
    accommodation: 'Seaside Beach Resort',
    checkIn: '2026-05-01',
    checkOut: '2026-05-05',
    total: 14000,
    status: 'pending',
    paymentMethod: 'online',
    type: 'accommodation',
  },
  {
    id: 'BKG-002',
    customerName: 'Maria Garcia',
    accommodation: 'Mountain View Lodge',
    checkIn: '2026-05-10',
    checkOut: '2026-05-12',
    total: 5000,
    status: 'confirmed',
    paymentMethod: 'otc',
    type: 'accommodation',
  },
];

export function ManageOrders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings'>('orders');

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

  const handleUpdateOrderStatus = (orderId: string) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          const nextStatus = orderStatusFlow[order.status];
          if (nextStatus) {
            toast.success(`Order ${orderId} updated to ${nextStatus}`);
            return { ...order, status: nextStatus };
          }
        }
        return order;
      })
    );
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
                      <strong>Customer:</strong> {order.customerName}
                    </p>
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
                      <strong>Customer:</strong> {booking.customerName}
                    </p>
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
