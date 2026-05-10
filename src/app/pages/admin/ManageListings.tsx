import { useState, useEffect } from 'react';
import { Hotel, Store, Check, X, Clock, Package, Search, Filter } from 'lucide-react';
import { getJSON, patchJSON, getLegacyJSON } from '../../lib/api';
import { showSuccessAlert } from '../../lib/sweetAlert';

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

export function ManageListings() {
  const [activeTab, setActiveTab] = useState<'businesses' | 'products' | 'accommodations'>('businesses');
  const [listings, setListings] = useState<Listing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | 'resort' | 'enterprise'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchListings();
    fetchProducts();
    fetchAccommodations();
  }, []);

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

  const handleApprove = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev =>
      prev.map(listing =>
        listing.id === id ? { ...listing, status: 'approved' as const } : listing
      )
    );
    if (listing) {
      await patchJSON(`/listings/${id}`, { status: 'approved' });
      await showSuccessAlert('Listing Approved!', `${listing.name} has been approved successfully.`);
    }
  };

  const handleReject = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev =>
      prev.map(listing =>
        listing.id === id ? { ...listing, status: 'rejected' as const } : listing
      )
    );
    if (listing) {
      await patchJSON(`/listings/${id}`, { status: 'rejected' });
      await showSuccessAlert('Listing Rejected', `${listing.name} has been rejected.`);
    }
  };

  const filteredListings = listings.filter(listing => {
    const statusMatch = filterStatus === 'all' || listing.status === filterStatus;
    const typeMatch = filterType === 'all' || listing.type === filterType;
    return statusMatch && typeMatch;
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAccommodations = accommodations.filter(accommodation => {
    const matchesSearch = accommodation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         accommodation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const productCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    // Decode URL-encoded paths
    const decodedPath = decodeURIComponent(imagePath);
    // If it starts with /assets, it's a static asset
    if (decodedPath.startsWith('/assets')) {
      return `http://localhost:5173${decodedPath}`;
    }
    // Otherwise, it's a storage path
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
            <Clock className="h-4 w-4" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-sm flex items-center gap-1">
            <Check className="h-4 w-4" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-sm flex items-center gap-1">
            <X className="h-4 w-4" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

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
            activeTab === 'businesses'
              ? 'bg-primary text-white'
              : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Store className="h-5 w-5" />
          Businesses ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'products'
              ? 'bg-primary text-white'
              : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Package className="h-5 w-5" />
          Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('accommodations')}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'accommodations'
              ? 'bg-primary text-white'
              : 'text-foreground hover:bg-primary/5'
          }`}
        >
          <Hotel className="h-5 w-5" />
          Accommodations ({accommodations.length})
        </button>
      </div>

      {/* Businesses Tab */}
      {activeTab === 'businesses' && (
        <>
          {/* Filters */}
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

          {/* Listings Grid */}
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
                          <p className="text-sm text-muted-foreground mb-1">
                            Owner: {listing.owner}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {new Date(listing.submittedDate).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {listing.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
                        <p>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          <a href={`mailto:${listing.email}`} className="text-primary hover:underline">
                            {listing.email}
                          </a>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Phone:</span> {listing.phone}
                        </p>
                      </div>

                      {listing.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(listing.id)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(listing.id)}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Reject
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

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Products
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
                  <Filter className="h-4 w-4" />
                  Filter by Category
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

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <p className="text-muted-foreground">No products found</p>
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
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Package className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg">{product.name}</h3>
                      {product.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded whitespace-nowrap">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg text-primary">₱{formatPrice(product.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {product.stock}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Added: {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Accommodations Tab */}
      {activeTab === 'accommodations' && (
        <>
          {/* Search Filter */}
          <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
            <label className="text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Accommodations
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>

          {/* Accommodations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccommodations.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
                <p className="text-muted-foreground">No accommodations found</p>
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
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Hotel className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg mb-2">{accommodation.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {accommodation.description}
                    </p>
                    <p className="text-lg text-primary mb-2">
                      ₱{formatPrice(accommodation.price_per_night)} / night
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added: {new Date(accommodation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
