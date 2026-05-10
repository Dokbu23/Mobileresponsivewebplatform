import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Hotel, Store, MapPin, Phone, Mail, Star, ShoppingBag,
  ArrowLeft, Package, CreditCard, CheckCircle, Calendar
} from 'lucide-react';
import { getPublicJSON } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

interface BusinessOwner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  barangay?: string;
  description?: string;
  payment_details?: any[];
}

interface BusinessProfileData {
  owner: BusinessOwner;
  accommodations?: any[];
  products?: any[];
  is_registered: boolean;
}

export function BusinessProfile() {
  const { type, userId } = useParams<{ type: 'resort' | 'enterprise'; userId: string }>();
  const navigate = useNavigate();
  const { addToCart, userType } = useApp();
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type || !userId) return;

    (async () => {
      try {
        const result = await getPublicJSON(`/business/${type}/${userId}`);
        setData(result);
      } catch {
        setError('Business profile not found or not yet approved.');
      } finally {
        setLoading(false);
      }
    })();
  }, [type, userId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="mb-2">Business Not Found</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { owner } = data;
  const isResort = type === 'resort';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Business Header */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            {isResort
              ? <Hotel className="h-10 w-10 text-primary" />
              : <Store className="h-10 w-10 text-primary" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1>{owner.name}</h1>
              <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-sm flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified Business
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {isResort ? 'Resort' : 'Enterprise'}
              </span>
            </div>

            {owner.description && (
              <p className="text-muted-foreground mb-4 max-w-2xl">{owner.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {owner.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${owner.email}`} className="hover:text-primary transition-colors">
                    {owner.email}
                  </a>
                </div>
              )}
              {owner.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {owner.phone}
                </div>
              )}
              {(owner.address || owner.barangay) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {[owner.barangay, owner.address, 'Mansalay, Oriental Mindoro'].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods (if any) */}
      {owner.payment_details && owner.payment_details.length > 0 && (
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-8">
          <h2 className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Methods
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {owner.payment_details.map((payment: any, index: number) => (
              <div key={index} className="border-2 border-primary/20 rounded-lg p-4">
                <span className="text-xs font-semibold text-primary uppercase">{payment.type}</span>
                <p className="font-medium mt-1">{payment.name}</p>
                <p className="text-sm text-muted-foreground">{payment.account_number}</p>
                <p className="text-sm text-muted-foreground">{payment.account_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resort: Accommodations */}
      {isResort && data.accommodations && (
        <div>
          <h2 className="flex items-center gap-2 mb-6">
            <Hotel className="h-5 w-5 text-primary" />
            Available Accommodations
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {data.accommodations.length}
            </span>
          </h2>

          {data.accommodations.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
              <Hotel className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No accommodations listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.accommodations.map((accommodation: any) => (
                <div
                  key={accommodation.id}
                  className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                >
                  {accommodation.image ? (
                    <img
                      src={accommodation.image.startsWith('http')
                        ? accommodation.image
                        : `http://localhost:8000${accommodation.image}`}
                      alt={accommodation.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/default-accommodation.jpg'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Hotel className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="mb-1">{accommodation.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {accommodation.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary font-semibold">
                          ₱{Number(accommodation.price_per_night).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">per night</p>
                      </div>
                      <button
                        onClick={() => navigate('/accommodations')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enterprise: Products */}
      {!isResort && data.products && (
        <div>
          <h2 className="flex items-center gap-2 mb-6">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Products
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {data.products.length}
            </span>
          </h2>

          {data.products.length === 0 ? (
            <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No products listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.products.map((product: any) => (
                <div
                  key={product.id}
                  className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                >
                  {product.image ? (
                    <img
                      src={product.image.startsWith('http')
                        ? product.image
                        : `http://localhost:8000${product.image}`}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                      <Package className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3>{product.name}</h3>
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
                      <div>
                        <p className="text-primary font-semibold">₱{Number(product.price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                      {userType === 'tourist' && product.stock > 0 && (
                        <button
                          onClick={() => {
                            addToCart({
                              id: String(product.id),
                              name: product.name,
                              description: product.description || '',
                              price: Number(product.price),
                              stock: Number(product.stock),
                              image: product.image || '',
                              category: product.category || '',
                            });
                            toast.success(`${product.name} added to cart`);
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
