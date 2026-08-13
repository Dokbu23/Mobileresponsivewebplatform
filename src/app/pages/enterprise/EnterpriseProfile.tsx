import { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Edit, Trash2, Package, DollarSign, ShoppingCart, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getAuthToken, getJSON, getPublicJSON, postJSON, putJSON, patchJSON, deleteJSON, API_BASE } from '../../lib/api';
import { showPaymentMethodSuccess, showProductSuccess, showStatusUpdateSuccess } from '../../lib/sweetAlert';
import { LocationPicker } from '../../components/LocationPicker';

interface ProductVariationForm {
  id?: number;
  name: string;
  value: string;
  price: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  variations?: ProductVariationForm[];
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

interface Event {
  id: number;
  name: string;
  location: string | null;
  category: string | null;
  image: string | null;
  date: string | null;
  time: string | null;
  capacity: string | null;
  description: string | null;
  full_description: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Festival', 'Concert', 'Workshop', 'Sports', 'Cultural', 'Other'];

export function EnterpriseProfile() {
  const { currentUser } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Product variations (Shopee-style) — optional. Each row has name/value/price/stock.
  const [variations, setVariations] = useState<ProductVariationForm[]>([]);
  
  // Event management state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    category: '',
    date: '',
    time: '',
    capacity: '',
    description: '',
    full_description: '',
  });
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  
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
  const [enterpriseLocation, setEnterpriseLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Promo code state
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: '', description: '', type: 'percent', value: '', min_amount: '', max_uses: '', expires_at: '', is_active: true,
  });
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  const orderStatusFlow: Record<string, string | null> = {
    pending: 'confirmed',
    confirmed: 'shipped',
    shipped: 'delivered',
    delivered: null,
  };

  useEffect(() => {
    fetchData();
    fetchSubscriptionStatus();
    // Load saved location
    getJSON('/me').then((me: any) => {
      if (me?.latitude && me?.longitude) {
        setEnterpriseLocation({ lat: Number(me.latitude), lng: Number(me.longitude) });
      }
    }).catch(() => {});
    fetchPromoCodes();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const statusResponse = await getJSON('/subscription/status');
      setSubscriptionStatus(statusResponse);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const res = await getJSON('/promo-codes');
      setPromoCodes(Array.isArray(res) ? res : []);
    } catch { setPromoCodes([]); }
  };

  const resetPromoForm = () => {
    setPromoForm({ code: '', description: '', type: 'percent', value: '', min_amount: '', max_uses: '', expires_at: '', is_active: true });
    setEditingPromoId(null);
    setShowPromoForm(false);
  };

  const handleSavePromo = async () => {
    if (!promoForm.code.trim() || !promoForm.value) {
      toast.error('Code and discount value are required');
      return;
    }
    setPromoSubmitting(true);
    try {
      const payload: any = {
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description || undefined,
        type: promoForm.type,
        value: Number(promoForm.value),
        min_amount: promoForm.min_amount ? Number(promoForm.min_amount) : 0,
        max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : undefined,
        expires_at: promoForm.expires_at || undefined,
        is_active: promoForm.is_active,
      };
      if (editingPromoId) {
        await patchJSON(`/promo-codes/${editingPromoId}`, payload);
        toast.success('Promo code updated');
      } else {
        await postJSON('/promo-codes', payload);
        toast.success('Promo code created');
      }
      resetPromoForm();
      await fetchPromoCodes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save promo code');
    } finally {
      setPromoSubmitting(false);
    }
  };

  const handleEditPromo = (p: any) => {
    setEditingPromoId(p.id);
    setPromoForm({
      code: p.code, description: p.description || '', type: p.type,
      value: String(p.value), min_amount: String(p.min_amount || ''),
      max_uses: p.max_uses ? String(p.max_uses) : '',
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : '',
      is_active: p.is_active,
    });
    setShowPromoForm(true);
  };

  const handleDeletePromo = async (id: number) => {
    try {
      await deleteJSON(`/promo-codes/${id}`);
      toast.success('Promo code deleted');
      await fetchPromoCodes();
    } catch { toast.error('Failed to delete'); }
  };

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
            ? (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`)
            : '',
          variations: Array.isArray(product.variations)
            ? product.variations.map((v: any) => ({
                id: v.id,
                name: v.name || '',
                value: v.value || '',
                price: v.price != null ? Number(v.price) : null,
                stock: Number(v.stock) || 0,
              }))
            : [],
        }))
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    }

    try {
      const ordersResponse = await getJSON('/orders/my');  // Changed from /orders/my to match the route
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
    }

    try {
      const eventsResponse = await getJSON('/events/my');
      setEvents(
        Array.isArray(eventsResponse)
          ? eventsResponse.map((event: any) => ({
              id: event.id,
              name: event.name || '',
              location: event.location || null,
              category: event.category || null,
              image: event.image || null,
              date: event.date || null,
              time: event.time || null,
              capacity: event.capacity || null,
              description: event.description || null,
              full_description: event.full_description || null,
              user_id: event.user_id || null,
              created_at: event.created_at || new Date().toISOString(),
              updated_at: event.updated_at || new Date().toISOString(),
            }))
          : []
      );
    } catch (error) {
      console.error('Error fetching events:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load events');
      setEvents([]);
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

    // Build clean variations list — only rows with both name and value are kept.
    const cleanVariations = variations
      .filter(v => v.name.trim() && v.value.trim())
      .map(v => ({
        name: v.name.trim(),
        value: v.value.trim(),
        price: v.price !== null && !Number.isNaN(v.price) ? v.price : null,
        stock: Number.isFinite(v.stock) ? v.stock : 0,
      }));

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

        // Always send the variations payload so the backend can sync (empty
        // array means "remove all variations on update").
        form.append('variations', JSON.stringify(cleanVariations));

        // Add user_id to track product ownership
        if (currentUser?.id) {
          form.append('user_id', String(currentUser.id));
        }
        
          // Use POST with _method override for PUT (Laravel supports PUT for updates)
          if (editingProductId) {
            form.append('_method', 'PUT');
          }

        const url = editingProductId ? `${API_BASE}/api/products/${editingProductId}` : `${API_BASE}/api/products`;
          const method = 'POST';  // Always POST when sending FormData (Laravel uses _method override)

        try {
          const token = getAuthToken();
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(url, { method, headers, body: form });
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
            variations: cleanVariations,
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
            variations: cleanVariations,
          });
          await showProductSuccess('added', newProduct.name);
          await fetchData();
        }
      }

      setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
      setImageFile(null);
      setImagePreview(null);
      setVariations([]);
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
    // Populate variation rows so the owner can tweak them
    setVariations(
      Array.isArray(product.variations)
        ? product.variations.map(v => ({
            id: v.id,
            name: v.name,
            value: v.value,
            price: v.price,
            stock: v.stock,
          }))
        : []
    );
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteJSON(`/products/${id}`);
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
      await patchJSON(`/orders/${orderId}`, { status: nextStatus });
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
      const response = await getJSON('/payment-details');
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
      const updatedPayments = [...paymentDetails, { ...newPayment }];
      await patchJSON('/payment-details', { payment_details: updatedPayments });
      
      setPaymentDetails(updatedPayments);
      setNewPayment({ type: 'gcash', name: '', account_number: '', account_name: '' });
      setShowPaymentForm(false);
      await showPaymentMethodSuccess('added', newPayment.name || 'Payment method');
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
      await showPaymentMethodSuccess('deleted', 'Payment method');
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
      await getJSON('/test-auth');
    } catch (error) {
      console.error('Auth test error:', error);
    }
  };

  // Event Management Functions
  const handleAddEvent = async () => {
    if (!newEvent.name.trim()) {
      toast.error('Event name is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newEvent.name);
      if (newEvent.location) formData.append('location', newEvent.location);
      if (newEvent.category) formData.append('category', newEvent.category);
      if (newEvent.date) formData.append('date', newEvent.date);
      if (newEvent.time) formData.append('time', newEvent.time);
      if (newEvent.capacity) formData.append('capacity', newEvent.capacity);
      if (newEvent.description) formData.append('description', newEvent.description);
      if (newEvent.full_description) formData.append('full_description', newEvent.full_description);
      if (eventImageFile) formData.append('image', eventImageFile);

      if (editingEventId) {
        formData.append('_method', 'PUT');
      }

      const url = editingEventId ? `${API_BASE}/api/events/${editingEventId}` : `${API_BASE}/api/events`;
      const method = 'POST';

      const token = getAuthToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        : { Accept: 'application/json' };
      const res = await fetch(url, { method, headers, body: formData });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorMsg = `HTTP ${res.status}`;
        if (contentType?.includes('application/json')) {
          try {
            const data = await res.json();
            console.error('Event creation error data:', data);
            errorMsg = data.message || data.error || JSON.stringify(data);
          } catch {
            errorMsg = await res.text().catch(() => errorMsg);
          }
        } else {
          errorMsg = await res.text().catch(() => errorMsg);
        }
        throw new Error(errorMsg);
      }

      await showProductSuccess(editingEventId ? 'updated' : 'added', newEvent.name);
      await fetchData();
      setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
      setEventImageFile(null);
      setEventImagePreview(null);
      setEditingEventId(null);
      setShowAddEvent(false);
    } catch (error) {
      console.error('Event creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setNewEvent({
      name: event.name,
      location: event.location || '',
      category: event.category || '',
      date: event.date || '',
      time: event.time || '',
      capacity: event.capacity || '',
      description: event.description || '',
      full_description: event.full_description || '',
    });
    setEventImagePreview(event.image ? getEventImageUrl(event.image) : null);
    setEventImageFile(null);
    setShowAddEvent(true);
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await deleteJSON(`/events/${id}`);
      await showProductSuccess('deleted');
      await fetchData();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const getEventImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE}${imagePath}`;
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

      {/* Promo Codes Management */}
      <div className="bg-white border-2 border-primary/20 rounded-2xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 flex items-center justify-between border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-lg">🏷️</div>
            <div>
              <h2 className="text-base font-bold">Promo Codes</h2>
              <p className="text-xs text-muted-foreground">Create discount codes for your customers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{promoCodes.length} codes</span>
            <button
              onClick={() => { resetPromoForm(); setShowPromoForm(true); }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              + Add Code
            </button>
          </div>
        </div>

        <div className="p-6">
          {showPromoForm && (
            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-5 mb-6">
              <h3 className="font-bold mb-4">{editingPromoId ? 'Edit Promo Code' : 'New Promo Code'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Code *</label>
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm font-mono"
                    placeholder="e.g. SUMMER20"
                    disabled={!!editingPromoId}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Discount Type *</label>
                  <select
                    value={promoForm.type}
                    onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₱)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Discount Value * {promoForm.type === 'percent' ? '(%)' : '(₱)'}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={promoForm.type === 'percent' ? 100 : undefined}
                    value={promoForm.value}
                    onChange={e => setPromoForm(p => ({ ...p, value: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                    placeholder={promoForm.type === 'percent' ? 'e.g. 20' : 'e.g. 100'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Min. Order Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.min_amount}
                    onChange={e => setPromoForm(p => ({ ...p, min_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                    placeholder="0 = no minimum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Max Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.max_uses}
                    onChange={e => setPromoForm(p => ({ ...p, max_uses: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                    placeholder="Leave blank = unlimited"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={promoForm.expires_at}
                    onChange={e => setPromoForm(p => ({ ...p, expires_at: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                  <input
                    type="text"
                    value={promoForm.description}
                    onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-white rounded-xl focus:border-primary outline-none bg-white text-sm"
                    placeholder="e.g. Summer sale discount"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-11 h-6 rounded-full transition-colors relative ${promoForm.is_active ? 'bg-primary' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promoForm.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm(p => ({ ...p, is_active: e.target.checked }))} className="sr-only" />
                    </div>
                    <span className="text-sm font-medium">Code is active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-primary/10">
                <button onClick={handleSavePromo} disabled={promoSubmitting} className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-70">
                  {promoSubmitting ? 'Saving...' : editingPromoId ? 'Update Code' : 'Create Code'}
                </button>
                <button onClick={resetPromoForm} className="px-6 py-2.5 bg-white border-2 border-primary/20 text-muted-foreground rounded-xl hover:border-primary hover:text-primary transition-colors text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {promoCodes.length === 0 && !showPromoForm ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏷️</div>
              <p className="font-semibold text-muted-foreground mb-1">No promo codes yet</p>
              <p className="text-sm text-muted-foreground">Create discount codes to attract more customers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoCodes.map(p => (
                <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-2 ${p.is_active ? 'border-primary/20 bg-primary/5' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-primary text-lg">{p.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.type === 'percent' ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'}`}>
                        {p.type === 'percent' ? `${p.value}% OFF` : `₱${p.value} OFF`}
                      </span>
                      {!p.is_active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {p.min_amount > 0 && <span>Min: ₱{p.min_amount}</span>}
                      <span>Used: {p.used_count}{p.max_uses ? `/${p.max_uses}` : ''}</span>
                      {p.expires_at && <span>Expires: {new Date(p.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditPromo(p)} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors text-xs font-semibold">Edit</button>
                    <button onClick={() => handleDeletePromo(p.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-xs font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Payment Receipts — shown prominently when there are pending receipts */}
      {receipts.filter((r: any) => r.status === 'pending').length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl overflow-hidden mb-8">
          <div className="bg-orange-100 px-6 py-4 flex items-center justify-between border-b border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-orange-900">Pending Payment Receipts</h2>
                <p className="text-xs text-orange-700">Verify these payments to start processing orders</p>
              </div>
            </div>
            <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              {receipts.filter((r: any) => r.status === 'pending').length} pending
            </span>
          </div>
          <div className="p-6 space-y-4">
            {receipts.filter((r: any) => r.status === 'pending').map((receipt: any) => (
              <div key={receipt.id} className="bg-white rounded-xl border border-orange-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Receipt image */}
                  <div className="flex-shrink-0">
                    <img
                      src={`http://localhost:8000${receipt.receipt_image}`}
                      alt="Payment receipt"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-orange-100"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  {/* Receipt details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold">
                          {receipt.type === 'order' ? '🛍️ Product Order' : '🏨 Accommodation Booking'} — ₱{Number(receipt.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          From: <span className="font-medium">{receipt.tourist?.name ?? 'Customer'}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Via: <span className="uppercase font-medium text-primary">{receipt.payment_method}</span>
                          {receipt.payment_reference && ` · Ref: ${receipt.payment_reference}`}
                        </p>
                        {receipt.notes && (
                          <p className="text-xs text-muted-foreground mt-1">Note: {receipt.notes}</p>
                        )}
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full whitespace-nowrap font-medium">
                        Awaiting Verification
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, 'verified')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify & Process
                      </button>
                      <button
                        onClick={() => handleVerifyReceipt(receipt.id, 'rejected', 'Invalid receipt')}
                        className="flex-1 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store Location */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-lg">📍</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Store Location</h2>
              <p className="text-sm text-muted-foreground">Pin your store on the Mansalay map so tourists can find you</p>
            </div>
          </div>
          {enterpriseLocation && (
            <button
              onClick={async () => {
                try {
                  await patchJSON('/profile/location', { latitude: enterpriseLocation.lat, longitude: enterpriseLocation.lng });
                  import('sonner').then(({ toast }) => toast.success('Location saved!'));
                } catch {
                  import('sonner').then(({ toast }) => toast.error('Failed to save location'));
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Save Location
            </button>
          )}
        </div>
        <LocationPicker
          initialLat={enterpriseLocation?.lat}
          initialLng={enterpriseLocation?.lng}
          onLocationSelect={(lat, lng) => setEnterpriseLocation({ lat, lng })}
          height="280px"
        />
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
              if (subscriptionStatus?.subscription_status !== 'paid') {
                toast.error('Subscription required to add products');
                return;
              }
              setShowAddProduct(!showAddProduct);
              if (showAddProduct) {
                setEditingProductId(null);
                setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
                setVariations([]);
              }
            }}
            disabled={subscriptionStatus?.subscription_status !== 'paid'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Product Variations (Optional) — Shopee-style */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-sm font-medium">Product Variations (Optional)</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add variations if your product comes in different sizes, colors, or types
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setVariations(prev => [
                        ...prev,
                        { name: '', value: '', price: null, stock: 0 },
                      ])
                    }
                    className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-1 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    Add Variation
                  </button>
                </div>

                {variations.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-primary/20 rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No variations yet. Click <strong>Add Variation</strong> to add sizes, colors, etc.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variations.map((variation, idx) => (
                      <div
                        key={idx}
                        className="bg-white border-2 border-primary/20 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-start"
                      >
                        <div className="md:col-span-3">
                          <label className="block text-xs text-muted-foreground mb-1">Name</label>
                          <input
                            type="text"
                            value={variation.name}
                            onChange={e =>
                              setVariations(prev =>
                                prev.map((v, i) =>
                                  i === idx ? { ...v, name: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder="e.g., Size"
                            className="w-full px-2 py-2 border border-primary/20 rounded focus:border-primary outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-muted-foreground mb-1">Value</label>
                          <input
                            type="text"
                            value={variation.value}
                            onChange={e =>
                              setVariations(prev =>
                                prev.map((v, i) =>
                                  i === idx ? { ...v, value: e.target.value } : v,
                                ),
                              )
                            }
                            placeholder="e.g., Small"
                            className="w-full px-2 py-2 border border-primary/20 rounded focus:border-primary outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-muted-foreground mb-1">
                            Price (optional)
                          </label>
                          <input
                            type="number"
                            value={variation.price ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              setVariations(prev =>
                                prev.map((v, i) =>
                                  i === idx
                                    ? { ...v, price: val === '' ? null : parseFloat(val) }
                                    : v,
                                ),
                              );
                            }}
                            placeholder="Uses base price"
                            className="w-full px-2 py-2 border border-primary/20 rounded focus:border-primary outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">Stock</label>
                          <input
                            type="number"
                            value={variation.stock || ''}
                            onChange={e =>
                              setVariations(prev =>
                                prev.map((v, i) =>
                                  i === idx
                                    ? { ...v, stock: parseInt(e.target.value) || 0 }
                                    : v,
                                ),
                              )
                            }
                            placeholder="0"
                            className="w-full px-2 py-2 border border-primary/20 rounded focus:border-primary outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-1 flex md:justify-center md:items-end md:h-full">
                          <button
                            type="button"
                            onClick={() =>
                              setVariations(prev => prev.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors mt-5 md:mt-0"
                            title="Remove variation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Tip: Group by the same <strong>Name</strong> (e.g., "Size") to show options
                      together. Leave <strong>Price</strong> empty to use the base product price.
                    </p>
                  </div>
                )}
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
                  setVariations([]);
                  setImageFile(null);
                  setImagePreview(null);
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
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to edit products');
                              return;
                            }
                            handleEditProduct(product);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to delete products');
                              return;
                            }
                            handleDeleteProduct(product.id);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Event Management */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Event Management</h2>
              <p className="text-sm text-muted-foreground">Manage your events and activities</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (subscriptionStatus?.subscription_status !== 'paid') {
                toast.error('Subscription required to add events');
                return;
              }
              setShowAddEvent(!showAddEvent);
              if (showAddEvent) {
                setEditingEventId(null);
                setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
                setEventImageFile(null);
                setEventImagePreview(null);
              }
            }}
            disabled={subscriptionStatus?.subscription_status !== 'paid'}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>

        {showAddEvent && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{editingEventId ? 'Edit Event' : 'Add New Event'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter event name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newEvent.category}
                  onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Capacity</label>
                <input
                  type="text"
                  value={newEvent.capacity}
                  onChange={e => setNewEvent({ ...newEvent, capacity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                  placeholder="e.g., 100 people"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Short Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white resize-none"
                  placeholder="Brief description of the event"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Full Description</label>
                <textarea
                  value={newEvent.full_description}
                  onChange={e => setNewEvent({ ...newEvent, full_description: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white resize-none"
                  placeholder="Detailed description of the event"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Event Image</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors bg-white flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {eventImageFile ? eventImageFile.name : 'Choose image file...'}
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
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast.error('Image size must be less than 5MB');
                            return;
                          }
                          setEventImageFile(f);
                          setEventImagePreview(f ? URL.createObjectURL(f) : null);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {eventImagePreview && (
                    <div className="relative w-full max-w-xs">
                      <img 
                        src={eventImagePreview} 
                        alt="Event preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEventImageFile(null);
                          setEventImagePreview(null);
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
                onClick={handleAddEvent}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {editingEventId ? 'Update Event' : 'Add Event'}
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEventId(null);
                  setNewEvent({ name: '', location: '', category: '', date: '', time: '', capacity: '', description: '', full_description: '' });
                  setEventImageFile(null);
                  setEventImagePreview(null);
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
                <th className="text-left pb-3 font-semibold">Event Name</th>
                <th className="text-left pb-3 font-semibold">Category</th>
                <th className="text-left pb-3 font-semibold">Date</th>
                <th className="text-left pb-3 font-semibold">Location</th>
                <th className="text-left pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No events yet
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="border-b border-primary/10">
                    <td className="py-4">
                      {event.image ? (
                        <img 
                          src={getEventImageUrl(event.image) || ''} 
                          alt={event.name}
                          className="w-16 h-16 object-cover rounded border-2 border-primary/20"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/default-event.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="py-4">{event.name}</td>
                    <td className="py-4">
                      {event.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{event.category}</span>
                      )}
                    </td>
                    <td className="py-4">
                      {event.date ? new Date(event.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4">{event.location || '-'}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to edit events');
                              return;
                            }
                            handleEditEvent(event);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (subscriptionStatus?.subscription_status !== 'paid') {
                              toast.error('Subscription required to delete events');
                              return;
                            }
                            handleDeleteEvent(event.id);
                          }}
                          disabled={subscriptionStatus?.subscription_status !== 'paid'}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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