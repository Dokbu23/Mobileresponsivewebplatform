import { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, Eye, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText } from 'lucide-react';
import { getJSON, patchJSON } from '../../lib/api';
import { showSuccessAlert, showConfirmAlert } from '../../lib/sweetAlert';
import { toast } from 'sonner';

interface SubscriptionPayment {
  id: number;
  user_id: number;
  amount: string;
  payment_method: string;
  payment_reference: string | null;
  receipt_image: string | null;
  status: 'pending' | 'verified' | 'rejected';
  notes: string | null;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'enterprise' | 'resort';
    subscription_status: string;
  };
  verifier?: {
    id: number;
    name: string;
    email: string;
  };
}

export function ManageSubscriptions() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await getJSON('/subscription/payments');
      setPayments(Array.isArray(response) ? response : []);
    } catch (error) {
      setPayments([]);
      console.error('Error fetching subscription payments:', error);
      toast.error('Failed to load subscription payments');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.payment_reference && payment.payment_reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      verified: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
    };

    const icons = {
      pending: <Clock className="h-4 w-4" />,
      verified: <CheckCircle className="h-4 w-4" />,
      rejected: <XCircle className="h-4 w-4" />,
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm border inline-flex items-center gap-1 ${colors[status as keyof typeof colors]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      enterprise: 'bg-pink-100 text-pink-700 border-pink-300',
      resort: 'bg-green-100 text-green-700 border-green-300',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[role as keyof typeof colors]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const handleVerifyPayment = async (payment: SubscriptionPayment) => {
    const result = await showConfirmAlert(
      'Verify Payment?',
      `Verify subscription payment from ${payment.user.name}? This will grant them full access for 1 year.`
    );

    if (result.isConfirmed) {
      try {
        await patchJSON(`/subscription/payments/${payment.id}/verify`, {
          status: 'verified',
          notes: 'Payment verified by admin'
        });

        await showSuccessAlert(
          'Payment Verified!',
          `${payment.user.name} now has full access to all features.`
        );

        fetchPayments();
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Failed to verify payment');
      }
    }
  };

  const handleRejectPayment = async (payment: SubscriptionPayment) => {
    const result = await showConfirmAlert(
      'Reject Payment?',
      `Reject subscription payment from ${payment.user.name}? They will need to submit a new payment.`,
      'warning'
    );

    if (result.isConfirmed) {
      try {
        await patchJSON(`/subscription/payments/${payment.id}/verify`, {
          status: 'rejected',
          notes: 'Payment rejected by admin'
        });

        await showSuccessAlert(
          'Payment Rejected',
          `Payment from ${payment.user.name} has been rejected.`
        );

        fetchPayments();
      } catch (error) {
        console.error('Error rejecting payment:', error);
        toast.error('Failed to reject payment');
      }
    }
  };

  const handleViewReceipt = (payment: SubscriptionPayment) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    verified: payments.filter(p => p.status === 'verified').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    totalRevenue: payments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0),
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading subscription payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Manage Subscriptions</h1>
        <p className="text-muted-foreground">
          Review and verify subscription payments from enterprise and resort users
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-primary">₱{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b-2 border-primary/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Payment Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No subscription payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.user.name}</p>
                          <p className="text-sm text-muted-foreground">{payment.user.email}</p>
                          <div className="mt-1">{getRoleBadge(payment.user.role)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-primary">₱{parseFloat(payment.amount).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {payment.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono">{payment.payment_reference || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewReceipt(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Receipt"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyPayment(payment)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Verify Payment"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Reject Payment"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Payment Receipt</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Payment Details */}
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedPayment.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedPayment.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium text-primary">₱{parseFloat(selectedPayment.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{selectedPayment.payment_method.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium font-mono">{selectedPayment.payment_reference || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                  </div>
                  {selectedPayment.verified_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="font-medium">{new Date(selectedPayment.verified_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {selectedPayment.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              {/* Receipt Image */}
              {selectedPayment.receipt_image && (
                <div>
                  <h3 className="font-semibold mb-3">Receipt Image</h3>
                  <div className="border-2 border-primary/20 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:8000${selectedPayment.receipt_image}`}
                      alt="Payment Receipt"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedPayment.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      handleVerifyPayment(selectedPayment);
                    }}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Verify Payment
                  </button>
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      handleRejectPayment(selectedPayment);
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium inline-flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
