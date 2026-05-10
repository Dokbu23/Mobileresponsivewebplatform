import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Plus, Edit2, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { getJSON, postJSON, deleteJSON } from '../../lib/api';
import { showSuccessAlert, showConfirmDialog } from '../../lib/sweetAlert';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

interface Event {
  id: number;
  name: string;
  location: string | null;
  category: string | null;
  image: string | null;
  date: string | null;
  time: string | null;
  capacity: string | null;
  description: string | null;
  full_description: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    role: 'admin' | 'enterprise' | 'resort';
  } | null;
}

const CATEGORIES = ['Festival', 'Concert', 'Workshop', 'Sports', 'Cultural', 'Other'];

export function ManageEvents() {
  const { currentUser } = useApp();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'admin' | 'enterprise' | 'resort'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    category: '',
    date: '',
    time: '',
    capacity: '',
    description: '',
    full_description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getJSON('/public/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image format. Please use JPG, PNG, GIF, or WebP');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      category: '',
      date: '',
      time: '',
      capacity: '',
      description: '',
      full_description: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingEventId(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Event name is required');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.category) formDataToSend.append('category', formData.category);
      if (formData.date) formDataToSend.append('date', formData.date);
      if (formData.time) formDataToSend.append('time', formData.time);
      if (formData.capacity) formDataToSend.append('capacity', formData.capacity);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.full_description) formDataToSend.append('full_description', formData.full_description);
      if (imageFile) formDataToSend.append('image', imageFile);

      if (editingEventId) {
        // Update existing event
        await postJSON(`/events/${editingEventId}`, formDataToSend, true);
        await showSuccessAlert('Event Updated!', `${formData.name} has been updated successfully.`);
      } else {
        // Create new event
        await postJSON('/events', formDataToSend, true);
        await showSuccessAlert('Event Created!', `${formData.name} has been created successfully.`);
      }

      await fetchEvents();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save event');
    }
  };

  const handleEdit = (event: Event) => {
    setFormData({
      name: event.name,
      location: event.location || '',
      category: event.category || '',
      date: event.date || '',
      time: event.time || '',
      capacity: event.capacity || '',
      description: event.description || '',
      full_description: event.full_description || '',
    });
    setImagePreview(event.image ? getImageUrl(event.image) : null);
    setEditingEventId(event.id);
    setShowAddForm(true);
  };

  const handleDelete = async (event: Event) => {
    const confirmed = await showConfirmDialog(
      'Delete Event?',
      `Are you sure you want to delete "${event.name}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (confirmed) {
      try {
        await deleteJSON(`/events/${event.id}`);
        await showSuccessAlert('Event Deleted', `${event.name} has been deleted successfully.`);
        await fetchEvents();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete event');
      }
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const decodedPath = decodeURIComponent(imagePath);
    if (decodedPath.startsWith('/assets')) {
      return `http://localhost:5173${decodedPath}`;
    }
    return `http://localhost:8000${decodedPath}`;
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesOwner = ownerFilter === 'all' || event.creator?.role === ownerFilter;
    return matchesSearch && matchesCategory && matchesOwner;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2">Manage Events</h1>
          <p className="text-muted-foreground">
            Create and manage events across the platform
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Event
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-primary/20 p-6 flex items-center justify-between">
              <h2>{editingEventId ? 'Edit Event' : 'Add New Event'}</h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-sm mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Enter event name"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="Enter location"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm mb-2">Event Image</label>
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="h-12 w-12 text-primary/50 mb-2" />
                      <span className="text-sm text-muted-foreground mb-1">
                        Click to upload image
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Max 5MB (JPG, PNG, GIF, WebP)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm mb-2">Capacity</label>
                <input
                  type="text"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="e.g., 100 people"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm mb-2">Short Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  rows={3}
                  placeholder="Brief description of the event"
                />
              </div>

              {/* Full Description */}
              <div>
                <label className="block text-sm mb-2">Full Description</label>
                <textarea
                  value={formData.full_description}
                  onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  rows={5}
                  placeholder="Detailed description of the event"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingEventId ? 'Update Event' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border-2 border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Events
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, location, or description..."
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Owner
            </label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            >
              <option value="all">All Owners</option>
              <option value="admin">Admin</option>
              <option value="enterprise">Enterprise</option>
              <option value="resort">Resort</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
            <Calendar className="h-16 w-16 text-primary/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No events found</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all"
            >
              {event.image ? (
                <img
                  src={getImageUrl(event.image) || ''}
                  alt={event.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-primary/5 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-primary/30" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg">{event.name}</h3>
                  {event.category && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded whitespace-nowrap">
                      {event.category}
                    </span>
                  )}
                </div>

                {event.creator && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Created by: {event.creator.name} ({event.creator.role})
                  </p>
                )}

                {event.location && (
                  <p className="text-sm text-muted-foreground mb-2">
                    📍 {event.location}
                  </p>
                )}

                {event.date && (
                  <p className="text-sm text-muted-foreground mb-2">
                    📅 {new Date(event.date).toLocaleDateString()}
                    {event.time && ` at ${event.time}`}
                  </p>
                )}

                {event.capacity && (
                  <p className="text-sm text-muted-foreground mb-3">
                    👥 Capacity: {event.capacity}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>

                {(() => {
                  const isAdminOwned =
                    event.user_id === null ||
                    (currentUser ? event.user_id === currentUser.id : false) ||
                    event.creator?.role === 'admin';
                  return (
                    <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(event)}
                    disabled={!isAdminOwned} // Disable if owned by enterprise/resort
                    className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="h-4 w-4" />
                    {isAdminOwned ? 'Edit' : 'View Only'}
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={!isAdminOwned} // Disable if owned by enterprise/resort
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
