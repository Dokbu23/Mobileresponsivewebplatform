import { useEffect, useMemo, useState } from 'react';
import { Store, Package, DollarSign, ShoppingCart, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';
import { getJSON, getPublicJSON } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export function EnterpriseDashboard() {
  const { currentUser } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id]);

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

  const salesTrends = Array.from(
    orders.reduce((grouped, order) => {
      const dateKey = new Date(order.created_at ?? new Date().toISOString()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + Number(order.total || 0));
      return grouped;
    }, new Map<string, number>()).entries()
  ).slice(-7).map(([date, sales]) => ({ date, sales }));

  const monthlyRevenue = Array.from(
    orders.reduce((grouped, order) => {
      const monthKey = new Date(order.created_at ?? new Date().toISOString()).toLocaleDateString('en-US', { month: 'short' });
      grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + Number(order.total || 0));
      return grouped;
    }, new Map<string, number>()).entries()
  ).slice(-4).map(([month, revenue]) => ({ month, revenue }));

  const topSellingProducts = Array.from(soldByName.entries())
    .map(([name, metrics]) => ({ name, sold: metrics.sold, revenue: metrics.revenue }))
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 5);

  const categoryPerformance = Object.values(
    products.reduce((grouped, product) => {
      const category = product.category ?? 'Uncategorized';
      const current = grouped[category] ?? 0;
      return {
        ...grouped,
        [category]: current + 1,
      };
    }, {} as Record<string, number>)
  ).map((sales, index) => ({
    category: Object.keys(products.reduce((grouped, product) => {
      grouped[product.category ?? 'Uncategorized'] = true;
      return grouped;
    }, {} as Record<string, boolean>))[index] ?? 'Category',
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

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'low':
        return 'text-orange-600';
      default:
        return 'text-green-600';
    }
  };

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
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2">Enterprise Dashboard</h1>
            <p className="text-muted-foreground">
              Track your sales performance and inventory
            </p>
          </div>
          <Link
            to="/enterprise/profile"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Store className="h-4 w-4" />
            Manage Products
          </Link>
        </div>
      </div>

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
            {categoryPerformance.map((category, index) => (
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
    </div>
  );
}
