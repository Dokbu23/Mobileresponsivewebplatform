import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Plus, Edit, Trash2, Star, Phone, Home, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { getJSON, postJSON, patchJSON, deleteJSON } from '../../lib/api';
import { showSuccessAlert, showConfirmAlert } from '../../lib/sweetAlert';

interface ShippingAddress {
  id: number;
  full_name: string;
  phone: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  zip: string;
  notes?: string;
  is_default: boolean;
  created_at: string;
}

export function ShippingAddresses() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const { userType } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    barangay: '',
    city: 'Mansalay',
    province: 'Oriental Mindoro',
    zip: '5213',
    notes: '',
    is_default: false,
  });

  useEffect(() => {
    if (userType !== 'tourist') {
      navigate('/select-role');
      return;
    }
    fetchAddresses();
  }, [userType, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await getJSON('/shipping-addresses');
      setAddresses(response || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      address: '',
      barangay: '',
      city: 'Mansalay',
      province: 'Oriental Mindoro',
      zip: '5213',
      notes: '',
      is_default: false,
    });
    setEditingAddress(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.phone || !formData.address || !formData.barangay) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAddress) {
        await patchJSON(`/shipping-addresses/${editingAddress.id}`, formData);
        await showSuccessAlert('Address Updated!', 'Your shipping address has been updated successfully.');
      } else {
        await postJSON('/shipping-addresses', formData);
        await showSuccessAlert('Address Added!', 'Your shipping address has been added successfully.');
      }
      
      resetForm();
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address');
    }
  };

  const handleEdit = (address: ShippingAddress) => {
    setFormData({
      full_name: address.full_name,
      phone: address.phone,
      address: address.address,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      zip: address.zip,
      notes: address.notes || '',
      is_default: address.is_default,
    });
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleDelete = async (address: ShippingAddress) => {
    const result = await showConfirmAlert(
      'Delete Address?',
      `Are you sure you want to delete this address for ${address.full_name}?`
    );

    if (result.isConfirmed) {
      try {
        await deleteJSON(`/shipping-addresses/${address.id}`);
        await showSuccessAlert('Address Deleted!', 'The shipping address has been deleted successfully.');
        fetchAddresses();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete address');
      }
    }
  };

  const handleSetDefault = async (address: ShippingAddress) => {
    try {
      await patchJSON(`/shipping-addresses/${address.id}/default`, {});
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default address');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="mb-2">Shipping Addresses</h1>
          <p className="text-muted-foreground">
            Manage your delivery addresses for faster checkout
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Address
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6">
          <h2 className="mb-4">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="+63 912 345 6789"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Complete Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Street, House/Unit Number"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Barangay *</label>
                <select
                  value={formData.barangay}
                  onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
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
                <label className="block text-sm mb-2">City/Municipality</label>
                <input
                  type="text"
                  value={formData.city}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Delivery Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                placeholder="Landmark, special instructions, etc."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-primary"
              />
              <label htmlFor="is_default" className="text-sm">
                Set as default address
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editingAddress ? 'Update Address' : 'Add Address'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="mb-2">No addresses yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first shipping address to make checkout faster
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white border-2 rounded-lg p-6 ${
                address.is_default ? 'border-primary bg-primary/5' : 'border-primary/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{address.full_name}</h3>
                    {address.is_default && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-primary text-white text-xs rounded-full">
                        <Star className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{address.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Home className="h-4 w-4 mt-0.5" />
                      <div>
                        <p>{address.address}</p>
                        <p>{address.barangay}, {address.city}</p>
                        <p>{address.province} {address.zip}</p>
                        {address.notes && (
                          <p className="text-xs italic mt-1">Note: {address.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Set as default"
                    >
                      <Star className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit address"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(address)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete address"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}