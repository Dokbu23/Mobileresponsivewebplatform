import { useState } from 'react';
import { Store, Plus, Edit, Trash2, Package, DollarSign, ShoppingCart, TrendingUp, BarChart3, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sold: number;
}

export function EnterpriseProfile() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'p1',
      name: 'Handwoven Baskets',
      price: 450,
      stock: 15,
      category: 'Handicrafts',
      sold: 45,
    },
    {
      id: 'p2',
      name: 'Organic Honey',
      price: 250,
      stock: 30,
      category: 'Food',
      sold: 38,
    },
    {
      id: 'p3',
      name: 'Woven Bags',
      price: 350,
      stock: 12,
      category: 'Handicrafts',
      sold: 32,
    },
  ]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: '',
  });

  const [orders, setOrders] = useState([
    {
      id: 'ORD-001',
      product: 'Handwoven Baskets',
      quantity: 2,
      customer: 'John Doe',
      status: 'pending' as const,
      total: 900,
      date: '2026-04-29',
    },
    {
      id: 'ORD-002',
      product: 'Organic Honey',
      quantity: 3,
      customer: 'Jane Smith',
      status: 'confirmed' as const,
      total: 750,
      date: '2026-04-28',
    },
    {
      id: 'ORD-003',
      product: 'Woven Bags',
      quantity: 1,
      customer: 'Carlos Lopez',
      status: 'shipped' as const,
      total: 350,
      date: '2026-04-27',
    },
  ]);

  const orderStatusFlow = {
    pending: 'confirmed' as const,
    confirmed: 'shipped' as const,
    shipped: 'delivered' as const,
    delivered: null,
  };

  const stats = [
    { icon: Package, label: 'Total Products', value: products.length.toString(), color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: DollarSign, label: 'Revenue (Month)', value: '₱28,500', color: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: ShoppingCart, label: 'Total Sales', value: '115', color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: TrendingUp, label: 'Growth', value: '+22%', color: 'bg-pink-50', iconColor: 'text-pink-600' },
  ];

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock || !newProduct.category) {
      toast.error('Please fill all fields');
      return;
    }

    const product: Product = {
      id: `p${products.length + 1}`,
      ...newProduct,
      sold: 0,
    };

    setProducts([...products, product]);
    setNewProduct({ name: '', price: 0, stock: 0, category: '' });
    setShowAddProduct(false);
    toast.success('Product added successfully!');
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast.success('Product deleted');
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

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-700 border-orange-300',
      confirmed: 'bg-green-100 text-green-700 border-green-300',
      shipped: 'bg-blue-100 text-blue-700 border-blue-300',
      delivered: 'bg-green-100 text-green-700 border-green-300',
    };
    return `px-3 py-1 rounded-full border text-sm ${styles[status as keyof typeof styles]}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1>Enterprise Profile</h1>
              <p className="text-sm text-muted-foreground">Local Crafts Shop</p>
            </div>
          </div>
          <Link
            to="/enterprise/dashboard"
            className="px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border-2 border-primary/20 rounded-lg p-6"
            >
              <div className={`${stat.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl text-primary">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Products Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2>Product Inventory</h2>
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {showAddProduct && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="mb-4">Add New Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                >
                  <option value="">Select category</option>
                  <option value="Handicrafts">Handicrafts</option>
                  <option value="Food">Food</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Souvenirs">Souvenirs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Price (₱)</label>
                <input
                  type="number"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={newProduct.stock || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddProduct}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add Product
              </button>
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-6 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3">Product Name</th>
                <th className="text-left pb-3">Category</th>
                <th className="text-left pb-3">Price</th>
                <th className="text-left pb-3">Stock</th>
                <th className="text-left pb-3">Sold</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-primary/10">
                  <td className="py-4">{product.name}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-4">₱{product.price}</td>
                  <td className="py-4">
                    <span className={product.stock < 10 ? 'text-orange-600' : 'text-green-600'}>
                      {product.stock} units
                    </span>
                  </td>
                  <td className="py-4">{product.sold}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info('Edit feature coming soon')}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <h2 className="mb-6">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3">Order ID</th>
                <th className="text-left pb-3">Product</th>
                <th className="text-left pb-3">Quantity</th>
                <th className="text-left pb-3">Customer</th>
                <th className="text-left pb-3">Total</th>
                <th className="text-left pb-3">Date</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-primary/10">
                  <td className="py-4">{order.id}</td>
                  <td className="py-4">{order.product}</td>
                  <td className="py-4">{order.quantity}</td>
                  <td className="py-4">{order.customer}</td>
                  <td className="py-4">₱{order.total}</td>
                  <td className="py-4">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="py-4">
                    <span className={getStatusBadge(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4">
                    {orderStatusFlow[order.status] && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 text-sm"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {orderStatusFlow[order.status].charAt(0).toUpperCase() + orderStatusFlow[order.status]!.slice(1)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
