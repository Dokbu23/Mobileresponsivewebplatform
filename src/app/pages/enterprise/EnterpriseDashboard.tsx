import { useEffect, useMemo, useState } from 'react';
import { Store, Package, DollarSign, TrendingUp, Star, AlertTriangle, Calendar } from 'lucide-react';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';
import { getJSON, getPublicJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { SubscriptionPaymentModal } from '../../components/SubscriptionPaymentModal';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

export function EnterpriseDashboard() {
  const { currentUser } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    category: '',
    capacity: '',
    description: '',
    full_description: '',
    image: '',
  });

  // Check for subscription verification and show congratulations
  useEffect(() => {
    if (previousStatus === 'pending' && subscriptionStatus?.subscription_status === 'paid') {
      Swal.fire({
        title: 'Congratulations!',
        html: 'Your payment has been verified!<br/>You now have full access to all features.',
        icon: 'success',
        confirmButtonText: 'Start Managing',
        customClass: {
          popup: 'swal-success-popup'
        }
      });
    }
    if (subscriptionStatus) {
      setPreviousStatus(subscriptionStatus.subscription_status);
    }
  }, [subscriptionStatus, previousStatus]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        // Check subscription status first
        const statusResponse = await getJSON('/subscription/status');
        setSubscriptionStatus(statusResponse);
        
        // Show modal if subscription is not paid or active
        if (statusResponse.subscription_status !== 'paid' && statusResponse.subscription_status !== 'active') {
          setShowSubscriptionModal(true);
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    };

    // Initial check
    checkSubscriptionStatus();

    // Poll every 30 seconds to check for status updates
    const interval = setInterval(checkSubscriptionStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const productsResponse = await getPublicJSON('/products');
        const rawProducts = Array.isArray(productsResponse) ? productsResponse : [];
        const filteredProducts = currentUser?.id
          ? rawProducts.filter((product: any) => Number(product.user_id ?? product.userId) === currentUser.id)
          : rawProducts;
        setProducts(filteredProducts);
      } catch {
        setProducts([]);
      }

      try {
        const ordersResponse = await getJSON('/orders/my');
        setOrders(Array.isArray(ordersResponse) ? ordersResponse : []);
      } catch {
        setOrders([]);
      }

      try {
        const eventsResponse = await getJSON('/events/my');
        setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
      } catch {
        setEvents([]);
      }

      finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id]);

  const handlePaymentSubmitted = async () => {
    // Refresh subscription status
    try {
      const statusResponse = await getJSON('/subscription/status');
      setSubscriptionStatus(statusResponse);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await putJSON(`/events/${editingEvent.id}`, eventForm);
        toast.success('Event updated successfully');
      } else {
        await postJSON('/events', eventForm);
        toast.success('Event created successfully');
      }
      setShowEventModal(false);
      setEditingEvent(null);
      setEventForm({
        name: '',
        date: '',
        time: '',
        location: '',
        category: '',
        capacity: '',
        description: '',
        full_description: '',
        image: '',
      });
      // Refresh events — only my events
      const eventsResponse = await getJSON('/events/my');
      setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      category: event.category || '',
      capacity: event.capacity || '',
      description: event.description || '',
      full_description: event.full_description || '',
      image: event.image || '',
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteJSON(`/events/${id}`);
        toast.success('Event deleted successfully');
        setEvents(events.filter(e => e.id !== id));
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const soldByName = useMemo(() => {
    const sales = new Map<string, { sold: number; revenue: number }>();

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const name = item.name ?? 'Product';
        const quantity = Number(item.quantity ?? 1);
        const price = Number(item.price ?? 0);
        const current = sales.get(name) ?? { sold: 0, revenue: 0 };
        sales.set(name, {
          sold: current.sold + quantity,
          revenue: current.revenue + quantity * price,
        });
      });
    });

    return sales;
  }, [orders]);

  const salesTrends = (Array.from(
    orders.reduce((grouped, order) => {
      const dateKey = new Date(order.created_at ?? new Date().toISOString()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + Number(order.total || 0));
      return grouped;
    }, new Map<string, number>()).entries()
  ) as [string, number][]).slice(-7).map(([date, sales]) => ({ date, sales }));

  const monthlyRevenue = (Array.from(
    orders.reduce((grouped, order) => {
      const monthKey = new Date(order.created_at ?? new Date().toISOString()).toLocaleDateString('en-US', { month: 'short' });
      grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + Number(order.total || 0));
      return grouped;
    }, new Map<string, number>()).entries()
  ) as [string, number][]).slice(-4).map(([month, revenue]) => ({ month, revenue }));

  const topSellingProducts = Array.from(soldByName.entries())
    .map(([name, metrics]) => ({ name, sold: metrics.sold, revenue: metrics.revenue }))
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 5);

  const categoryPerformance: Array<{ category: string; sales: number }> = (Object.entries(
    products.reduce((grouped, product) => {
      const category = product.category ?? 'Uncategorized';
      const current = grouped[category] ?? 0;
      return {
        ...grouped,
        [category]: current + 1,
      };
    }, {} as Record<string, number>)
  ) as [string, number][]).map(([category, sales]) => ({
    category,
    sales,
  }));

  const lowStockItems = products
    .filter(product => Number(product.stock ?? 0) < 15)
    .slice(0, 3)
    .map(product => ({
      name: product.name,
      stock: Number(product.stock ?? 0),
      status: Number(product.stock ?? 0) < 10 ? 'critical' : 'low',
    }));

  const stats = [
    {
      icon: Package,
      label: 'Total Sales',
      value: String(orders.length),
      change: 'Live',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Revenue (Live)',
      value: `₱${orders.reduce((sum, order) => sum + Number(order.total || 0), 0).toLocaleString()}`,
      change: 'Live',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Package,
      label: 'Products Listed',
      value: String(products.length),
      change: 'Live',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Order Value',
      value: orders.length ? `₱${Math.round(orders.reduce((sum, order) => sum + Number(order.total || 0), 0) / orders.length).toLocaleString()}` : '₱0',
      change: 'Live',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading enterprise analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onPaymentSubmitted={handlePaymentSubmitted}
        userRole="enterprise"
      />

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2">Enterprise Dashboard</h1>
            <p className="text-muted-foreground">
              Track your sales performance and inventory
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/enterprise/profile"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Store className="h-4 w-4" />
              Manage Products
            </Link>

            <button
              onClick={() => {
                setEditingEvent(null);
                setEventForm({
                  name: '',
                  date: '',
                  time: '',
                  location: '',
                  category: '',
                  capacity: '',
                  description: '',
                  full_description: '',
                  image: '',
                });
                setShowEventModal(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {subscriptionStatus && subscriptionStatus.subscription_status !== 'paid' && (
        <div className={`border-2 rounded-lg p-4 mb-6 ${
          subscriptionStatus.subscription_status === 'pending' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold mb-1 ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-yellow-900' 
                  : 'text-orange-900'
              }`}>
                {subscriptionStatus.subscription_status === 'pending' 
                  ? '⏳ Payment Pending Verification' 
                  : '🔒 Subscription Required'}
              </h3>
              <p className={`text-sm ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-yellow-700' 
                  : 'text-orange-700'
              }`}>
                {subscriptionStatus.subscription_status === 'pending'
                  ? 'Your payment is being reviewed by admin. You\'ll get full access once verified.'
                  : `Subscribe now for ₱${(subscriptionStatus.subscription_amount ?? 50).toLocaleString()}/year to unlock all features and start managing your products.`}
              </p>
            </div>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Subscribe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Store Setup Banner — shown when subscription is paid but store not set up */}
      {subscriptionStatus && subscriptionStatus.subscription_status === 'paid' && subscriptionStatus.store_is_setup === false && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">🏪 Set Up Your Store Profile</h3>
              <p className="text-sm text-blue-700">
                Your subscription is active! Set up your store profile so tourists can find and visit your shop.
              </p>
            </div>
            <Link
              to="/enterprise/profile/setup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap font-medium"
            >
              Set Up Store
            </Link>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="text-orange-900">Low Stock Alert</h3>
          </div>
          <p className="text-sm text-orange-700 mb-3">
            You have {lowStockItems.length} products with low stock levels
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <span
                key={item.name}
                className="px-3 py-1 bg-white border border-orange-300 rounded-full text-sm text-orange-800"
              >
                {item.name} ({item.stock} left)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl text-primary">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trends */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Sales Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFC0CB" />
              <XAxis dataKey="date" stroke="#666666" />
              <YAxis stroke="#666666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #FFC0CB',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#FF69B4"
                strokeWidth={3}
                dot={{ fill: '#FF69B4', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFC0CB" />
              <XAxis dataKey="month" stroke="#666666" />
              <YAxis stroke="#666666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #FFC0CB',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `₱${value.toLocaleString()}`}
              />
              <Bar dataKey="revenue" fill="#FF69B4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Products & Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Best Selling Products
          </h3>
          <div className="space-y-4">
            {topSellingProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.sold} sold · ₱{product.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-24 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(product.sold / topSellingProducts[0].sold) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Sales by Category</h3>
          <div className="space-y-4">
            {categoryPerformance.map((category) => (
              <div key={category.category} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{category.category}</p>
                  <p className="text-sm text-muted-foreground">{category.sales} items sold</p>
                </div>
                <div className="w-32 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(category.sales / categoryPerformance[0].sales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Status */}
      <div className="mt-8 bg-white border-2 border-primary/20 rounded-lg p-6">
        <h3 className="mb-4">Inventory Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">In Stock</p>
            <p className="text-2xl text-green-600">
              {products.filter(p => Number(p.stock ?? 0) >= 15).length} items
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Low Stock</p>
            <p className="text-2xl text-orange-600">
              {products.filter(p => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) < 15).length} items
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Out of Stock</p>
            <p className="text-2xl text-red-600">
              {products.filter(p => Number(p.stock ?? 0) === 0).length} {products.filter(p => Number(p.stock ?? 0) === 0).length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-primary/20 rounded-lg p-6">
        <h3 className="mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Fulfilled Orders</p>
            <p className="text-2xl text-primary">
              {orders.length > 0
                ? `${Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)}%`
                : '0%'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {orders.filter(o => o.status === 'delivered').length} of {orders.length} delivered
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
            <p className="text-2xl text-primary">
              {orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting fulfillment
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl text-primary flex items-center gap-2">
              ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              from {orders.length} orders
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
