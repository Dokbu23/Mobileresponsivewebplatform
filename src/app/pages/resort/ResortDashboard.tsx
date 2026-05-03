import { Hotel, Users, DollarSign, Calendar, TrendingUp, Star } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';

const bookingTrends = [
  { date: 'Apr 23', bookings: 5 },
  { date: 'Apr 24', bookings: 7 },
  { date: 'Apr 25', bookings: 6 },
  { date: 'Apr 26', bookings: 8 },
  { date: 'Apr 27', bookings: 10 },
  { date: 'Apr 28', bookings: 9 },
  { date: 'Apr 29', bookings: 12 },
];

const monthlyRevenue = [
  { month: 'Jan', revenue: 125000 },
  { month: 'Feb', revenue: 145000 },
  { month: 'Mar', revenue: 168000 },
  { month: 'Apr', revenue: 157500 },
];

const roomTypeBookings = [
  { type: 'Standard Room', bookings: 28 },
  { type: 'Deluxe Room', bookings: 35 },
  { type: 'Suite', bookings: 18 },
  { type: 'Villa', bookings: 12 },
];

const topCustomers = [
  { name: 'John Smith', bookings: 8, revenue: 28000 },
  { name: 'Maria Garcia', bookings: 6, revenue: 21000 },
  { name: 'Carlos Lopez', bookings: 5, revenue: 17500 },
  { name: 'Anna Santos', bookings: 4, revenue: 14000 },
];

export function ResortDashboard() {
  const stats = [
    {
      icon: Calendar,
      label: 'Total Bookings',
      value: '145',
      change: '+15%',
      trend: 'up',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Revenue (Month)',
      value: '₱157,500',
      change: '+8%',
      trend: 'up',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Users,
      label: 'Total Guests',
      value: '320',
      change: '+12%',
      trend: 'up',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Occupancy Rate',
      value: '78%',
      change: '+5%',
      trend: 'up',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2">Resort Dashboard</h1>
            <p className="text-muted-foreground">
              Track your resort's performance and analytics
            </p>
          </div>
          <Link
            to="/resort/profile"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Hotel className="h-4 w-4" />
            Manage Profile
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
        {/* Booking Trends */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Booking Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={bookingTrends}>
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
                dataKey="bookings"
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

      {/* Room Type Performance & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Booked Room Types */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4">Most Booked Room Types</h3>
          <div className="space-y-4">
            {roomTypeBookings.map((room, index) => (
              <div key={room.type} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{room.type}</p>
                  <p className="text-sm text-muted-foreground">{room.bookings} bookings</p>
                </div>
                <div className="w-32 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(room.bookings / roomTypeBookings[0].bookings) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Top Customers
          </h3>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.name} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.bookings} bookings · ₱{customer.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-24 bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(customer.bookings / topCustomers[0].bookings) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-primary/20 rounded-lg p-6">
        <h3 className="mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Booking Value</p>
            <p className="text-2xl text-primary">₱4,920</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Stay Duration</p>
            <p className="text-2xl text-primary">3.2 nights</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Customer Rating</p>
            <p className="text-2xl text-primary flex items-center gap-2">
              4.8 <Star className="h-5 w-5 fill-primary" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
