import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPublicJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';

type ContentType = 'attractions' | 'events' | 'accommodations' | 'products';

type AttractionForm = {
  name: string;
  location: string;
  category: string;
  description: string;
  full_description: string;
  image: string;
};

type EventForm = {
  name: string;
  date: string;
  time: string;
  location: string;
  category: string;
  capacity: string;
  description: string;
  full_description: string;
  image: string;
};

type AccommodationForm = {
  name: string;
  description: string;
  price_per_night: number;
  image: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  user_id: string;
};

const emptyAttraction: AttractionForm = {
  name: '',
  location: '',
  category: '',
  description: '',
  full_description: '',
  image: '',
};

const emptyEvent: EventForm = {
  name: '',
  date: '',
  time: '',
  location: '',
  category: '',
  capacity: '',
  description: '',
  full_description: '',
  image: '',
};

const emptyAccommodation: AccommodationForm = {
  name: '',
  description: '',
  price_per_night: 0,
  image: '',
};

const emptyProduct: ProductForm = {
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: '',
  image: '',
  user_id: '',
};

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<ContentType>('attractions');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Record<ContentType, any[]>>({
    attractions: [],
    events: [],
    accommodations: [],
    products: [],
  });
  const [editingId, setEditingId] = useState<Record<ContentType, string | null>>({
    attractions: null,
    events: null,
    accommodations: null,
    products: null,
  });
  const [attractionForm, setAttractionForm] = useState<AttractionForm>(emptyAttraction);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);
  const [accommodationForm, setAccommodationForm] = useState<AccommodationForm>(emptyAccommodation);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [attractions, events, accommodations, products] = await Promise.all([
        getPublicJSON('/attractions'),
        getPublicJSON('/events'),
        getPublicJSON('/accommodations'),
        getPublicJSON('/products'),
      ]);

      setItems({
        attractions: Array.isArray(attractions) ? attractions : [],
        events: Array.isArray(events) ? events : [],
        accommodations: Array.isArray(accommodations) ? accommodations : [],
        products: Array.isArray(products) ? products : [],
      });
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (type: ContentType) => {
    setEditingId(prev => ({ ...prev, [type]: null }));
    if (type === 'attractions') setAttractionForm(emptyAttraction);
    if (type === 'events') setEventForm(emptyEvent);
    if (type === 'accommodations') setAccommodationForm(emptyAccommodation);
    if (type === 'products') setProductForm(emptyProduct);
  };

  const handleEdit = (type: ContentType, item: any) => {
    setEditingId(prev => ({ ...prev, [type]: String(item.id) }));
    if (type === 'attractions') {
      setAttractionForm({
        name: item.name ?? '',
        location: item.location ?? '',
        category: item.category ?? '',
        description: item.description ?? '',
        full_description: item.full_description ?? item.fullDescription ?? '',
        image: item.image ?? '',
      });
    }
    if (type === 'events') {
      setEventForm({
        name: item.name ?? '',
        date: item.date ?? '',
        time: item.time ?? '',
        location: item.location ?? '',
        category: item.category ?? '',
        capacity: item.capacity ?? '',
        description: item.description ?? '',
        full_description: item.full_description ?? item.fullDescription ?? '',
        image: item.image ?? '',
      });
    }
    if (type === 'accommodations') {
      setAccommodationForm({
        name: item.name ?? '',
        description: item.description ?? '',
        price_per_night: Number(item.price_per_night ?? item.pricePerNight ?? 0),
        image: item.image ?? '',
      });
    }
    if (type === 'products') {
      setProductForm({
        name: item.name ?? '',
        description: item.description ?? '',
        price: Number(item.price ?? 0),
        stock: Number(item.stock ?? 0),
        category: item.category ?? '',
        image: item.image ?? '',
        user_id: item.user_id ? String(item.user_id) : '',
      });
    }
  };

  const handleDelete = async (type: ContentType, id: number | string) => {
    try {
      await deleteJSON(`/${type}/${id}`);
      await loadAll();
      toast.success('Item deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const handleSubmit = async (type: ContentType) => {
    try {
      const id = editingId[type];
      if (type === 'attractions') {
        const payload = { ...attractionForm };
        if (id) {
          await putJSON(`/attractions/${id}`, payload);
        } else {
          await postJSON('/attractions', payload);
        }
      }
      if (type === 'events') {
        const payload = { ...eventForm };
        if (id) {
          await putJSON(`/events/${id}`, payload);
        } else {
          await postJSON('/events', payload);
        }
      }
      if (type === 'accommodations') {
        const payload = { ...accommodationForm };
        if (id) {
          await putJSON(`/accommodations/${id}`, payload);
        } else {
          await postJSON('/accommodations', payload);
        }
      }
      if (type === 'products') {
        const payload = {
          ...productForm,
          price: Number(productForm.price || 0),
          stock: Number(productForm.stock || 0),
          user_id: productForm.user_id ? Number(productForm.user_id) : null,
        };
        if (id) {
          await putJSON(`/products/${id}`, payload);
        } else {
          await postJSON('/products', payload);
        }
      }

      toast.success(id ? 'Updated successfully' : 'Created successfully');
      resetForm(type);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    }
  };

  const renderForm = () => {
    if (activeTab === 'attractions') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Name"
            value={attractionForm.name}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Location"
            value={attractionForm.location}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, location: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Category"
            value={attractionForm.category}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, category: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Image URL"
            value={attractionForm.image}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, image: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            rows={3}
            placeholder="Short description"
            value={attractionForm.description}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            rows={3}
            placeholder="Full description"
            value={attractionForm.full_description}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, full_description: e.target.value }))}
          />
        </div>
      );
    }

    if (activeTab === 'events') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Name"
            value={eventForm.name}
            onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="date"
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            value={eventForm.date}
            onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Time"
            value={eventForm.time}
            onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Location"
            value={eventForm.location}
            onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Category"
            value={eventForm.category}
            onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Capacity"
            value={eventForm.capacity}
            onChange={(e) => setEventForm(prev => ({ ...prev, capacity: e.target.value }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Image URL"
            value={eventForm.image}
            onChange={(e) => setEventForm(prev => ({ ...prev, image: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            rows={3}
            placeholder="Short description"
            value={eventForm.description}
            onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            rows={3}
            placeholder="Full description"
            value={eventForm.full_description}
            onChange={(e) => setEventForm(prev => ({ ...prev, full_description: e.target.value }))}
          />
        </div>
      );
    }

    if (activeTab === 'accommodations') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Name"
            value={accommodationForm.name}
            onChange={(e) => setAccommodationForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="number"
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Price per night"
            value={accommodationForm.price_per_night}
            onChange={(e) => setAccommodationForm(prev => ({ ...prev, price_per_night: Number(e.target.value) }))}
          />
          <input
            className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            placeholder="Image URL"
            value={accommodationForm.image}
            onChange={(e) => setAccommodationForm(prev => ({ ...prev, image: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
            rows={3}
            placeholder="Description"
            value={accommodationForm.description}
            onChange={(e) => setAccommodationForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Name"
          value={productForm.name}
          onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
        />
        <input
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Category"
          value={productForm.category}
          onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
        />
        <input
          type="number"
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Price"
          value={productForm.price}
          onChange={(e) => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
        />
        <input
          type="number"
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Stock"
          value={productForm.stock}
          onChange={(e) => setProductForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
        />
        <input
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Image URL"
          value={productForm.image}
          onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
        />
        <input
          className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          placeholder="Owner user ID (optional)"
          value={productForm.user_id}
          onChange={(e) => setProductForm(prev => ({ ...prev, user_id: e.target.value }))}
        />
        <textarea
          className="md:col-span-2 w-full px-4 py-2 border-2 border-primary/20 rounded-lg"
          rows={3}
          placeholder="Description"
          value={productForm.description}
          onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>
    );
  };

  const renderList = () => {
    const list = items[activeTab];
    if (!list.length) {
      return (
        <div className="bg-white border-2 border-primary/20 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No items yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((item) => (
          <div key={item.id} className="bg-white border-2 border-primary/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate">{item.name ?? 'Untitled'}</p>
              <p className="text-sm text-muted-foreground truncate">{item.category ?? item.location ?? ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(activeTab, item)}
                className="px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary/5"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(activeTab, item.id)}
                className="px-4 py-2 bg-destructive text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Manage Content</h1>
        <p className="text-muted-foreground">
          Manage attractions, events, accommodations, and products
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['attractions', 'events', 'accommodations', 'products'] as ContentType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-white border-2 border-primary/20 text-foreground hover:border-primary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg">{editingId[activeTab] ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</h2>
          {editingId[activeTab] ? (
            <button
              onClick={() => resetForm(activeTab)}
              className="px-4 py-2 border-2 border-primary text-primary rounded-lg"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {renderForm()}
        <div className="mt-4">
          <button
            onClick={() => handleSubmit(activeTab)}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {editingId[activeTab] ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {renderList()}
    </div>
  );
}
