import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Package,
  X,
  Plus,
  Minus,
  Store,
  Star,
} from 'lucide-react';
import { useApp, Product } from '../../context/AppContext';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { getPublicJSON } from '../../lib/api';
import { SearchBar } from '../../components/SearchBar';
import { FilterButton } from '../../components/FilterButton';
import { FilterSidebar } from '../../components/FilterSidebar';
import { FilterChips } from '../../components/FilterChips';
import { useSearchAndFilter } from '../../hooks/useSearchAndFilter';
import ChatModal from '../../components/ChatModal';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedVariation?: any) => void;
  userType: string | null;
}

function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  userType,
}: ProductDetailModalProps) {
  const { addToCart, clearCart } = useApp();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedVariations({});
      setChatOpen(false);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (!product) return;
    const productNumericId = (product as any)._numericId ?? product.id;
    getPublicJSON(`/products/${productNumericId}/reviews`)
      .then((data: any) => {
        setReviews(Array.isArray(data) ? data : data?.reviews ?? []);
      })
      .catch(() => setReviews([]));
  }, [product]);

  if (!isOpen || !product) return null;

  const variations: any[] = Array.isArray((product as any).variations)
    ? (product as any).variations
    : [];
  const hasVariations = variations.length > 0;

  const variationGroups: Record<string, any[]> = {};
  for (const v of variations) {
    const key = v.name ?? 'Option';
    if (!variationGroups[key]) variationGroups[key] = [];
    variationGroups[key].push(v);
  }
  const variationNames = Object.keys(variationGroups);

  const allVariationsSelected =
    !hasVariations || variationNames.every((n) => !!selectedVariations[n]);

  const activeVariation = hasVariations && allVariationsSelected
    ? (variations.find((v) =>
        variationNames.every((n) => selectedVariations[n] === v.value || v.name === n)
      ) ?? null)
    : null;

  const effectivePrice: number =
    activeVariation?.price != null ? Number(activeVariation.price) : product.price;
  const effectiveStock: number =
    activeVariation?.stock != null ? Number(activeVariation.stock) : product.stock;

  const isStaticListing = !(product as any).is_registered && !(product as any).user_id;
  const owner: any = (product as any).owner ?? null;
  const sellerId: number | null = owner?.id ?? (product as any).user_id ?? null;
  const sellerName: string = owner?.name ?? owner?.store_name ?? 'Seller';
  const sellerRole: 'enterprise' | 'resort' = owner?.role === 'resort' ? 'resort' : 'enterprise';

  function buildVariationPayload() {
    if (!hasVariations) return undefined;
    return {
      id: activeVariation?.id,
      name: variationNames.join(' / '),
      value: variationNames.map((n) => selectedVariations[n]).join(' / '),
      price: activeVariation?.price ?? null,
    };
  }

  function validateBeforeAction(): boolean {
    if (!userType) {
      toast.error('Please login to continue.');
      navigate('/select-role');
      onClose();
      return false;
    }
    if (userType !== 'tourist') {
      toast.error('Only tourists can order products.');
      return false;
    }
    if (isStaticListing) {
      toast.error('Contact the seller directly for this product.');
      return false;
    }
    if (hasVariations && !allVariationsSelected) {
      const missing = variationNames.find((n) => !selectedVariations[n]);
      toast.error(`Pakipili muna ang ${missing}.`);
      return false;
    }
    if (effectiveStock <= 0) {
      toast.error('This product is out of stock.');
      return false;
    }
    return true;
  }

  const handleBuyNow = () => {
    if (!validateBeforeAction()) return;
    const variationPayload = buildVariationPayload();
    const productForCart: Product = { ...product, price: effectivePrice, stock: effectiveStock };
    clearCart();
    addToCart(productForCart, quantity, variationPayload);
    onClose();
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    if (!validateBeforeAction()) return;
    const variationPayload = buildVariationPayload();
    const productForCart: Product = { ...product, price: effectivePrice, stock: effectiveStock };
    onAddToCart(productForCart, quantity, variationPayload);
    onClose();
    setQuantity(1);
    setSelectedVariations({});
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating ?? 0), 0) / reviews.length
      : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex justify-end p-3 bg-white/80 backdrop-blur-sm">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="px-5 pb-8 -mt-2 space-y-5">
            {/* Product image */}
            <div className="relative aspect-square sm:aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }}
              />
              {(product as any).variations?.length > 0 && (
                <div className="absolute top-3 left-3 bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  Variations Available
                </div>
              )}
            </div>

            {/* Name + price */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h2>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-pink-500 text-sm">₱</span>
                <span className="text-pink-500 text-2xl font-bold">{effectivePrice.toLocaleString()}</span>
              </div>
              {avgRating !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">{avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Stock:</span>
              <span className={effectiveStock <= 0 ? 'text-red-500 font-medium' : effectiveStock <= 5 ? 'text-orange-500 font-medium' : 'text-green-600 font-medium'}>
                {effectiveStock <= 0 ? 'Out of Stock' : `${effectiveStock} available`}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Variation selector */}
            {hasVariations && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Select Variation</h3>
                {variationNames.map((groupName) => (
                  <div key={groupName} className="flex items-start gap-4 text-sm">
                    <span className="text-gray-500 w-20 pt-2 shrink-0">{groupName}</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {variationGroups[groupName].map((option: any) => {
                        const isSelected = selectedVariations[groupName] === option.value;
                        const outOfStock = Number(option.stock) <= 0;
                        return (
                          <button
                            key={option.id ?? `${option.name}-${option.value}`}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => {
                              setSelectedVariations((prev) => ({ ...prev, [groupName]: option.value }));
                              setQuantity(1);
                            }}
                            className={`px-4 py-2 rounded border text-sm min-w-[4rem] transition-colors ${
                              outOfStock
                                ? 'bg-gray-50 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-pink-50 text-pink-600 border-pink-500 font-medium'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-pink-500 hover:text-pink-500'
                            }`}
                          >
                            {option.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-40" aria-label="Decrease">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))} disabled={quantity >= effectiveStock || effectiveStock <= 0} className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-40" aria-label="Increase">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Seller info */}
            {owner && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                    <Store className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sellerName}</p>
                    <p className="text-xs text-gray-500 capitalize">{sellerRole} seller</p>
                  </div>
                </div>
                {userType === 'tourist' && sellerId && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setChatOpen(true)} className="text-xs px-3 py-1.5 border border-pink-500 text-pink-500 rounded-lg hover:bg-pink-50 transition-colors">
                      Chat
                    </button>
                    {(product as any).user_id && (product as any).is_registered && (
                      <Link
                        to={`/business/enterprise/${(product as any).user_id}`}
                        onClick={onClose}
                        className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        <Store className="h-3 w-3" />
                        View Shop
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Static listing notice */}
            {isStaticListing && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                This product is managed by the admin. Please contact the seller directly to purchase.
              </div>
            )}

            {/* Action buttons */}
            {!isStaticListing && userType === 'tourist' && (
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={hasVariations && !allVariationsSelected}
                  className="flex-1 px-6 py-3 bg-pink-50 text-pink-500 border border-pink-500 rounded-lg hover:bg-pink-100 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={hasVariations && !allVariationsSelected}
                  className="flex-1 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>
            )}

            {/* Login prompt */}
            {!userType && (
              <div className="text-center pt-1">
                <p className="text-sm text-gray-500 mb-2">You need to be logged in to purchase.</p>
                <Link to="/select-role" onClick={onClose} className="inline-flex items-center gap-2 px-5 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium">
                  Login to Continue
                </Link>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Reviews ({reviews.length})</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {reviews.map((r: any, idx: number) => (
                    <div key={r.id ?? idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= Number(r.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{r.user?.name ?? 'Tourist'}</span>
                      </div>
                      {r.comment && <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {chatOpen && sellerId && (
        <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} receiverId={sellerId} receiverName={sellerName} receiverRole={sellerRole} />
      )}
    </>
  );
}

export function Products() {
  const { addToCart, userType } = useApp();
  const navigate = useNavigate();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { filters, queryParams, updateFilter, clearAllFilters, activeFilterCount } = useSearchAndFilter();

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((p) => p.category).filter(Boolean))).sort() as string[];
  }, [items]);

  const filteredProducts = useMemo(() => {
    if (!filters.category) return items;
    return items.filter((p) => p.category === filters.category);
  }, [items, filters.category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getPublicJSON('/products' + queryParams)
      .then((data: any) => {
        if (cancelled) return;
        const raw: any[] = Array.isArray(data) ? data : data?.data ?? data?.products ?? [];
        const mapped: Product[] = raw.map((p: any) => ({
          id: String(p.id),
          _numericId: p.id,
          name: p.name ?? 'Product',
          description: p.description ?? '',
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? 0),
          image: p.image
            ? p.image.startsWith('http') ? p.image : `http://localhost:8000${p.image}`
            : '/assets/default-product.jpg',
          category: p.category ?? 'General',
          user_id: p.user_id ?? null,
          is_registered: p.is_registered ?? false,
          owner: p.owner ?? null,
          variations: Array.isArray(p.variations) ? p.variations : [],
        } as any));
        setItems(mapped);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [queryParams]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = async (product: Product, quantity: number = 1, selectedVariation?: any) => {
    if (!userType || userType !== 'tourist') return;
    if (!(product as any).is_registered && !(product as any).user_id) {
      toast.error('This product is not available for online purchase.');
      return;
    }
    const variationLabel = selectedVariation ? ` (${selectedVariation.value})` : '';
    addToCart(product, quantity, selectedVariation);
    toast.success(`${product.name}${variationLabel} added to cart!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Local Products</h1>
        <p className="text-gray-500">Shop authentic Mansalay products</p>
      </div>

      <div className="mb-6 flex gap-3">
        <SearchBar value={filters.search} onChange={(value) => updateFilter({ search: value })} placeholder="Search products..." className="flex-1" />
        <FilterButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} activeFilterCount={activeFilterCount} isOpen={isSidebarOpen} />
      </div>

      <FilterChips filters={filters} onRemoveFilter={(key) => updateFilter({ [key]: '' })} />

      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={() => { clearAllFilters(); setIsSidebarOpen(false); }}
        availableBarangays={[]}
        availableCategories={categories}
        showBarangayFilter={false}
        showDateFilters={false}
        showCategoryFilter={true}
      />

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all cursor-pointer"
            >
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }}
                />
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-800">Out of Stock</span>
                  </div>
                )}
                {(product as any).variations?.length > 0 && (
                  <div className="absolute top-2 left-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Variations
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm text-gray-900 line-clamp-2 min-h-[40px] leading-snug mb-2 font-medium">{product.name}</h3>
                <div className="flex items-baseline gap-0.5 mb-2">
                  <span className="text-pink-500 text-xs">₱</span>
                  <span className="text-pink-500 font-bold text-base">{Number(product.price).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className={product.stock === 0 ? 'text-red-500' : 'text-gray-500'}>
                    {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
        onAddToCart={handleAddToCart}
        userType={userType}
      />
    </div>
  );
}
