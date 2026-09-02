import { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Edit, Trash2, Package, TrendingUp, BarChart3, ChevronDown, CreditCard, Eye, CheckCircle, XCircle, Calendar, Upload, Image as ImageIcon, X, MapPin, Phone, Mail, Facebook, Instagram, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { getAuthToken, getJSON, getPublicJSON, postJSON, putJSON, patchJSON, deleteJSON, API_BASE } from '../../lib/api';
import { showPaymentMethodSuccess, showProductSuccess, showStatusUpdateSuccess } from '../../lib/sweetAlert';

import { MANSALAY_BARANGAYS } from '../../lib/constants';

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

const CATEGORIES = ['Food', 'Souvenir', 'Handicraft', 'Clothing', 'Agriculture', 'Other'];
const PRODUCTS_PER_PAGE = 5;

export function EnterpriseProfile() {
  const { currentUser, setCurrentUser } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  // Store Profile State (like Resort Profile)
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    store_name: '',
    store_description: '',
    phone: '',
    barangay: 'Barangay I (Poblacion)',
    address: '',
    facebook_link: '',
    instagram_link: '',
  });
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState<string | null>(null);
  const [storeBannerFile, setStoreBannerFile] = useState<File | null>(null);
  const [storeBannerPreview, setStoreBannerPreview] = useState<string | null>(null);
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Product variations (Shopee-style) — optional. Each row has name/value/price/stock.
  const [variations, setVariations] = useState<ProductVariationForm[]>([]);
  
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
    loadStoreProfile();
    fetchPromoCodes();
  }, []);

  const loadStoreProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await getJSON('/enterprise-profile');
      setStoreProfile(data);
      setProfileForm({
        store_name: data?.store_name ?? '',
        store_description: data?.store_description ?? data?.description ?? '',
        phone: data?.phone ?? '',
        barangay: data?.barangay ?? 'Barangay I (Poblacion)',
        address: data?.address ?? '',
        facebook_link: data?.facebook_link ?? '',
        instagram_link: data?.instagram_link ?? '',
      });

      if (data?.store_logo) {
        setStoreLogoPreview(data.store_logo.startsWith('http') ? data.store_logo : `${API_BASE}${data.store_logo}`);
      } else {
        setStoreLogoPreview(null);
      }

      if (data?.store_banner) {
        setStoreBannerPreview(data.store_banner.startsWith('http') ? data.store_banner : `${API_BASE}${data.store_banner}`);
      } else {
        setStoreBannerPreview(null);
      }

      if (data?.latitude && data?.longitude) {
        setStoreLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
      }
    } catch {
      setStoreProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveStoreProfile = async () => {
    if (!profileForm.store_name.trim()) {
      toast.error('Shop / Business name is required');
      return;
    }

    setProfileSaving(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('store_name', profileForm.store_name.trim());
      formData.append('store_description', profileForm.store_description.trim());
      formData.append('phone', profileForm.phone.trim());
      formData.append('barangay', profileForm.barangay);
      formData.append('address', profileForm.address.trim());
      formData.append('facebook_link', profileForm.facebook_link.trim());
      formData.append('instagram_link', profileForm.instagram_link.trim());
      if (storeLocation?.lat && storeLocation?.lng) {
        formData.append('latitude', String(storeLocation.lat));
        formData.append('longitude', String(storeLocation.lng));
      }
      if (storeLogoFile) {
        formData.append('logo', storeLogoFile);
      }
      if (storeBannerFile) {
        formData.append('banner', storeBannerFile);
      }
      formData.append('_method', 'PUT');

      const res = await fetch(`${API_BASE}/api/enterprise-profile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to update store profile');
      }

      const updated = await res.json();
      toast.success('Shop profile updated successfully!');
      setProfileEditMode(false);
      setStoreLogoFile(null);
      setStoreBannerFile(null);
      await loadStoreProfile();

      if (currentUser && updated.user) {
        setCurrentUser({
          ...currentUser,
          store_name: updated.user.store_name,
        } as any);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save store profile');
    } finally {
      setProfileSaving(false);
    }
  };

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
          images: Array.isArray(product.images)
            ? product.images.map((img: string) => (img.startsWith('http') ? img : `${API_BASE}${img}`))
            : (product.image ? [product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`] : []),
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
      icon: CreditCard,
      label: 'Revenue (Live)',
      value: `₱${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}`,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Package,
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
      const form = new FormData();
      form.append('name', newProduct.name);
      form.append('description', newProduct.description ?? '');
      form.append('price', String(newProduct.price));
      form.append('stock', String(newProduct.stock));
      form.append('category', newProduct.category ?? '');

      // Append all multiple image files
      imageFiles.forEach((file) => {
        form.append('images[]', file);
      });

      // Append existing retained images
      if (existingImages.length > 0) {
        form.append('existing_images', JSON.stringify(existingImages));
        form.append('image', existingImages[0]);
      }

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
      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { method: 'POST', headers, body: form });
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
      
      // Refresh product list to show updated images
      await fetchData();

      setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages([]);
      setVariations([]);
      setEditingProductId(null);
      setShowAddProduct(false);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files]);
      const newUrls = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const existingCount = existingImages.length;
    if (index < existingCount) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIdx = index - existingCount;
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIdx));
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProduct = (product: any) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
    const imgs: string[] = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.image ? [product.image] : []);
    setExistingImages(imgs);
    setImagePreviews(imgs);
    setImageFiles([]);
    // Populate variation rows so the owner can tweak them
    setVariations(
      Array.isArray(product.variations)
        ? product.variations.map((v: any) => ({
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
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Products</h1>
              <p className="text-sm text-muted-foreground">Add, update, and manage your inventory and product listings</p>
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
                      src={`${API_BASE}${receipt.receipt_image}`}
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
                <label className="block text-sm font-medium mb-1">
                  Product Images (Multiple allowed)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload multiple photos of your product to showcase different angles, details, and packaging.
                </p>

                <div className="space-y-3">
                  <label className="cursor-pointer block">
                    <div className="w-full px-4 py-3.5 border-2 border-dashed border-primary/30 hover:border-primary rounded-xl transition-colors bg-white flex items-center justify-between group">
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Upload className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <span>
                          {imagePreviews.length > 0
                            ? `${imagePreviews.length} image${imagePreviews.length > 1 ? 's' : ''} selected (Click to add more)`
                            : 'Choose product photos (You can select multiple)...'}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-xs">
                        Browse Files
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {/* Multiple Image Previews Grid */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {imagePreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border-2 border-primary/20 aspect-square bg-gray-100 shadow-2xs"
                        >
                          <img
                            src={preview}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-md shadow-xs">
                              Cover Photo
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer opacity-90 hover:opacity-100 hover:scale-110"
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
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

        {(() => {
          const totalProductPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
          const safePage = Math.min(productPage, totalProductPages);
          const paginatedProducts = products.slice((safePage - 1) * PRODUCTS_PER_PAGE, safePage * PRODUCTS_PER_PAGE);
          return (
            <>
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
                      paginatedProducts.map(product => (
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

              {/* Pagination Controls */}
              {products.length > PRODUCTS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    Showing {(safePage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(safePage * PRODUCTS_PER_PAGE, products.length)} of {products.length} products
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 text-sm border-2 border-primary/20 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalProductPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setProductPage(page)}
                          className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                            page === safePage
                              ? 'bg-primary text-white'
                              : 'border-2 border-primary/20 hover:bg-primary/5 text-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                      disabled={safePage === totalProductPages}
                      className="px-3 py-1.5 text-sm border-2 border-primary/20 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
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
                            src={`${API_BASE}${receipt.receipt_image}`}
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