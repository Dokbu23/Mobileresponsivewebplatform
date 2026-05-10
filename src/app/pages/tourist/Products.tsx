import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, Package, LogIn, ExternalLink } from 'lucide-react';
import { useApp, Product } from '../../context/AppContext';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { showSuccessAlert } from '../../lib/sweetAlert';
import { getPublicJSON } from '../../lib/api';
import { SearchBar } from '../../components/SearchBar';
import { FilterButton } from '../../components/FilterButton';
import { FilterSidebar } from '../../components/FilterSidebar';
import { FilterChips } from '../../components/FilterChips';
import { useSearchAndFilter } from '../../hooks/useSearchAndFilter';

export function Products() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { addToCart, userType } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize search and filter hook
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch products with query parameters
  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON(`/products${queryParams}`);
        const raw = Array.isArray(data) ? data : (data?.value ?? []);
        setItems(
          raw.map((p: any) => ({
            id: String(p.id ?? p._id ?? p.slug ?? Math.random()),
            name: p.name ?? p.title ?? 'Product',
            description: p.description ?? p.short_description ?? '',
            price: Number(p.price ?? p.amount ?? 0),
            stock: Number(p.stock ?? p.inventory ?? 0),
            image: p.image 
              ? (p.image.startsWith('http') ? p.image : `http://localhost:8000${p.image}`)
              : '/assets/default-product.jpg',
            category: p.category ?? 'General',
            user_id: p.user_id ?? null,
            is_registered: p.is_registered ?? false,
          }))
        );
      } catch (e) {
        setItems([]);
      }
    })();
  }, [queryParams]);

  const categories = Array.from(new Set(items.map(p => p.category).filter(Boolean))) as string[];

  // Extract unique barangays for filter sidebar (empty for products - no location filter)
  const availableBarangays = useMemo(() => [], []);

  // Filter products by selected category from filters
  const filteredProducts = filters.category && filters.category !== 'All'
    ? items.filter(p => p.category === filters.category)
    : items;

  // Handle filter removal from chips
  const handleRemoveFilter = (filterKey: keyof typeof filters) => {
    updateFilter({ [filterKey]: '' });
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    clearAllFilters();
    setIsSidebarOpen(false);
  };

  const handleAddToCart = async (product: Product) => {
    if (!userType) {
      toast.error('Please login to add items to cart');
      navigate('/select-role');
      return;
    }

    // Only tourists can order products (enterprise and resort are business accounts)
    if (userType !== 'tourist') {
      toast.error('Only tourists can order products. Business accounts are for management only.');
      return;
    }

    // Block cart for unregistered static listings
    if (!(product as any).is_registered && !(product as any).user_id) {
      toast.error('This product is not available for online purchase. Please contact the seller directly.');
      return;
    }

    if (product.stock > 0) {
      addToCart(product);
      await showSuccessAlert('Added to Cart!', `${product.name} has been added to your cart.`);
    } else {
      toast.error('Product out of stock');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {!userType && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/20 border-2 border-primary/20 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="mb-1">👋 Browsing as Guest</h3>
              <p className="text-sm text-muted-foreground">
                Login as a tourist to add products to cart and place orders
              </p>
            </div>
            <button
              onClick={() => navigate('/select-role')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap inline-flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Login Now
            </button>
          </div>
        </div>
      )}

      {userType && userType !== 'tourist' && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="mb-1 text-blue-900">Business Account - Browse Only</h3>
              <p className="text-sm text-blue-700">
                You are logged in as <strong>{userType}</strong>. This is a business management account. Only tourists can place orders.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="mb-2">Local Products</h1>
        <p className="text-muted-foreground">
          Support local businesses and discover authentic Mansalay products
        </p>
      </div>

      {/* Search Bar with Filter Button */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={filters.search}
          onChange={(value) => updateFilter({ search: value })}
          placeholder="Search products by name or description..."
          className="flex-1"
        />
        <FilterButton
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          activeFilterCount={activeFilterCount}
          isOpen={isSidebarOpen}
        />
      </div>

      {/* Filter Chips */}
      <FilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={handleClearAllFilters}
        availableBarangays={availableBarangays}
        availableCategories={categories}
        showBarangayFilter={false}
        showDateFilters={false}
        showCategoryFilter={true}
      />

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => {
          const isExpanded = expandedId === product.id;
          return (
            <div
              key={product.id}
              className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all hover:shadow-lg"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3>{product.name}</h3>
                  <span className="text-primary">₱{product.price}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm ${product.stock === 0 ? 'text-destructive' : product.stock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                    {product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                  </span>
                  {/* Registered business: show View Shop link */}
                  {(product as any).user_id && (product as any).is_registered && (
                    <Link
                      to={`/business/enterprise/${(product as any).user_id}`}
                      className="ml-auto flex items-center gap-1 text-primary hover:underline text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Shop
                    </Link>
                  )}
                  {/* Unregistered static listing badge */}
                  {!(product as any).is_registered && !(product as any).user_id && (
                    <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Static Listing
                    </span>
                  )}
                </div>

                {!isExpanded && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {isExpanded && (
                  <div className="mb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {product.description}
                    </p>
                    <div className="bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm"><strong>Category:</strong> {product.category}</p>
                      <p className="text-sm"><strong>Price:</strong> ₱{product.price}</p>
                      <p className="text-sm"><strong>Available Stock:</strong> {product.stock} units</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : product.id)}
                    className="flex-1 px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {isExpanded ? (
                      <>
                        Less Details <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        More Details <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Unregistered static listing — no online transaction */}
                  {!(product as any).is_registered && !(product as any).user_id ? (
                    <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 border-2 border-gray-200 rounded-lg inline-flex items-center justify-center gap-2 text-sm cursor-default">
                      <Package className="h-4 w-4" />
                      Contact Directly
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0 || (userType !== 'tourist' && userType !== null)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {!userType ? (
                        <>
                          <LogIn className="h-4 w-4" />
                          Login to Buy
                        </>
                      ) : userType !== 'tourist' ? (
                        <>
                          <Package className="h-4 w-4" />
                          Business Account
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
