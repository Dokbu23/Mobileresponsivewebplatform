import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { CreditCard, Building2, CheckCircle, LogIn, Upload, X, Truck, MapPin, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { postJSON, getJSON, getPublicJSON, API_BASE } from '../../lib/api';
import { showTransactionSuccess } from '../../lib/sweetAlert';

export function Checkout() {
  const { cart, addOrder, clearCart, userType, currentUser } = useApp();
  const navigate = useNavigate();
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'otc' | 'cod'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [businessPaymentDetails, setBusinessPaymentDetails] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
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
  const [hasAppliedSavedAddress, setHasAppliedSavedAddress] = useState(false);

  useEffect(() => {
    if (!userType) {
      toast.error('Please login to proceed with checkout');
      navigate('/select-role');
    }
  }, [userType, navigate]);

  useEffect(() => {
    if (userType !== 'tourist' || hasAppliedSavedAddress) {
      return;
    }

    const loadDefaultAddress = async () => {
      try {
        const addresses = await getJSON('/shipping-addresses');
        setSavedAddresses(addresses ?? []);
        const defaultAddress = addresses?.find((address: any) => address.is_default);

        const hasShippingInput = Boolean(
          shippingInfo.fullName ||
          shippingInfo.phone ||
          shippingInfo.address ||
          shippingInfo.barangay
        );

        if (defaultAddress && !hasShippingInput) {
          setSelectedAddressId(defaultAddress.id ?? null);
          setShippingInfo({
            fullName: defaultAddress.full_name ?? '',
            phone: defaultAddress.phone ?? '',
            address: defaultAddress.address ?? '',
            barangay: defaultAddress.barangay ?? '',
            city: defaultAddress.city ?? 'Mansalay',
            province: defaultAddress.province ?? 'Oriental Mindoro',
            zipCode: defaultAddress.zip ?? '5213',
            notes: defaultAddress.notes ?? '',
          });
        }
      } catch (error) {
        // Ignore address load errors to avoid blocking checkout.
      } finally {
        setHasAppliedSavedAddress(true);
      }
    };

    loadDefaultAddress();
  }, [userType, hasAppliedSavedAddress, shippingInfo]);

  useEffect(() => {
    if (paymentMethod === 'online') {
      fetchBusinessPaymentDetails();
    }
  }, [paymentMethod, cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promoApplied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

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
      } else {
        // Static listing — no business payment details
        setBusinessPaymentDetails([]);
        setShowPaymentDetails(true);
      }
    } catch (error) {
      console.error('Error fetching business payment details:', error);
      setBusinessPaymentDetails([]);
      setShowPaymentDetails(true);
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

  const applyAddress = (address: any) => {
    if (!address) return;
    setShippingInfo({
      fullName: address.full_name ?? '',
      phone: address.phone ?? '',
      address: address.address ?? '',
      barangay: address.barangay ?? '',
      city: address.city ?? 'Mansalay',
      province: address.province ?? 'Oriental Mindoro',
      zipCode: address.zip ?? '5213',
      notes: address.notes ?? '',
    });
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

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await postJSON('/promo-codes/apply', { code: promoCode.trim(), amount: subtotal });
      setPromoApplied({ code: res.code, discount: res.discount, message: res.message });
      toast.success(`${res.message} — ₱${res.discount.toFixed(2)} off!`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid promo code');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

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
      if (businessPaymentDetails.length === 0) {
        toast.error('This seller has no payment methods set up. Please choose COD or OTC.');
        return;
      }
      if (!selectedPayment) {
        toast.error('Please select a payment account');
        return;
      }
      if (!receiptFile) {
        toast.error('Please upload your payment receipt screenshot');
        return;
      }
      if (!paymentReference) {
        toast.error('Please enter the transaction/reference number');
        return;
      }
    }

    setIsProcessing(true);

    try {
      console.log('Creating order with data:', {
        items: cart,
        total,
        payment_method: paymentMethod,
        user_role: userType,
        user_id: currentUser?.id,
        shipping_info: shippingInfo,
      });
      
      const order = await postJSON('/orders', {
        items: cart,
        total,
        payment_method: paymentMethod,
        user_role: userType,
        user_id: currentUser?.id,
        shipping_info: shippingInfo,
      });

      console.log('Order created successfully:', order);

      // Handle multiple orders response
      const orders = order.orders || [order];
      const isMultipleOrders = Array.isArray(order.orders) && order.orders.length > 1;

      // If online payment, upload receipt for each order
      if (paymentMethod === 'online' && receiptFile && selectedPayment) {
        for (const singleOrder of orders) {
          const formData = new FormData();
          formData.append('type', 'order');
          formData.append('reference_id', singleOrder.id.toString());
          formData.append('business_id', selectedPayment.business_id.toString());
          formData.append('receipt_image', receiptFile);
          formData.append('amount', singleOrder.total.toString());
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
      }

      // Redeem promo code if applied
      if (promoApplied) {
        try {
          await postJSON('/promo-codes/redeem', { code: promoApplied.code, amount: subtotal });
        } catch { /* non-critical */ }
      }

      // Add orders to local state
      for (const singleOrder of orders) {
        addOrder({
          items: singleOrder.items,
          total: singleOrder.total,
          status: singleOrder.status ?? 'pending',
          paymentMethod,
        });
      }

      clearCart();
      
      // Show appropriate success message
      if (isMultipleOrders) {
        toast.success(`${orders.length} orders created for different businesses`);
      }
      
      const result = await showTransactionSuccess('order');
      
      if (result.isConfirmed) {
        navigate('/status');
      } else {
        navigate('/products');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        toast.error(error.message);
      } else {
        console.error('Unknown error:', error);
        toast.error('Failed to place order');
      }
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
          <div className="flex items-center justify-between mb-4">
            <h2>Shipping Information</h2>
            <Link
              to="/shipping-addresses"
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <MapPin className="h-4 w-4" />
              Manage addresses
            </Link>
          </div>

          {/* Address Selection */}
          {savedAddresses.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-3 font-medium">Choose Delivery Address</label>
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => {
                            setSelectedAddressId(address.id);
                            applyAddress(address);
                          }}
                          className="mt-1 w-4 h-4 text-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{address.full_name}</span>
                            {address.is_default && (
                              <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                          <p className="text-sm text-gray-600">
                            {address.address}, {address.barangay}, {address.city}
                          </p>
                          {address.notes && (
                            <p className="text-xs text-gray-500 mt-1">Note: {address.notes}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Manual Address Entry Toggle */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressId(null);
                    setShippingInfo({
                      fullName: '',
                      phone: '',
                      address: '',
                      barangay: '',
                      city: 'Mansalay',
                      province: 'Oriental Mindoro',
                      zipCode: '5213',
                      notes: '',
                    });
                  }}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  + Use a different address
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No saved addresses yet</p>
              <Link
                to="/shipping-addresses"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Address
              </Link>
            </div>
          )}

          {/* Manual Address Form (shown when no address selected or "use different address" clicked) */}
          {(savedAddresses.length === 0 || selectedAddressId === null) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium mb-4">Enter Delivery Address</h3>
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
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Order Items</h2>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p>{item.name}</p>
                  {item.selectedVariation && (
                    <p className="text-xs text-pink-600">
                      {item.selectedVariation.name}: <strong>{item.selectedVariation.value}</strong>
                    </p>
                  )}
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
                onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
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
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
                className="w-4 h-4 text-primary"
              />
              <Truck className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p>Cash on Delivery (COD)</p>
                <p className="text-sm text-muted-foreground">
                  Pay with cash when your order is delivered
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 border-primary/20 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <input
                type="radio"
                name="payment"
                value="otc"
                checked={paymentMethod === 'otc'}
                onChange={(e) => setPaymentMethod(e.target.value as 'online' | 'otc' | 'cod')}
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
        {paymentMethod === 'online' && showPaymentDetails && (
          <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
            <h2 className="mb-1">Online Payment</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Transfer the exact amount then upload your receipt below.
            </p>

            {businessPaymentDetails.length === 0 ? (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
                <CreditCard className="h-10 w-10 mx-auto text-orange-400 mb-2" />
                <p className="font-medium text-orange-800">No payment details available</p>
                <p className="text-sm text-orange-700 mt-1">
                  This seller hasn't set up their payment methods yet. Please choose Cash on Delivery or Over-the-Counter instead.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount to transfer</span>
                  <span className="text-lg font-bold text-primary">₱{total.toFixed(2)}</span>
                </div>

                <p className="text-sm font-medium mb-3">Select payment account:</p>
                <div className="space-y-3 mb-6">
                  {businessPaymentDetails.map((payment, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPayment === payment
                          ? 'border-primary bg-primary/5'
                          : 'border-primary/20 hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="businessPayment"
                        checked={selectedPayment === payment}
                        onChange={() => setSelectedPayment(payment)}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded uppercase">{payment.type}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedPayment && (
                  <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-5 space-y-4">
                    <h3 className="font-semibold text-sm">Upload Payment Proof</h3>

                    <div>
                      <label className="block text-sm mb-1.5">Reference / Transaction Number *</label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm"
                        placeholder="e.g. 1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1.5">Receipt Screenshot *</label>
                      {!receiptPreview ? (
                        <label
                          htmlFor="receipt-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                        >
                          <Upload className="h-8 w-8 text-primary/40 mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                          <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptUpload}
                            className="hidden"
                            id="receipt-upload"
                          />
                        </label>
                      ) : (
                        <div className="relative">
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                          />
                          <button
                            onClick={removeReceipt}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm mb-1.5">Notes (Optional)</label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none text-sm resize-none"
                        placeholder="Any additional info about the payment..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Promo Code */}
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
          <h2 className="mb-4">Promo Code</h2>
          {promoApplied ? (
            <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-mono font-bold text-green-700">{promoApplied.code}</p>
                <p className="text-sm text-green-600">-₱{promoApplied.discount.toFixed(2)} discount applied</p>
              </div>
              <button onClick={() => { setPromoApplied(null); setPromoCode(''); }} className="text-sm text-red-500 hover:text-red-700">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                className="flex-1 px-4 py-2.5 border-2 border-primary/20 rounded-lg focus:border-primary outline-none font-mono text-sm"
                placeholder="Enter promo code"
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim()}
                className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {promoLoading ? '...' : 'Apply'}
              </button>
            </div>
          )}
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
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-green-600">
                <span>Promo ({promoApplied.code})</span>
                <span>-₱{promoApplied.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span>
                {paymentMethod === 'online' ? 'Online Payment' : 
                 paymentMethod === 'cod' ? 'Cash on Delivery' : 'Over-the-Counter'}
              </span>
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
