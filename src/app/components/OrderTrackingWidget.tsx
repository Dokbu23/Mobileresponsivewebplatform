import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, MapPin, RefreshCw, Eye, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { getJSON } from '../lib/api';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'sonner';

interface Order {
  id: number;
  items: any[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  payment_method: string;
  created_at: string;
  business_owner?: {
    name: string;
  };
}

export function OrderTrackingWidget() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [lastOrderStatuses, setLastOrderStatuses] = useState<Record<string, string>>({});
  const { showOrderStatusNotification } = useNotifications();

  useEffect(() => {
    fetchOrders();
    
    // Real-time polling every 15 seconds for more frequent updates
    const interval = setInterval(() => {
      fetchOrders(false); // Silent fetch (no loading state)
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await getJSON('/orders/my');
      
      if (Array.isArray(response)) {
        // Check for status changes and show notifications
        response.forEach((order: Order) => {
          const orderId = String(order.id);
          const currentStatus = order.status;
          const lastStatus = lastOrderStatuses[orderId];
          
          if (lastStatus && lastStatus !== currentStatus) {
            showOrderStatusNotification(orderId, lastStatus, currentStatus);
            toast.success(`Order #${orderId} status updated to ${currentStatus}!`);
          }
        });

        // Update last known statuses
        const newStatuses: Record<string, string> = {};
        response.forEach((order: Order) => {
          newStatuses[String(order.id)] = order.status;
        });
        setLastOrderStatuses(newStatuses);
        
        setOrders(response);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (showLoading) {
        toast.error('Failed to load orders');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-purple-500" />;
      case 'delivered':
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'delivered':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending':
        return 25;
      case 'confirmed':
        return 50;
      case 'shipped':
        return 75;
      case 'delivered':
        return 100;
      default:
        return 0;
    }
  };

  const activeOrders = orders.filter(order => order.status !== 'delivered');
  const recentOrders = orders.slice(0, 3); // Show last 3 orders

  if (loading) {
    return (
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Order Tracking</h3>
          <RefreshCw className="h-4 w-4 text-primary animate-spin ml-auto" />
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Real-time Order Tracking</h3>
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            LIVE
          </div>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh orders"
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Active Orders Summary */}
      {activeOrders.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              You have {activeOrders.length} active order{activeOrders.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-xs text-blue-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-muted-foreground mb-2">No orders yet</p>
          <Link
            to="/products"
            className="text-primary hover:underline text-sm"
          >
            Browse products to place your first order
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} • ₱{order.total.toFixed(2)}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full border text-xs flex items-center gap-1 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Order Progress</span>
                  <span>{getStatusProgress(order.status)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      order.status === 'delivered' ? 'bg-green-500' :
                      order.status === 'shipped' ? 'bg-purple-500' :
                      order.status === 'confirmed' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${getStatusProgress(order.status)}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Steps */}
              <div className="flex justify-between text-xs mb-3">
                <div className={`flex flex-col items-center ${order.status === 'pending' || order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'text-primary' : 'text-gray-400'}`}>
                  <Clock className="h-3 w-3 mb-1" />
                  <span>Pending</span>
                </div>
                <div className={`flex flex-col items-center ${order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'text-primary' : 'text-gray-400'}`}>
                  <CheckCircle className="h-3 w-3 mb-1" />
                  <span>Confirmed</span>
                </div>
                <div className={`flex flex-col items-center ${order.status === 'shipped' || order.status === 'delivered' ? 'text-primary' : 'text-gray-400'}`}>
                  <Truck className="h-3 w-3 mb-1" />
                  <span>Shipped</span>
                </div>
                <div className={`flex flex-col items-center ${order.status === 'delivered' ? 'text-primary' : 'text-gray-400'}`}>
                  <Package className="h-3 w-3 mb-1" />
                  <span>Delivered</span>
                </div>
              </div>

              {/* Business Info */}
              {order.business_owner && (
                <p className="text-xs text-muted-foreground mb-2">
                  From: {order.business_owner.name}
                </p>
              )}

              {/* Order Date */}
              <p className="text-xs text-muted-foreground">
                Placed: {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* View All Link */}
      {orders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            to="/status"
            className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
          >
            <Eye className="h-4 w-4" />
            View All Orders & Bookings
          </Link>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-3 text-xs text-center text-muted-foreground">
        Auto-refreshes every 15 seconds
      </div>
    </div>
  );
}