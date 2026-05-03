import { Store, Package, DollarSign, ShoppingCart, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';

const salesTrends = [
  { date: 'Apr 23', sales: 12 },
  { date: 'Apr 24', sales: 18 },
  { date: 'Apr 25', sales: 15 },
  { date: 'Apr 26', sales: 22 },
  { date: 'Apr 27', sales: 20 },
  { date: 'Apr 28', sales: 25 },
  { date: 'Apr 29', sales: 28 },
];

const monthlyRevenue = [
  { month: 'Jan', revenue: 22000 },
  { month: 'Feb', revenue: 25500 },
  { month: 'Mar', revenue: 28000 },
  { month: 'Apr', revenue: 28500 },
];

const topSellingProducts = [
  { name: 'Handwoven Baskets', sold: 45, revenue: 20250 },
  { name: 'Organic Honey', sold: 38, revenue: 9500 },
  { name: 'Woven Bags', sold: 32, revenue: 11200 },
  { name: 'Traditional Clothing', sold: 28, revenue: 22400 },
  { name: 'Coconut Products', sold: 25, revenue: 4500 },
];

const categoryPerformance = [
  { category: 'Handicrafts', sales: 95 },
  { category: 'Food', sales: 68 },
  { category: 'Clothing', sales: 42 },
  { category: 'Souvenirs', sales: 35 },
];

const lowStockItems = [
  { name: 'Woven Bags', stock: 12, status: 'low' },
  { name: 'Traditional Clothing', stock: 8, status: 'critical' },
  { name: 'Handwoven Baskets', stock: 15, status: 'low' },
];

export function EnterpriseDashboard() {
  const stats = [
    {
      icon: ShoppingCart,
      label: 'Total Sales',
      value: '240',
      change: '+22%',
      trend: 'up',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Revenue (Month)',
      value: '₱28,500',
      change: '+18%',
      trend: 'up',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Package,
      label: 'Products Listed',
      value: '18',
      change: '+3',
      trend: 'up',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Order Value',
      value: '₱425',
      change: '+8%',
      trend: 'up',
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
