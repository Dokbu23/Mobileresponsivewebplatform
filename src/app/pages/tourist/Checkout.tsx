import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, Building2, CheckCircle, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON } from '../../lib/api';
import { showTransactionSuccess } from '../../lib/sweetAlert';

export function Checkout() {
  const { cart, addOrder, clearCart, userType, currentUser } = useApp();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    barangay: '',
    city: 'Mansalay', // Locked to Mansalay
    province: 'Oriental Mindoro', // Locked to Oriental Mindoro
    zipCode: '5213', // Default zip code for Mansalay
    notes: '',
  });

  useEffect(() => {
    if (!userType) {
      toast.error('Please login to proceed with checkout');
      navigate('/select-role');
    }
  }, [userType, navigate]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!userType) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <LogIn className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
        <h2 className="mb-4">Please Login to Checkout</h2>
        <p className="text-muted-foreground mb-8">
          You need to be logged in to complete your purchase
        </p>
        <button
          onClick={() => navigate('/select-role')}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Login Now
        </button>
      </div>
    );
  }

  if (userType !== 'tourist') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="mb-4">Browse Only</h2>
        <p className="text-muted-foreground mb-8">
          Business accounts can browse products but cannot place orders.
        </p>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (userType !== 'tourist') {
      toast.error('Only tourists can place orders. Business accounts are for management only.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate shipping information
    if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.barangay) {
      toast.error('Please fill in all required shipping information');
      return;
    }

    setIsProcessing(true);

    try {
      const order = await postJSON('/api/orders', {
        items: cart,
        total,
        payment_method: paymentMethod,
        user_role: userType,
        user_id: currentUser?.id,
      });

      addOrder({
        items: cart,
        total,
        status: order.status ?? 'pending',
        paymentMethod,
      });

      clearCart();
      const result = await showTransactionSuccess('order');
      
      if (result.isConfirmed) {
        navigate('/status');
      } else {
        navigate('/products');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="mb-4">No items to checkout</h2>
        <p className="text-muted-foreground mb-8">
          Add some products to your cart first!
        </p>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="mb-8">Checkout</h1>

      <div className="space-y-6">
        {/* Shipping Information */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Shipping Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Full Name *</label>
              <input
                type="text"
                value={shippingInfo.fullName}
                onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Phone Number *</label>
              <input
                type="tel"
                value={shippingInfo.phone}
                onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="+63 912 345 6789"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Complete Address *</label>
              <input
                type="text"
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Street, House/Unit Number"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Barangay *</label>
              <select
                value={shippingInfo.barangay}
                onChange={(e) => setShippingInfo({ ...shippingInfo, barangay: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                required
              >
                <option value="">Select Barangay</option>
                <optgroup label="A - D">
                  <option value="B. Del Mundo">B. Del Mundo</option>
                  <option value="Balugo">Balugo</option>
                  <option value="Bonbon">Bonbon</option>
                  <option value="Budburan">Budburan</option>
                  <option value="Cabalwa">Cabalwa</option>
                  <option value="Don Pedro">Don Pedro</option>
                </optgroup>
                <optgroup label="M - P">
                  <option value="Maliwanag">Maliwanag</option>
                  <option value="Manaul">Manaul</option>
                  <option value="Panaytayan">Panaytayan</option>
                  <option value="Poblacion">Poblacion</option>
                </optgroup>
                <optgroup label="R - S">
                  <option value="Roma">Roma</option>
                  <option value="Santa Brigida (Sta. Brigida)">Santa Brigida (Sta. Brigida)</option>
                  <option value="Santa Maria">Santa Maria</option>
                  <option value="Santa Teresita">Santa Teresita</option>
                </optgroup>
                <optgroup label="V - W">
                  <option value="Villa Celestial">Villa Celestial</option>
                  <option value="Wasig">Wasig</option>
                  <option value="Waygan">Waygan</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">City/Municipality *</label>
              <input
                type="text"
                value={shippingInfo.city}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Mansalay"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Province</label>
              <input
                type="text"
                value={shippingInfo.province}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Oriental Mindoro"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Zip Code</label>
              <input
                type="text"
                value={shippingInfo.zipCode}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="5213"
                disabled
                readOnly
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Delivery Notes (Optional)</label>
              <textarea
                value={shippingInfo.notes}
                onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Landmark, special instructions, etc."
              />
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Order Items</h2>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p>{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × ₱{item.price}
                  </p>
                </div>
                <p className="text-primary">₱{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <div className="border-t border-primary/20 pt-3 flex justify-between">
              <span>Total Amount</span>
              <span className="text-primary">₱{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 border-primary/20 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <input
                type="radio"
                name="payment"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={(e) => setPaymentMethod(e.target.value as 'online')}
                className="w-4 h-4 text-primary"
              />
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p>Online Payment</p>
                <p className="text-sm text-muted-foreground">
                  Pay securely using credit/debit card or e-wallet
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 border-primary/20 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <input
                type="radio"
                name="payment"
                value="otc"
                checked={paymentMethod === 'otc'}
                onChange={(e) => setPaymentMethod(e.target.value as 'otc')}
                className="w-4 h-4 text-primary"
              />
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p>Over-the-Counter</p>
                <p className="text-sm text-muted-foreground">
                  Pay in person at our office or authorized payment centers
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-primary/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3>Order Summary</h3>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span>{paymentMethod === 'online' ? 'Online Payment' : 'Over-the-Counter'}</span>
            </div>
            <div className="border-t border-primary/20 pt-2 flex justify-between">
              <span>Total</span>
              <span className="text-primary">₱{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
