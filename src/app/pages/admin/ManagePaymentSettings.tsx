import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminPaymentSettings,
  updateAdminPaymentSettings,
  getAdminPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethod,
  PaymentMethod,
  PaymentMethodInput,
} from '../../lib/api';

export function ManagePaymentSettings() {
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(50);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState<string>('50');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<PaymentMethodInput>({
    name: '',
    account_name: '',
    account_number: '',
    instructions: '',
    enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settings, methods] = await Promise.all([
        getAdminPaymentSettings(),
        getAdminPaymentMethods(),
      ]);
      setSubscriptionAmount(settings.subscription_amount);
      setTempAmount(settings.subscription_amount.toString());
      setPaymentMethods(methods);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAmount = async () => {
    const amount = parseFloat(tempAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      await updateAdminPaymentSettings(amount);
      setSubscriptionAmount(amount);
      setEditingAmount(false);
      toast.success('Subscription amount updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update amount');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const result = await togglePaymentMethod(id);
      setPaymentMethods(prev =>
        prev.map(m => (m.id === id ? result.payment_method : m))
      );
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle payment method');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await deletePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Payment method deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete payment method');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMethod) {
        const result = await updatePaymentMethod(editingMethod.id, formData);
        setPaymentMethods(prev =>
          prev.map(m => (m.id === editingMethod.id ? result.payment_method : m))
        );
        toast.success('Payment method updated successfully');
      } else {
        const result = await createPaymentMethod(formData);
        setPaymentMethods(prev => [result.payment_method, ...prev]);
        toast.success('Payment method created successfully');
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment method');
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      account_name: '',
      account_number: '',
      instructions: '',
      enabled: true,
    });
    setEditingMethod(null);
    setShowAddModal(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setFormData({
      name: method.name,
      account_name: method.account_name,
      account_number: method.account_number,
      instructions: method.instructions || '',
      enabled: method.enabled,
    });
    setEditingMethod(method);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingMethod(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <h1>Payment Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage subscription amount and payment methods
        </p>
      </div>

      {/* Subscription Amount Section */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6">
        <h2 className="mb-4 flex items-center gap-2">
          <span className="text-xl font-bold">₱</span>
          Subscription Amount
        </h2>
        <div className="flex items-center gap-4">
          {editingAmount ? (
            <>
              <input
                type="number"
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                className="px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Enter amount"
                step="0.01"
                min="0.01"
              />
              <button
                onClick={handleUpdateAmount}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingAmount(false);
                  setTempAmount(subscriptionAmount.toString());
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-primary">
                ₱{subscriptionAmount.toFixed(2)}
              </div>
              <button
                onClick={() => setEditingAmount(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit Amount
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2>Payment Methods</h2>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Payment Method
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Account Name</th>
                <th className="text-left py-3 px-4">Account Number</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((method) => (
                <tr key={method.id} className="border-b border-primary/10">
                  <td className="py-3 px-4 font-medium">{method.name}</td>
                  <td className="py-3 px-4">{method.account_name}</td>
                  <td className="py-3 px-4">{method.account_number}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggle(method.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        method.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {method.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(method)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="mb-4">
              {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="e.g., GCash, PayMaya"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Name *</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Account holder name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Account Number *</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Account or mobile number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Instructions</label>
                <textarea
                  value={formData.instructions || ''}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Payment instructions for users"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm">
                  Enable this payment method
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
