import { useEffect, useMemo, useState } from 'react';
import { Store, Package, DollarSign, ShoppingCart, TrendingUp, Star, AlertTriangle, Calendar } from 'lucide-react';
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
        
        // Show modal if unpaid or pending
        if (statusResponse.subscription_status === 'unpaid') {
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
      icon: ShoppingCart,
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
            <Link
              to="/enterprise/orders"
              className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Manage Orders
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
                  : 'Subscribe now for ₱50/year to unlock all features and start managing your products.'}
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
            <p className="text-2xl text-green-600">12 items</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Low Stock</p>
            <p className="text-2xl text-orange-600">3 items</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Out of Stock</p>
            <p className="text-2xl text-red-600">1 item</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-primary/20 rounded-lg p-6">
        <h3 className="mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
            <p className="text-2xl text-primary">12.5%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Repeat Customers</p>
            <p className="text-2xl text-primary">45%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
            <p className="text-2xl text-primary flex items-center gap-2">
              4.7 <Star className="h-5 w-5 fill-primary" />
            </p>
          </div>
        </div>
      </div>

      {/* Events Management */}
      <div className="mt-8 bg-white border-2 border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Events
          </h3>
          <span className="px-3 py-1 bg-primary/10 rounded-full text-sm text-primary">
            {events.length} events
          </span>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-muted-foreground">No events yet</p>
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
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center bg-primary text-white rounded-lg px-3 py-2 min-w-[60px]">
                    <span className="text-sm font-semibold">
                      {new Date(event.date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{event.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {event.location} • {event.category}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.time || 'All day'} • Capacity: {event.capacity || 'Unlimited'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit event"
                  >
                    <Store className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete event"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {events.length > 3 && (
              <div className="text-center pt-4">
                <Link
                  to="/events"
                  className="text-primary hover:underline text-sm"
                >
                  View all {events.length} events
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Management Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Mansalay Town Plaza"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Festival, Workshop"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input
                    type="text"
                    value={eventForm.capacity}
                    onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 100 people"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Short description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Description</label>
                <textarea
                  value={eventForm.full_description}
                  onChange={(e) => setEventForm({ ...eventForm, full_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={4}
                  placeholder="Detailed event information"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
