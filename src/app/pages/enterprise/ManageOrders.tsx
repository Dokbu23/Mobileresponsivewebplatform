import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, Phone, MapPin, User, Calendar, CreditCard, Building2, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';
import { getJSON, patchJSON } from '../../lib/api';
import { showSuccessAlert, showConfirmAlert } from '../../lib/sweetAlert';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  notes?: string;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  payment_method: 'online' | 'otc' | 'cod';
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: ShippingAddress;
  created_at: string;
  customer?: {
    id: number;
    name: string;
    email: string;
  };
}

export function ManageOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { userType } = useApp();
  const { showOrderPlacedNotification } = useNotifications();

  useEffect(() => {
    if (userType !== 'enterprise') {
      toast.error('Access denied. Enterprise accounts only.');
      return;
    }
    fetchOrders();
  }, [userType]);

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for enterprise user...');
      console.log('Current user type:', userType);
      const response = await getJSON('/orders/my');
      console.log('Orders response:', response);
      console.log('Orders count:', response?.length || 0);
      setOrders(response || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (order: Order, newStatus: Order['status']) => {
    const result = await showConfirmAlert(
      'Update Order Status?',
      `Change order #${order.id} status to "${newStatus}"?`
    );

    if (result.isConfirmed) {
      try {
        const response = await patchJSON(`/orders/${order.id}`, { status: newStatus });
        
        // Check if the response includes status change information
        if (response.status_changed) {
          await showSuccessAlert(
            'Status Updated!', 
            `Order #${order.id} status has been updated from ${response.old_status} to ${response.new_status}.`
          );
        } else {
          await showSuccessAlert('Status Updated!', `Order #${order.id} status has been updated to ${newStatus}.`);
        }
        
        fetchOrders();
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to update order status');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
      shipped: 'bg-purple-100 text-purple-700 border-purple-300',
      delivered: 'bg-green-100 text-green-700 border-green-300',
    };

    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      shipped: Truck,
      delivered: Package,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${colors[status as keyof typeof colors] || colors.pending}`}>
        <Icon className="h-4 w-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      online: 'bg-green-100 text-green-700',
      otc: 'bg-blue-100 text-blue-700',
      cod: 'bg-orange-100 text-orange-700',
    };

    const labels = {
      online: 'Online Payment',
      otc: 'Over-the-Counter',
      cod: 'Cash on Delivery',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[method as keyof typeof colors] || colors.cod}`}>
        {labels[method as keyof typeof labels] || method}
      </span>
    );
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Order Management</h1>
        <p className="text-muted-foreground">
          Manage and track your product orders
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl text-primary">{orderStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-2xl text-yellow-600">{orderStats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700">Confirmed</p>
              <p className="text-2xl text-blue-600">{orderStats.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700">Shipped</p>
              <p className="text-2xl text-purple-600">{orderStats.shipped}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Delivered</p>
              <p className="text-2xl text-green-600">{orderStats.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="mb-2">No orders yet</h3>
            <p className="text-muted-foreground">
              Orders from customers will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary/5 border-b-2 border-primary/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm">Order</th>
                  <th className="px-6 py-4 text-left text-sm">Customer</th>
                  <th className="px-6 py-4 text-left text-sm">Items</th>
                  <th className="px-6 py-4 text-left text-sm">Total</th>
                  <th className="px-6 py-4 text-left text-sm">Payment</th>
                  <th className="px-6 py-4 text-left text-sm">Status</th>
                  <th className="px-6 py-4 text-left text-sm">Date</th>
                  <th className="px-6 py-4 text-left text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">#{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        {order.customer_phone && (
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, index) => (
                          <p key={index} className="text-sm">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{order.items.length - 2} more items
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-primary">₱{order.total.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getPaymentMethodBadge(order.payment_method)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(order, 'confirmed')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                          >
                            Confirm
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(order, 'shipped')}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-sm"
                          >
                            Ship
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleStatusUpdate(order, 'delivered')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                          >
                            Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b-2 border-primary/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Order #{selectedOrder.id}</h2>
                  <p className="text-sm text-muted-foreground">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Order Status</h3>
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentMethodBadge(selectedOrder.payment_method)}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Customer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm">{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Shipping Address
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{selectedOrder.shipping_address.fullName}</p>
                      <p className="text-sm">{selectedOrder.shipping_address.phone}</p>
                      <p className="text-sm">{selectedOrder.shipping_address.address}</p>
                      <p className="text-sm">
                        {selectedOrder.shipping_address.barangay}, {selectedOrder.shipping_address.city}
                      </p>
                      <p className="text-sm">
                        {selectedOrder.shipping_address.province} {selectedOrder.shipping_address.zipCode}
                      </p>
                      {selectedOrder.shipping_address.notes && (
                        <p className="text-xs text-gray-600 italic mt-2">
                          Note: {selectedOrder.shipping_address.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Order Items
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{item.price.toFixed(2)} each</p>
                        <p className="text-sm text-gray-600">₱{(item.price * item.quantity).toFixed(2)} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-xl font-bold text-primary">₱{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Update Order Status</h3>
                <div className="flex gap-3">
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder, 'confirmed')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Confirm Order
                    </button>
                  )}
                  {selectedOrder.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder, 'shipped')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {selectedOrder.status === 'shipped' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder, 'delivered')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}