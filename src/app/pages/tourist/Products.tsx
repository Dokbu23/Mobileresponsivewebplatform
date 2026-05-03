import { useState } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, Package, LogIn } from 'lucide-react';
import { useApp, Product } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Handwoven Baskets',
    description: 'Traditional baskets handcrafted by local artisans using natural materials. Perfect for home decoration or practical use.',
    price: 450,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1586109019133-90ed8c0b74a5?w=400',
    category: 'Handicrafts',
  },
  {
    id: 'p2',
    name: 'Organic Honey',
    description: 'Pure, raw honey harvested from local bee farms. Rich in natural nutrients and perfect for health-conscious consumers.',
    price: 250,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784e38?w=400',
    category: 'Food',
  },
  {
    id: 'p3',
    name: 'Coconut Products',
    description: 'Assorted coconut-based products including virgin coconut oil, dried coconut, and coconut sugar.',
    price: 180,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400',
    category: 'Food',
  },
  {
    id: 'p4',
    name: 'Woven Bags',
    description: 'Eco-friendly bags woven from sustainable materials. Stylish and durable for everyday use.',
    price: 350,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
    category: 'Handicrafts',
  },
  {
    id: 'p5',
    name: 'Traditional Clothing',
    description: 'Authentic local garments featuring traditional patterns and designs.',
    price: 800,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400',
    category: 'Clothing',
  },
  {
    id: 'p6',
    name: 'Dried Fish',
    description: 'Locally caught and dried fish, a traditional delicacy and protein source.',
    price: 220,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400',
    category: 'Food',
  },
];

export function Products() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { addToCart, userType } = useApp();
  const navigate = useNavigate();

  const categories = ['All', ...Array.from(new Set(mockProducts.map(p => p.category)))];

  const filteredProducts = selectedCategory === 'All'
    ? mockProducts
    : mockProducts.filter(p => p.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
    if (!userType) {
      toast.error('Please login to add items to cart');
      navigate('/select-role');
      return;
    }

    if (product.stock > 0) {
      addToCart(product);
      toast.success(`${product.name} added to cart!`);
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
                Login to add products to cart and place orders
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

      <div className="mb-8">
        <h1 className="mb-2">Local Products</h1>
        <p className="text-muted-foreground">
          Support local businesses and discover authentic Mansalay products
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-white border-2 border-primary/20 text-foreground hover:border-primary'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

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
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {!userType ? (
                      <>
                        <LogIn className="h-4 w-4" />
                        Login to Buy
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
