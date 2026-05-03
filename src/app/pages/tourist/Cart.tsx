import { Link, useNavigate } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useEffect } from 'react';

export function Cart() {
  const { cart, removeFromCart, updateQuantity, userType } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userType) {
      navigate('/select-role');
    }
  }, [userType, navigate]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!userType) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <LogIn className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
        <h2 className="mb-4">Please Login to View Cart</h2>
        <p className="text-muted-foreground mb-8">
          You need to be logged in to access your shopping cart
        </p>
        <Link
          to="/select-role"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Login Now
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
        <h2 className="mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">
          Add some products to get started!
        </p>
        <Link
          to="/products"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div
              key={item.id}
              className="bg-white border-2 border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row gap-4"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-full sm:w-24 h-24 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="mb-1">{item.name}</h3>
                <p className="text-primary mb-2">₱{item.price}</p>
                <p className="text-sm text-muted-foreground">
                  Stock available: {item.stock} units
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    <Minus className="h-4 w-4 text-primary" />
                  </button>
                  <span className="w-12 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="p-1 bg-primary/10 rounded hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border-2 border-primary/20 rounded-lg p-6 sticky top-20">
            <h2 className="mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex justify-between">
                <span>Total</span>
                <span className="text-primary">₱{subtotal.toFixed(2)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="w-full block text-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/products"
              className="w-full block text-center px-6 py-3 mt-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
