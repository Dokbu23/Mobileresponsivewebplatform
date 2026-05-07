import { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Edit, Trash2, Package, DollarSign, ShoppingCart, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getAuthToken, getJSON, getPublicJSON, postJSON, putJSON, patchJSON } from '../../lib/api';
import { showProductSuccess, showStatusUpdateSuccess } from '../../lib/sweetAlert';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
}

interface OrderItem {
  name?: string;
  quantity?: number;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  payment_method: 'online' | 'otc' | null;
  created_at: string;
}

export function EnterpriseProfile() {
  const { currentUser } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'gcash',
    name: '',
    account_number: '',
    account_name: '',
  });
  const [receipts, setReceipts] = useState<any[]>([]);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);

  const orderStatusFlow: Record<string, string | null> = {
    pending: 'confirmed',
    confirmed: 'shipped',
    shipped: 'delivered',
    delivered: null,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const productsResponse = await getPublicJSON('/products');
      const rawProducts = Array.isArray(productsResponse) ? productsResponse : [];
      const filteredProducts = currentUser?.id
        ? rawProducts.filter((product: any) => Number(product.user_id ?? product.userId) === currentUser.id)
        : rawProducts;

      setProducts(
        filteredProducts.map((product: any) => ({
          id: String(product.id),
          name: product.name || '',
          description: product.description || '',
          price: Number(product.price) || 0,
          stock: Number(product.stock) || 0,
          category: product.category || '',
          image: product.image
            ? (product.image.startsWith('http') ? product.image : `http://localhost:8000${product.image}`)
            : '',
        }))
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    }

    try {
      const ordersResponse = await getJSON('/orders/my');
      setOrders(
        Array.isArray(ordersResponse)
          ? ordersResponse.map((order: any) => ({
              id: order.id,
              items: Array.isArray(order.items) ? order.items : [],
              total: Number(order.total) || 0,
              status: order.status || 'pending',
              payment_method: order.payment_method || null,
              created_at: order.created_at || new Date().toISOString(),
            }))
          : []
      );
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const soldByProduct = useMemo(() => {
    const sales = new Map<string, number>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.name || 'Product';
        sales.set(name, (sales.get(name) ?? 0) + (item.quantity ?? 1));
      });
    });
    return sales;
  }, [orders]);

  const stats = [
    {
      icon: Package,
      label: 'Total Products',
      value: products.length.toString(),
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Revenue (Live)',
      value: `₱${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}`,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: ShoppingCart,
      label: 'Total Sales',
      value: orders
        .reduce((sum, order) => sum + order.items.reduce((total, item) => total + (item.quantity || 0), 0), 0)
        .toString(),
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Growth',
      value: `${Math.max(products.length - 1, 0)} live`,
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock || !newProduct.category) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      // If an image file was selected, send FormData (supports file upload)
      if (imageFile) {
        const form = new FormData();
        form.append('name', newProduct.name);
        form.append('description', newProduct.description ?? '');
        form.append('price', String(newProduct.price));
        form.append('stock', String(newProduct.stock));
        form.append('category', newProduct.category ?? '');
        form.append('image', imageFile);
        
        // Add user_id to track product ownership
        if (currentUser?.id) {
          form.append('user_id', String(currentUser.id));
        }
        
          // Use POST with _method override for PUT (Laravel supports PUT for updates)
          if (editingProductId) {
            form.append('_method', 'PUT');
          }

        const baseUrl = 'http://localhost:8000';
        const url = editingProductId ? `${baseUrl}/api/products/${editingProductId}` : `${baseUrl}/api/products`;
          const method = 'POST';  // Always POST when sending FormData (Laravel uses _method override)

        try {
          const token = getAuthToken();
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(url, { method, headers, body: form });
          console.log('Upload response:', { status: res.status, ok: res.ok, contentType: res.headers.get('content-type') });
          const contentType = res.headers.get('content-type');
          let errorMsg = `HTTP ${res.status}`;

          if (!res.ok) {
            // Try to parse JSON error response
            if (contentType?.includes('application/json')) {
              try {
                const data = await res.json();
                errorMsg = data.message || data.error || JSON.stringify(data);
              } catch {
                errorMsg = await res.text().catch(() => errorMsg);
              }
            } else {
              errorMsg = await res.text().catch(() => errorMsg);
            }
            throw new Error(errorMsg);
          }

          await showProductSuccess(editingProductId ? 'updated' : 'added', newProduct.name);
          
          // Refresh product list to show updated image
          await fetchData();
        } catch (err) {
          console.error('Upload error:', err);
          throw err;
        }
      } else {
        if (editingProductId) {
          await putJSON(`/products/${editingProductId}`, {
            name: newProduct.name,
            description: newProduct.description,
            price: newProduct.price,
            stock: newProduct.stock,
            category: newProduct.category,
          });
          await showProductSuccess('updated', newProduct.name);
          await fetchData();
        } else {
          await postJSON('/products', {
            name: newProduct.name,
            description: newProduct.description,
            price: newProduct.price,
            stock: newProduct.stock,
            category: newProduct.category,
            image: '',
            user_id: currentUser?.id, // Track product ownership
          });
          await showProductSuccess('added', newProduct.name);
          await fetchData();
        }
      }

      setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
      setImageFile(null);
      setImagePreview(null);
      setEditingProductId(null);
      setShowAddProduct(false);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
    setImagePreview(product.image || null);
    setImageFile(null);
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/products/${id}`, { method: 'DELETE' });
      await showProductSuccess('deleted');
      await fetchData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, currentStatus: string) => {
    const nextStatus = orderStatusFlow[currentStatus];
    if (!nextStatus) {
      toast.error('No further status available');
      return;
    }

    try {
      await patchJSON(`/api/orders/${orderId}`, { status: nextStatus });
      await showStatusUpdateSuccess('order', `ORD-${String(orderId).padStart(3, '0')}`, nextStatus);
      await fetchData();
    } catch {
      toast.error('Failed to update order');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 border-orange-300',
      confirmed: 'bg-green-100 text-green-700 border-green-300',
      shipped: 'bg-blue-100 text-blue-700 border-blue-300',
      delivered: 'bg-green-100 text-green-700 border-green-300',
    };
    return `px-3 py-1 rounded-full border text-sm ${styles[status] || 'bg-gray-100 text-gray-700'}`;
  };

  // Payment Details Functions
  const fetchPaymentDetails = async () => {
    try {
      console.log('Fetching payment details...');
      const response = await getJSON('/me');
      console.log('Payment details response:', response);
      setPaymentDetails(response.payment_details || []);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.name || !newPayment.account_number || !newPayment.account_name) {
      toast.error('Please fill all payment fields');
      return;
    }

    try {
      console.log('Adding payment method:', newPayment);
      const updatedPayments = [...paymentDetails, { ...newPayment }];
      console.log('Sending payment details:', { payment_details: updatedPayments });
      
      const response = await patchJSON('/payment-details', { payment_details: updatedPayments });
      console.log('Add payment response:', response);
      
      setPaymentDetails(updatedPayments);
      setNewPayment({ type: 'gcash', name: '', account_number: '', account_name: '' });
      setShowPaymentForm(false);
      await showProductSuccess('added', 'payment method');
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      const updatedPayments = paymentDetails.filter((_, i) => i !== index);
      await patchJSON('/payment-details', { payment_details: updatedPayments });
      setPaymentDetails(updatedPayments);
      await showProductSuccess('deleted', 'payment method');
    } catch (error) {
      toast.error('Failed to delete payment method');
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await getJSON('/payment-receipts');
      setReceipts(response || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const handleVerifyReceipt = async (receiptId: number, status: 'verified' | 'rejected', notes?: string) => {
    try {
      await patchJSON(`/payment-receipts/${receiptId}/verify`, { status, notes });
      await fetchReceipts();
      await showProductSuccess(status === 'verified' ? 'updated' : 'deleted', `receipt ${status}`);
    } catch (error) {
      toast.error(`Failed to ${status} receipt`);
    }
  };

  // Load payment details and receipts on component mount
  useEffect(() => {
    fetchPaymentDetails();
    fetchReceipts();
    
    // Test authentication
    testAuth();
  }, []);

  const testAuth = async () => {
    try {
      console.log('Testing authentication...');
      const response = await getJSON('/test-auth');
      console.log('Auth test response:', response);
    } catch (error) {
      console.error('Auth test error:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Enterprise Profile</h1>
              <p className="text-sm text-muted-foreground">{currentUser?.name || 'Live product management'}</p>
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
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border-2 border-primary/20 rounded-lg p-6">
              <div className={`${stat.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl text-primary font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Payment Details Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Payment Details</h2>
              <p className="text-sm text-muted-foreground">Manage your payment methods for customer transactions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowReceiptsModal(true);
                fetchReceipts();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Receipts ({receipts.length})
            </button>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Payment Method
            </button>
          </div>
        </div>

        {/* Payment Methods List */}
        {paymentDetails.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {paymentDetails.map((payment, index) => (
              <div key={index} className="border-2 border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary uppercase">{payment.type}</span>
                  <button
                    onClick={() => handleDeletePayment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-semibold">{payment.name}</p>
                <p className="text-sm text-muted-foreground">{payment.account_number}</p>
                <p className="text-sm text-muted-foreground">{payment.account_name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Payment Form */}
        {showPaymentForm && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Payment Type *</label>
                <select
                  value={newPayment.type}
                  onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                >
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                  <option value="bank_account">Bank Account</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Display Name *</label>
                <input
                  type="text"
                  value={newPayment.name}
                  onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="e.g., My GCash, Business Account"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Number *</label>
                <input
                  type="text"
                  value={newPayment.account_number}
                  onChange={(e) => setNewPayment({ ...newPayment, account_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="09123456789 or Account Number"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Name *</label>
                <input
                  type="text"
                  value={newPayment.account_name}
                  onChange={(e) => setNewPayment({ ...newPayment, account_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          </div>
        )}

        {paymentDetails.length === 0 && !showPaymentForm && (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment methods added yet</p>
            <p className="text-sm">Add payment methods so customers can pay for your products</p>
          </div>
        )}
      </div>

      {/* Products Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Product Inventory</h2>
          <button
            onClick={() => {
              setShowAddProduct(!showAddProduct);
              if (showAddProduct) {
                setEditingProductId(null);
                setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {showAddProduct && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{editingProductId ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
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
                <label className="block text-sm font-medium mb-2">Price (₱)</label>
                <input
                  type="number"
                  value={newProduct.price || ''}
                  onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={newProduct.stock || ''}
                  onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white resize-none"
                  placeholder="Enter product description..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors bg-white flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {imageFile ? imageFile.name : 'Choose image file...'}
                        </span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded">
                          Browse
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null;
                          setImageFile(f);
                          setImagePreview(f ? URL.createObjectURL(f) : null);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="relative w-full max-w-xs">
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddProduct}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {editingProductId ? 'Update Product' : 'Add Product'}
              </button>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setEditingProductId(null);
                  setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
                }}
                className="px-6 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
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
                <th className="text-left pb-3 font-semibold">Image</th>
                <th className="text-left pb-3 font-semibold">Product Name</th>
                <th className="text-left pb-3 font-semibold">Category</th>
                <th className="text-left pb-3 font-semibold">Price</th>
                <th className="text-left pb-3 font-semibold">Stock</th>
                <th className="text-left pb-3 font-semibold">Sold</th>
                <th className="text-left pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    No products yet
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="border-b border-primary/10">
                    <td className="py-4">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded border-2 border-primary/20"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/default-product.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="py-4">{product.name}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{product.category}</span>
                    </td>
                    <td className="py-4">₱{product.price.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={product.stock < 10 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="py-4">{soldByProduct.get(product.name) || 0}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left pb-3 font-semibold">Order ID</th>
                <th className="text-left pb-3 font-semibold">Items</th>
                <th className="text-left pb-3 font-semibold">Total</th>
                <th className="text-left pb-3 font-semibold">Date</th>
                <th className="text-left pb-3 font-semibold">Status</th>
                <th className="text-left pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-primary/10">
                    <td className="py-4">ORD-{String(order.id).padStart(3, '0')}</td>
                    <td className="py-4 text-sm">
                      {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </td>
                    <td className="py-4">₱{order.total.toLocaleString()}</td>
                    <td className="py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-4">
                      <span className={getStatusBadge(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4">
                      {orderStatusFlow[order.status] && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, order.status)}
                          className="px-3 py-2 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
                        >
                          <ChevronDown className="h-3 w-3" />
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipts Modal */}
      {showReceiptsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Payment Receipts</h3>
                <button
                  onClick={() => setShowReceiptsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {receipts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment receipts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receipts.map((receipt: any) => (
                    <div key={receipt.id} className="border-2 border-primary/20 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold">
                            {receipt.type === 'order' ? 'Product Order' : 'Accommodation Booking'} - ₱{receipt.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From: {receipt.tourist?.name} | {receipt.payment_method}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                          {receipt.payment_reference && (
                            <p className="text-sm text-muted-foreground">
                              Ref: {receipt.payment_reference}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            receipt.status === 'verified' 
                              ? 'bg-green-100 text-green-700' 
                              : receipt.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {receipt.status}
                          </span>
                        </div>
                      </div>
                      
                      {receipt.receipt_image && (
                        <div className="mb-4">
                          <img 
                            src={`http://localhost:8000${receipt.receipt_image}`}
                            alt="Payment Receipt"
                            className="max-w-xs h-auto border rounded"
                          />
                        </div>
                      )}

                      {receipt.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                          <p className="text-sm"><strong>Notes:</strong> {receipt.notes}</p>
                        </div>
                      )}

                      {receipt.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyReceipt(receipt.id, 'verified')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Verify Payment
                          </button>
                          <button
                            onClick={() => handleVerifyReceipt(receipt.id, 'rejected', 'Invalid receipt')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}