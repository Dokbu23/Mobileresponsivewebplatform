import { useState, useEffect, useRef } from 'react';
import { Calendar, Search, Filter, Plus, Edit2, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { getJSON, postJSON, deleteJSON, API_BASE, uploadMediaInChunks, IMAGE_UPLOAD_LIMIT_BYTES } from '../../lib/api';
import { isImageCandidate, prepareMediaFiles } from '../../lib/mediaCompression';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { showSuccessAlert, showConfirmDialog } from '../../lib/sweetAlert';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

interface Event {
  id: number;
  name: string;
  location: string | null;
  category: string | null;
  image: string | null;
  images?: string[] | null;
  date: string | null;
  time: string | null;
  capacity: string | null;
  description: string | null;
  full_description: string | null;
  virtual_tour_url: string | null;
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
    virtual_tour_url: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [originalImageSizes, setOriginalImageSizes] = useState<number[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<Record<string, string>>({});
  const [imagesPrepared, setImagesPrepared] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const uploadAbortController = useRef<AbortController | null>(null);
  const selectedOriginalBytes = originalImageSizes.reduce((total, size) => total + size, 0);
  const selectedCompressedBytes = imageFiles.reduce((total, file) => total + file.size, 0);

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

  const handleImageFiles = (files: File[]) => {
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) {
        toast.error(`${file.name} exceeds the 50 MiB per-image limit.`);
        return false;
      }
      if (!isImageCandidate(file)) {
        toast.error(`${file.name} is not a supported image format`);
        return false;
      }
      return true;
    });

    const available = Math.max(0, 10 - existingImages.length - imageFiles.length);
    if (validFiles.length > available) {
      toast.error(`You can add no more than ${available} more image${available === 1 ? '' : 's'} to this event.`);
      return;
    }
    const selectedFiles = validFiles;
    setImageFiles(previous => [...previous, ...selectedFiles]);
    setOriginalImageSizes(previous => [...previous, ...selectedFiles.map(file => file.size)]);
    setImagesPrepared(false);
    setImagePreviews(previous => [
      ...previous,
      ...selectedFiles.map(file => URL.createObjectURL(file)),
    ]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const resetForm = () => {
    imagePreviews.forEach(preview => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    });
    setImageDimensions({});
    uploadAbortController.current?.abort();
    uploadAbortController.current = null;
    setIsUploadingImages(false);
    setUploadProgress(0);
    setFormData({
      name: '',
      location: '',
      category: '',
      date: '',
      time: '',
      capacity: '',
      description: '',
      full_description: '',
      virtual_tour_url: '',
    });
    setImageFiles([]);
    setOriginalImageSizes([]);
    setImagePreviews([]);
    setImagesPrepared(false);
    setExistingImages([]);
    setEditingEventId(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUploadingImages) return;
    if (!formData.name.trim()) {
      toast.error('Event name is required');
      return;
    }

    const controller = new AbortController();
    uploadAbortController.current = controller;
    setIsUploadingImages(true);
    setUploadProgress(0);

    try {
      const preparedImages = await prepareMediaFiles(
        imageFiles,
        (file, phase, percent) => {
          if (phase === 'compressing' && imageFiles.length > 0) {
            const fileIndex = imageFiles.findIndex(candidate => candidate === file);
            setUploadingFileName(`Compressing ${file.name} (${percent}%)`);
            setUploadProgress(Math.floor(((Math.max(0, fileIndex) + percent / 100) / imageFiles.length) * 30));
          }
        },
        controller.signal
      );
      const compressedFiles = preparedImages.map(media => media.file);
      const existingPreviewCount = existingImages.length;
      const compressedPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(previous => {
        previous.slice(existingPreviewCount).forEach(preview => {
          if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        });
        return [...previous.slice(0, existingPreviewCount), ...compressedPreviews];
      });
      setImageFiles(compressedFiles);
      setImagesPrepared(true);

      const uploadedPaths: string[] = [];
      const totalSize = compressedFiles.reduce((total, file) => total + file.size, 0);
      let completedSize = 0;
      for (const [index, file] of compressedFiles.entries()) {
        setUploadingFileName(file.name);
        const result = await uploadMediaInChunks(
          file,
          (uploadedBytes, fileSize) => {
            setUploadProgress(totalSize
              ? 30 + Math.floor(((completedSize + uploadedBytes) / totalSize) * 70)
              : 0);
            setUploadingFileName(`Uploading ${index + 1}/${compressedFiles.length}: ${file.name} (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(fileSize / (1024 * 1024)).toFixed(1)} MiB)`);
          },
          controller.signal,
          { prepared: true }
        );
        uploadedPaths.push(result.url);
        completedSize += file.size;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.category) formDataToSend.append('category', formData.category);
      if (formData.date) formDataToSend.append('date', formData.date);
      if (formData.time) formDataToSend.append('time', formData.time);
      if (formData.capacity) formDataToSend.append('capacity', formData.capacity);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.full_description) formDataToSend.append('full_description', formData.full_description);
      if (formData.virtual_tour_url) formDataToSend.append('virtual_tour_url', formData.virtual_tour_url);
      if (uploadedPaths.length > 0) {
        formDataToSend.append('image', uploadedPaths[0]);
        uploadedPaths.forEach(path => formDataToSend.append('images[]', path));
      }
      if (editingEventId) {
        formDataToSend.append('existing_images', JSON.stringify(existingImages));
      }

      if (editingEventId) {
        // Update existing event
        await postJSON(`/admin/events/${editingEventId}`, formDataToSend, true);
        await showSuccessAlert('Event Updated!', `${formData.name} has been updated successfully.`);
      } else {
        // Create new event
        await postJSON('/admin/events', formDataToSend, true);
        await showSuccessAlert('Event Created!', `${formData.name} has been created successfully.`);
      }

      await fetchEvents();
      resetForm();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.info('Upload cancelled. Submit the form again to resume.');
      } else {
        toast.error(error.message || 'Failed to save event');
      }
    } finally {
      uploadAbortController.current = null;
      setIsUploadingImages(false);
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
      virtual_tour_url: event.virtual_tour_url || '',
    });
    const gallery = Array.isArray(event.images) && event.images.length > 0
      ? event.images
      : event.image ? [event.image] : [];
    setExistingImages(gallery);
    setImageFiles([]);
    setOriginalImageSizes([]);
    setImagePreviews(gallery.map(image => getImageUrl(image) || '').filter(Boolean));
    setImagesPrepared(false);
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
        await deleteJSON(`/admin/events/${event.id}`);
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
      return decodedPath;
    }
    return `${API_BASE}${decodedPath}`;
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
                <div
                  className="border-2 border-dashed border-primary/20 rounded-lg p-4"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    handleImageFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  {imagePreviews.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative">
                          <img
                            src={preview}
                            alt={`Event preview ${index + 1}`}
                            className="w-full h-28 object-cover rounded-lg"
                            onLoad={event => setImageDimensions(previous => ({
                              ...previous,
                              [preview]: `${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`,
                            }))}
                          />
                          {index >= existingImages.length && imageFiles[index - existingImages.length] && (
                            <span className="block mt-1 text-[10px] text-muted-foreground truncate">
                              {imageFiles[index - existingImages.length].name} · Original {((originalImageSizes[index - existingImages.length] || imageFiles[index - existingImages.length].size) / (1024 * 1024)).toFixed(1)} MiB
                              {imagesPrepared ? ` · Compressed ${(imageFiles[index - existingImages.length].size / (1024 * 1024)).toFixed(1)} MiB` : ''}
                              {imageDimensions[preview] ? ` · ${imageDimensions[preview]}` : ''}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const existingCount = existingImages.length;
                              if (index < existingCount) {
                                setExistingImages(images => images.filter((_, imageIndex) => imageIndex !== index));
                              } else {
                                const fileIndex = index - existingCount;
                                const fileToRemove = imageFiles[fileIndex];
                                if (fileToRemove && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
                                setImageFiles(files => files.filter((_, fileIndexToRemove) => fileIndexToRemove !== fileIndex));
                                setOriginalImageSizes(sizes => sizes.filter((_, sizeIndex) => sizeIndex !== fileIndex));
                                setImagesPrepared(false);
                              }
                              setImagePreviews(previews => previews.filter((_, previewIndex) => previewIndex !== index));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label className="min-h-28 border-2 border-dashed border-primary/20 rounded-lg flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="h-6 w-6 text-primary/50" />
                        <span className="text-xs text-muted-foreground mt-1">Add photos</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="h-12 w-12 text-primary/50 mb-2" />
                      <span className="text-sm text-muted-foreground mb-1">
                        Click to upload photos
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Drop or choose JPEG, PNG, or WebP images. Images are compressed before upload; image metadata is removed.
                      </span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                  {imageFiles.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
                      {imagesPrepared ? 'Compressed total' : 'Original selection total'}: {(imagesPrepared ? selectedCompressedBytes : selectedOriginalBytes) / (1024 * 1024) > 0
                        ? `${((imagesPrepared ? selectedCompressedBytes : selectedOriginalBytes) / (1024 * 1024)).toFixed(2)} MiB`
                        : '0 MiB'}
                      {imagesPrepared && selectedOriginalBytes !== selectedCompressedBytes
                        ? ` (original ${(selectedOriginalBytes / (1024 * 1024)).toFixed(2)} MiB)`
                        : ''}
                      {' · combined maximum 50 MiB'}
                    </p>
                  )}
                  {isUploadingImages && (
                    <div className="mt-3 space-y-2" role="status" aria-live="polite">
                      <div className="flex justify-between text-xs">
                        <span className="truncate pr-2">{uploadingFileName || 'Preparing upload'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <progress className="w-full" value={uploadProgress} max="100" />
                      <button
                        type="button"
                        onClick={() => uploadAbortController.current?.abort()}
                        className="text-xs text-red-600 underline"
                      >
                        Cancel upload
                      </button>
                    </div>
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

              {/* Virtual Tour */}
              <div>
                <label className="block text-sm mb-2">Virtual Tour URL</label>
                <input
                  type="url"
                  value={formData.virtual_tour_url}
                  onChange={(e) => setFormData({ ...formData, virtual_tour_url: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
                  placeholder="https://..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isUploadingImages}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {isUploadingImages ? 'Uploading originals...' : editingEventId ? 'Update Event' : 'Create Event'}
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
              {event.image || (event.images && event.images.length > 0) ? (
                <AutoSwipeCarousel
                  images={(event.images && event.images.length > 0 ? event.images : [event.image]).map(image => getImageUrl(image) || '').filter(Boolean)}
                  alt={event.name}
                  className="w-full h-48"
                  showDots={false}
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
