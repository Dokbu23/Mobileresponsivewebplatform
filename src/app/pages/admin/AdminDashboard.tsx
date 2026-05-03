import { Users, Eye, ShoppingCart, Hotel, TrendingUp, Package, ClipboardList } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router';

const visitorData = [
  { date: 'Apr 23', visitors: 120 },
  { date: 'Apr 24', visitors: 145 },
  { date: 'Apr 25', visitors: 180 },
  { date: 'Apr 26', visitors: 165 },
  { date: 'Apr 27', visitors: 210 },
  { date: 'Apr 28', visitors: 195 },
  { date: 'Apr 29', visitors: 230 },
];

const activityData = [
  { category: 'Browsing', count: 850 },
  { category: 'Bookings', count: 45 },
  { category: 'Purchases', count: 120 },
  { category: 'Registrations', count: 25 },
];

const topAttractions = [
  { name: 'Puting Buhangin Beach', views: 456 },
  { name: 'Mount Mansalay', views: 342 },
  { name: 'Mansalay Falls', views: 298 },
  { name: 'Coral Garden', views: 256 },
];

const topProducts = [
  { name: 'Handwoven Baskets', sales: 45 },
  { name: 'Organic Honey', sales: 38 },
  { name: 'Woven Bags', sales: 32 },
  { name: 'Traditional Clothing', sales: 28 },
];

export function AdminDashboard() {
  const stats = [
    {
      icon: Users,
      label: 'Total Visitors',
      value: '1,245',
      change: '+12%',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Eye,
      label: 'Page Views',
      value: '8,450',
      change: '+8%',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Hotel,
      label: 'Bookings',
      value: '145',
      change: '+15%',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: ShoppingCart,
      label: 'Purchases',
      value: '320',
      change: '+22%',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor visitor activity and platform analytics
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Manage Orders
          </Link>
        </div>
      </div>

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
        {/* Visitor Trend Chart */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Visitor Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitorData}>
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
                dataKey="visitors"
                stroke="#FF69B4"
                strokeWidth={3}
                dot={{ fill: '#FF69B4', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Chart */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Platform Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFC0CB" />
              <XAxis dataKey="category" stroke="#666666" />
              <YAxis stroke="#666666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #FFC0CB',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#FF69B4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Attractions */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Most Viewed Attractions</h3>
          <div className="space-y-3">
            {topAttractions.map((attraction, index) => (
              <div key={attraction.name} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{attraction.name}</p>
                  <p className="text-sm text-muted-foreground">{attraction.views} views</p>
                </div>
                <div className="w-24 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(attraction.views / topAttractions[0].views) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} sold</p>
                </div>
                <div className="w-24 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(product.sales / topProducts[0].sales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
