import { useState, useEffect } from 'react';
import { Hotel, Store, Check, X, Clock, Package, Search, Filter, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { getJSON, patchJSON, deleteJSON, getLegacyJSON, API_BASE } from '../../lib/api';
import { showSuccessAlert, showConfirmDialog } from '../../lib/sweetAlert';

interface Listing {
  id: string;
  type: 'resort' | 'enterprise';
  name: string;
  owner: string;
  email: string;
  phone?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  category: string | null;
  user_id: number | null;
  created_at: string;
}

interface Accommodation {
  id: number;
  name: string;
  description: string;
  price_per_night: number;
  image: string | null;
  created_at: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  image: File | null;
}

interface AccommodationFormData {
  name: string;
  description: string;
  price_per_night: string;
  image: File | null;
}

interface Attraction {
  id: number;
  name: string;
  description: string | null;
  full_description: string | null;
  location: string | null;
  category: string | null;
  image: string | null;
  view_count: number;
  created_at: string;
}

interface AttractionFormData {
  name: string;
  description: string;
  full_description: string;
  location: string;
  category: string;
  image: File | null;
}

const emptyAttractionForm: AttractionFormData = {
  name: '',
  description: '',
  full_description: '',
  location: '',
  category: '',
  image: null,
};

const emptyProductForm: ProductFormData = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  category: '',
  image: null,
};

const emptyAccommodationForm: AccommodationFormData = {
  name: '',
  description: '',
  price_per_night: '',
  image: null,
};

export function ManageListings() {
  const [activeTab, setActiveTab] = useState<'businesses' | 'products' | 'accommodations' | 'attractions'>('businesses');
  const [listings, setListings] = useState<Listing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Business filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | 'resort' | 'enterprise'>('all');

  // Shared search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);

  // Accommodation modal state
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);
  const [accommodationForm, setAccommodationForm] = useState<AccommodationFormData>(emptyAccommodationForm);
  const [accommodationSaving, setAccommodationSaving] = useState(false);

  // Attraction modal state
  const [showAttractionModal, setShowAttractionModal] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [attractionForm, setAttractionForm] = useState<AttractionFormData>(emptyAttractionForm);
  const [attractionSaving, setAttractionSaving] = useState(false);

  useEffect(() => {
    fetchListings();
    fetchProducts();
    fetchAccommodations();
    fetchAttractions();
  }, []);

  // Reset search when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setCategoryFilter('all');
  }, [activeTab]);

  const fetchListings = async () => {
    try {
      const data = await getJSON('/listings');
      const mapped = Array.isArray(data)
        ? data
            .filter((user: any) => user.role === 'resort' || user.role === 'enterprise')
            .map((user: any) => ({
              id: String(user.id),
              type: user.role,
              name: user.name ?? 'Business',
              owner: user.name ?? 'Owner',
              email: user.email ?? 'N/A',
              phone: user.phone ?? 'N/A',
              description: user.description ?? '',
              status: user.listing_status ?? 'approved',
              submittedDate: user.created_at ?? new Date().toISOString(),
            }))
        : [];
      setListings(mapped);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getLegacyJSON('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  };

  const fetchAccommodations = async () => {
    try {
      const data = await getLegacyJSON('/accommodations');
      setAccommodations(Array.isArray(data) ? data : []);
    } catch {
      setAccommodations([]);
    }
  };

  const fetchAttractions = async () => {
    try {
      const data = await getLegacyJSON('/attractions');
      setAttractions(Array.isArray(data) ? data : []);
    } catch {
      setAttractions([]);
    }
  };

  // ── Attraction handlers ────────────────────────────────────────────────────

  const openAddAttraction = () => {
    setEditingAttraction(null);
    setAttractionForm(emptyAttractionForm);
    setShowAttractionModal(true);
  };

  const openEditAttraction = (attraction: Attraction) => {
    setEditingAttraction(attraction);
    setAttractionForm({
      name: attraction.name,
      description: attraction.description ?? '',
      full_description: attraction.full_description ?? '',
      location: attraction.location ?? '',
      category: attraction.category ?? '',
      image: null,
    });
    setShowAttractionModal(true);
  };

  const handleSaveAttraction = async () => {
    if (!attractionForm.name.trim()) return;
    setAttractionSaving(true);
    try {
      const token = localStorage.getItem('discover-mansalay:token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', attractionForm.name.trim());
      formData.append('description', attractionForm.description.trim());
      formData.append('full_description', attractionForm.full_description.trim());
      formData.append('location', attractionForm.location.trim());
      formData.append('category', attractionForm.category.trim());
      if (attractionForm.image) {
        formData.append('image', attractionForm.image);
      }

      if (editingAttraction) {
        formData.append('_method', 'PUT');
        const res = await fetch(`${API_BASE}/api/attractions/${editingAttraction.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to update attraction');
        await showSuccessAlert('Attraction Updated!', `${attractionForm.name} has been updated.`);
      } else {
        const res = await fetch(`${API_BASE}/api/attractions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to create attraction');
        await showSuccessAlert('Attraction Added!', `${attractionForm.name} has been added.`);
      }

      setShowAttractionModal(false);
      await fetchAttractions();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save attraction');
    } finally {
      setAttractionSaving(false);
    }
  };

  const handleDeleteAttraction = async (attraction: Attraction) => {
    const confirmed = await showConfirmDialog(
      'Delete Attraction',
      `Are you sure you want to delete "${attraction.name}"? This cannot be undone.`,
      'Yes, delete it',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteJSON(`/attractions/${attraction.id}`);
      await showSuccessAlert('Attraction Deleted', `${attraction.name} has been removed.`);
      await fetchAttractions();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete attraction');
    }
  };

  // ── Business handlers ──────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, status: 'approved' as const } : l)
    );
    if (listing) {
      await patchJSON(`/listings/${id}`, { status: 'approved' });
      await showSuccessAlert('Listing Approved!', `${listing.name} has been approved successfully.`);
    }
  };

  const handleReject = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, status: 'rejected' as const } : l)
    );
    if (listing) {
      await patchJSON(`/listings/${id}`, { status: 'rejected' });
      await showSuccessAlert('Listing Rejected', `${listing.name} has been rejected.`);
    }
  };

  // ── Product handlers ───────────────────────────────────────────────────────

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      stock: String(product.stock),
      category: product.category ?? '',
      image: null,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.price || !productForm.stock) return;
    setProductSaving(true);
    try {
      const token = localStorage.getItem('discover-mansalay:token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', productForm.name.trim());
      formData.append('description', productForm.description.trim());
      formData.append('price', productForm.price);
      formData.append('stock', productForm.stock);
      formData.append('category', productForm.category.trim());
      if (productForm.image) {
        formData.append('image', productForm.image);
      }

      if (editingProduct) {
        formData.append('_method', 'PUT');
        await fetch(`${API_BASE}/api/admin/products/${editingProduct.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }).then(r => { if (!r.ok) throw new Error('Failed to update product'); });
        await showSuccessAlert('Product Updated!', `${productForm.name} has been updated.`);
      } else {
        await fetch(`${API_BASE}/api/admin/products`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }).then(r => { if (!r.ok) throw new Error('Failed to create product'); });
        await showSuccessAlert('Product Added!', `${productForm.name} has been added.`);
      }

      setShowProductModal(false);
      await fetchProducts();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save product');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = await showConfirmDialog(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      'Yes, delete it',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteJSON(`/admin/products/${product.id}`);
      await showSuccessAlert('Product Deleted', `${product.name} has been removed.`);
      await fetchProducts();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete product');
    }
  };

  // ── Accommodation handlers ─────────────────────────────────────────────────

  const openAddAccommodation = () => {
    setEditingAccommodation(null);
    setAccommodationForm(emptyAccommodationForm);
    setShowAccommodationModal(true);
  };

  const openEditAccommodation = (accommodation: Accommodation) => {
    setEditingAccommodation(accommodation);
    setAccommodationForm({
      name: accommodation.name,
      description: accommodation.description ?? '',
      price_per_night: String(accommodation.price_per_night),
      image: null,
    });
    setShowAccommodationModal(true);
  };

  const handleSaveAccommodation = async () => {
    if (!accommodationForm.name.trim() || !accommodationForm.price_per_night) return;
    setAccommodationSaving(true);
    try {
      const token = localStorage.getItem('discover-mansalay:token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', accommodationForm.name.trim());
      formData.append('description', accommodationForm.description.trim());
      formData.append('price_per_night', accommodationForm.price_per_night);
      if (accommodationForm.image) {
        formData.append('image', accommodationForm.image);
      }

      if (editingAccommodation) {
        formData.append('_method', 'PUT');
        await fetch(`${API_BASE}/api/admin/accommodations/${editingAccommodation.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }).then(r => { if (!r.ok) throw new Error('Failed to update accommodation'); });
        await showSuccessAlert('Accommodation Updated!', `${accommodationForm.name} has been updated.`);
      } else {
        await fetch(`${API_BASE}/api/admin/accommodations`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }).then(r => { if (!r.ok) throw new Error('Failed to create accommodation'); });
        await showSuccessAlert('Accommodation Added!', `${accommodationForm.name} has been added.`);
      }

      setShowAccommodationModal(false);
      await fetchAccommodations();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save accommodation');
    } finally {
      setAccommodationSaving(false);
    }
  };

  const handleDeleteAccommodation = async (accommodation: Accommodation) => {
    const confirmed = await showConfirmDialog(
      'Delete Accommodation',
      `Are you sure you want to delete "${accommodation.name}"? This cannot be undone.`,
      'Yes, delete it',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteJSON(`/admin/accommodations/${accommodation.id}`);
      await showSuccessAlert('Accommodation Deleted', `${accommodation.name} has been removed.`);
      await fetchAccommodations();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete accommodation');
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredListings = listings.filter(listing => {
    const statusMatch = filterStatus === 'all' || listing.status === filterStatus;
    const typeMatch = filterType === 'all' || listing.type === filterType;
    return statusMatch && typeMatch;
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAccommodations = accommodations.filter(accommodation => {
    const matchesSearch =
      accommodation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (accommodation.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredAttractions = attractions.filter(attraction => {
    const matchesSearch =
      attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attraction.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attraction.location ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const attractionCategories = Array.from(new Set(attractions.map(a => a.category).filter(Boolean)));

  const productCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const decodedPath = decodeURIComponent(imagePath);
    if (decodedPath.startsWith('/assets')) return `http://localhost:5173${decodedPath}`;
    return `http://localhost:8000${decodedPath}`;
  };

  const formatPrice = (value: number | string | null | undefined) => {
    const num = typeof value === 'number' ? value : value ? Number(value) : NaN;
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-300 rounded-full text-sm flex items-center gap-1">
            <Clock className="h-4 w-4" />Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-sm flex items-center gap-1">
            <Check className="h-4 w-4" />Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-sm flex items-center gap-1">
            <X className="h-4 w-4" />Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Manage Listings</h1>
        <p className="text-muted-foreground">
          Review and manage businesses, products, and accommodations
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-2 mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'businesses' ? 'bg-primary text-white' : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Store className="h-5 w-5" />
          Businesses ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'products' ? 'bg-primary text-white' : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Package className="h-5 w-5" />
          Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('accommodations')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'accommodations' ? 'bg-primary text-white' : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Hotel className="h-5 w-5" />
          Accommodations ({accommodations.length})
        </button>
        <button
          onClick={() => setActiveTab('attractions')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'attractions' ? 'bg-primary text-white' : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <MapPin className="h-5 w-5" />
          Attractions ({attractions.length})
        </button>
      </div>

      {/* ── BUSINESSES TAB ── */}
      {activeTab === 'businesses' && (
        <>
          <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Filter by Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="resort">Resorts</option>
                  <option value="enterprise">Enterprises</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <p className="text-muted-foreground">Loading businesses...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <p className="text-muted-foreground">No businesses found</p>
              </div>
            ) : (
              filteredListings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                        {listing.type === 'resort' ? (
                          <Hotel className="h-8 w-8 text-primary" />
                        ) : (
                          <Store className="h-8 w-8 text-primary" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3>{listing.name}</h3>
                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                              {listing.type === 'resort' ? 'Resort' : 'Enterprise'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Owner: {listing.owner}</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {new Date(listing.submittedDate).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{listing.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
                        <p>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          <a href={`mailto:${listing.email}`} className="text-primary hover:underline">
                            {listing.email}
                          </a>
                        </p>
                        <p><span className="text-muted-foreground">Phone:</span> {listing.phone}</p>
                      </div>
                      {listing.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(listing.id)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                          >
                            <Check className="h-4 w-4" />Approve
                          </button>
                          <button
                            onClick={() => handleReject(listing.id)}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white border-2 border-primary/20 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-2 flex items-center gap-2">
                    <Search className="h-4 w-4" />Search Products
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or description..."
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm mb-2 flex items-center gap-2">
                    <Filter className="h-4 w-4" />Filter by Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  >
                    <option value="all">All Categories</option>
                    {productCategories.map(cat => (
                      <option key={cat || 'uncategorized'} value={cat || ''}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-start pt-0 sm:pt-0">
              <button
                onClick={openAddProduct}
                className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap h-fit mt-auto"
              >
                <Plus className="h-5 w-5" />+ Add Product
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <Package className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No products found</p>
                <button
                  onClick={openAddProduct}
                  className="mt-4 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />Add First Product
                </button>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all"
                >
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image) || ''}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Package className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-medium">{product.name}</h3>
                      {product.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded whitespace-nowrap">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-lg text-primary font-semibold">₱{formatPrice(product.price)}</p>
                      <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Added: {new Date(product.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 pt-2 border-t border-primary/10">
                      <button
                        onClick={() => openEditProduct(product)}
                        className="flex-1 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Pencil className="h-4 w-4" />Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="flex-1 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── ACCOMMODATIONS TAB ── */}
      {activeTab === 'accommodations' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white border-2 border-primary/20 rounded-lg p-4">
              <label className="text-sm mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />Search Accommodations
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={openAddAccommodation}
                className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />+ Add Accommodation
              </button>
            </div>
          </div>

          {/* Accommodations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccommodations.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <Hotel className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No accommodations found</p>
                <button
                  onClick={openAddAccommodation}
                  className="mt-4 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />Add First Accommodation
                </button>
              </div>
            ) : (
              filteredAccommodations.map(accommodation => (
                <div
                  key={accommodation.id}
                  className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all"
                >
                  {accommodation.image ? (
                    <img
                      src={getImageUrl(accommodation.image) || ''}
                      alt={accommodation.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Hotel className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-medium mb-2">{accommodation.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{accommodation.description}</p>
                    <p className="text-lg text-primary font-semibold mb-2">
                      ₱{formatPrice(accommodation.price_per_night)} / night
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Added: {new Date(accommodation.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 pt-2 border-t border-primary/10">
                      <button
                        onClick={() => openEditAccommodation(accommodation)}
                        className="flex-1 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Pencil className="h-4 w-4" />Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccommodation(accommodation)}
                        className="flex-1 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── PRODUCT MODAL ── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-primary/10">
              <h2 className="text-xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Product name"
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description"
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Seafood, Handicraft, Souvenir"
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image {editingProduct && <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-primary/10">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2 border-2 border-primary/20 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={productSaving || !productForm.name.trim() || !productForm.price || !productForm.stock}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {productSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOMMODATION MODAL ── */}
      {showAccommodationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-primary/10">
              <h2 className="text-xl font-semibold">
                {editingAccommodation ? 'Edit Accommodation' : 'Add New Accommodation'}
              </h2>
              <button
                onClick={() => setShowAccommodationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accommodationForm.name}
                  onChange={(e) => setAccommodationForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Accommodation name"
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={accommodationForm.description}
                  onChange={(e) => setAccommodationForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Accommodation description"
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Price per Night (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={accommodationForm.price_per_night}
                  onChange={(e) => setAccommodationForm(f => ({ ...f, price_per_night: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image {editingAccommodation && <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAccommodationForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-primary/10">
              <button
                onClick={() => setShowAccommodationModal(false)}
                className="flex-1 py-2 border-2 border-primary/20 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccommodation}
                disabled={accommodationSaving || !accommodationForm.name.trim() || !accommodationForm.price_per_night}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accommodationSaving ? 'Saving...' : editingAccommodation ? 'Update Accommodation' : 'Add Accommodation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTRACTIONS TAB ── */}
      {activeTab === 'attractions' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white border-2 border-primary/20 rounded-lg p-4">
              <label className="text-sm mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />Search Attractions
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or location..."
                className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={openAddAttraction}
                className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />+ Add Attraction
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttractions.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <MapPin className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No attractions found</p>
                <button
                  onClick={openAddAttraction}
                  className="mt-4 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />Add First Attraction
                </button>
              </div>
            ) : (
              filteredAttractions.map(attraction => (
                <div
                  key={attraction.id}
                  className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all"
                >
                  {attraction.image ? (
                    <img
                      src={getImageUrl(attraction.image) || ''}
                      alt={attraction.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <MapPin className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-medium">{attraction.name}</h3>
                      {attraction.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded whitespace-nowrap">
                          {attraction.category}
                        </span>
                      )}
                    </div>
                    {attraction.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3" />{attraction.location}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{attraction.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">
                        {attraction.view_count ?? 0} views
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Added: {new Date(attraction.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-primary/10">
                      <button
                        onClick={() => openEditAttraction(attraction)}
                        className="flex-1 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Pencil className="h-4 w-4" />Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAttraction(attraction)}
                        className="flex-1 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── ATTRACTION MODAL ── */}
      {showAttractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-primary/10">
              <h2 className="text-xl font-semibold">
                {editingAttraction ? 'Edit Attraction' : 'Add New Attraction'}
              </h2>
              <button
                onClick={() => setShowAttractionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={attractionForm.name}
                  onChange={(e) => setAttractionForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Attraction name"
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Description</label>
                <textarea
                  value={attractionForm.description}
                  onChange={(e) => setAttractionForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description shown on the card"
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Description</label>
                <textarea
                  value={attractionForm.full_description}
                  onChange={(e) => setAttractionForm(f => ({ ...f, full_description: e.target.value }))}
                  placeholder="Detailed description shown when expanded"
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location / Barangay</label>
                  <input
                    type="text"
                    value={attractionForm.location}
                    onChange={(e) => setAttractionForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Barangay Poblacion"
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={attractionForm.category}
                    onChange={(e) => setAttractionForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Beach, Mountain, Cultural"
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image {editingAttraction && <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAttractionForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-primary/10">
              <button
                onClick={() => setShowAttractionModal(false)}
                className="flex-1 py-2 border-2 border-primary/20 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttraction}
                disabled={attractionSaving || !attractionForm.name.trim()}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {attractionSaving ? 'Saving...' : editingAttraction ? 'Update Attraction' : 'Add Attraction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
