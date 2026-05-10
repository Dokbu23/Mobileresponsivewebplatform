import { useState, useEffect } from 'react';
import { X, Upload, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthToken, getPublicPaymentSettings } from '../lib/api';

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSubmitted: () => void;
  userRole: 'enterprise' | 'resort';
}

interface PaymentMethod {
  id: number;
  name: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
}

export function SubscriptionPaymentModal({ 
  isOpen, 
  onClose, 
  onPaymentSubmitted,
  userRole 
}: SubscriptionPaymentModalProps) {
  const [amount, setAmount] = useState<number>(50); // Default ₱50, will be updated from API
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch dynamic payment settings from API
  useEffect(() => {
    if (isOpen) {
      fetchPaymentSettings();
    }
  }, [isOpen]);

  const fetchPaymentSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await getPublicPaymentSettings();
      setAmount(settings.subscription_amount);
      setPaymentMethods(settings.payment_methods);
      
      // Auto-select first enabled method
      if (settings.payment_methods.length > 0) {
        setSelectedMethodId(settings.payment_methods[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadReceipt = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!receiptImage) {
      toast.error('Please upload payment receipt');
      return;
    }

    if (!paymentReference) {
      toast.error('Please enter payment reference number');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('amount', String(amount));
      formData.append('payment_method', selectedMethod.name);
      formData.append('payment_reference', paymentReference);
      formData.append('receipt_image', receiptImage);
      if (notes) {
        formData.append('notes', notes);
      }

      const token = getAuthToken();
      const response = await fetch('http://localhost:8000/api/subscription/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload payment');
      }

      toast.success('Payment receipt uploaded! Waiting for admin verification.');
      setIsSubmitted(true);
      onPaymentSubmitted();
    } catch (error) {
      toast.error('Failed to upload payment receipt');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Show "Payment Under Review" state after submission
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">Payment Submitted!</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold mb-2">Payment Under Review</h3>
            <p className="text-muted-foreground mb-6">
              Your payment is being reviewed by our admin team. Please wait until your payment is verified.
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>What's next?</strong><br />
                You will receive a notification once your payment is verified. After verification, you'll have full access to all features!
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Welcome to DiscoverMansalay {userRole === 'enterprise' ? 'Enterprise' : 'Resort'}!
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-medium">
              🎉 To unlock all features and start managing your {userRole === 'enterprise' ? 'products' : 'accommodations'}, 
              please complete your subscription payment.
            </p>
          </div>

          {loadingSettings ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading payment settings...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">No payment methods available. Please contact admin.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-lg">Subscription Fee</h3>
                <p className="text-4xl font-bold text-primary">₱{amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">One-time payment for 1 year access</p>
              </div>

              {/* Payment Method Selection (if multiple methods available) */}
              {paymentMethods.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Select Payment Method *</label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedMethodId === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                          className="w-4 h-4 text-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.account_name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Payment Method Details */}
              {selectedMethod && (
                <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{selectedMethod.name} Payment Details</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedMethod.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number:</span>
                      <span className="font-medium font-mono">{selectedMethod.account_number}</span>
                    </div>
                    {selectedMethod.instructions && (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedMethod.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Reference Number *</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                    placeholder={`Enter ${selectedMethod?.name || 'payment'} reference number`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Payment Receipt *</label>
                  <div className="space-y-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors bg-white flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {receiptImage ? receiptImage.name : 'Choose receipt image...'}
                        </span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          Browse
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    
                    {receiptPreview && (
                      <div className="relative w-full max-w-xs">
                        <img 
                          src={receiptPreview} 
                          alt="Receipt preview" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUploadReceipt}
                  disabled={isSubmitting || !selectedMethod}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
                >
                  I'll Pay Later
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                ⚠️ Limited access until payment is verified by admin. You can view your dashboard but cannot add/edit/delete items.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
