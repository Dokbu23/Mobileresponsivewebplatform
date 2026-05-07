import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, Building2, CheckCircle, LogIn, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON, getJSON, getPublicJSON, API_BASE } from '../../lib/api';
import { showTransactionSuccess } from '../../lib/sweetAlert';

export function Checkout() {
  const { cart, addOrder, clearCart, userType, currentUser } = useApp();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [businessPaymentDetails, setBusinessPaymentDetails] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
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

  useEffect(() => {
    if (paymentMethod === 'online') {
      fetchBusinessPaymentDetails();
    }
  }, [paymentMethod, cart]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Fetch business payment details when online payment is selected
  const fetchBusinessPaymentDetails = async () => {
    if (cart.length === 0) return;
    
    try {
      // Get the business owner of the first product (assuming single business per order)
      const firstProduct = cart[0];
      const productsResponse = await getPublicJSON('/products');
      const product = productsResponse.find((p: any) => p.id === firstProduct.id);
      
      if (product?.user_id) {
        // Fetch business owner details
        const businessResponse = await getJSON(`/business-users/${product.user_id}`);
        const paymentDetails = businessResponse.payment_details || [];
        
        // Add business_id to each payment method for receipt upload
        const detailsWithBusinessId = paymentDetails.map((payment: any) => ({
          ...payment,
          business_id: product.user_id
        }));
        
        setBusinessPaymentDetails(detailsWithBusinessId);
        setShowPaymentDetails(true);
      }
    } catch (error) {
      console.error('Error fetching business payment details:', error);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

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

    // For online payment, validate receipt upload
    if (paymentMethod === 'online') {
      if (!selectedPayment) {
        toast.error('Please select a payment method');
        return;
      }
      if (!receiptFile) {
        toast.error('Please upload payment receipt');
        return;
      }
      if (!paymentReference) {
        toast.error('Please enter payment reference number');
        return;
      }
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

      // If online payment, upload receipt
      if (paymentMethod === 'online' && receiptFile && selectedPayment) {
        const formData = new FormData();
        formData.append('type', 'order');
        formData.append('reference_id', order.id.toString());
        formData.append('business_id', selectedPayment.business_id.toString());
        formData.append('receipt_image', receiptFile);
        formData.append('amount', total.toString());
        formData.append('payment_method', selectedPayment.type);
        formData.append('payment_reference', paymentReference);
        formData.append('notes', paymentNotes);

        const token = localStorage.getItem('discover-mansalay:token');
        await fetch(`${API_BASE}/api/payment-receipts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
      }

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

        {/* Online Payment Details */}
        {paymentMethod === 'online' && showPaymentDetails && businessPaymentDetails.length > 0 && (
          <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
            <h2 className="mb-4">Business Payment Details</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a payment method and send your payment, then upload the receipt below.
            </p>
            
            <div className="space-y-3 mb-6">
              {businessPaymentDetails.map((payment, index) => (
                <label key={index} className="flex items-center gap-3 p-4 border-2 border-primary/20 rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="businessPayment"
                    checked={selectedPayment === payment}
                    onChange={() => setSelectedPayment(payment)}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary uppercase">{payment.type}</span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm font-medium">{payment.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Account: {payment.account_number} - {payment.account_name}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectedPayment && (
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6">
                <h3 className="mb-4">Upload Payment Receipt</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Payment Reference Number *</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                      placeholder="Enter transaction/reference number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Receipt Image *</label>
                    <div className="space-y-3">
                      {!receiptPreview ? (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptUpload}
                            className="hidden"
                            id="receipt-upload"
                          />
                          <label
                            htmlFor="receipt-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary transition-colors"
                          >
                            <Upload className="h-8 w-8 text-primary/60 mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                            <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                          </label>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                          />
                          <button
                            onClick={removeReceipt}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Additional Notes (Optional)</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                      placeholder="Any additional information about the payment..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
