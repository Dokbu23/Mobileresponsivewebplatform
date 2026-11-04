import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Play, Film, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  MANSALAY_BARANGAYS,
  ATTRACTION_CATEGORIES,
  ACCOMMODATION_CATEGORIES,
  PRODUCT_CATEGORIES,
  EVENT_CATEGORIES,
  CULTURE_ARTS_CATEGORIES,
  HISTORY_CATEGORIES
} from '../../lib/constants';
import { putJSON, uploadMediaInChunks, API_BASE, formatImageUrl } from '../../lib/api';
import { prepareMediaFiles, isImageCandidate, MAX_VIDEO_INPUT_BYTES } from '../../lib/mediaCompression';
import { estimateCompressionTime, formatDuration } from '../../lib/compressionMetrics';

export type ContentSource = 'accommodation' | 'product' | 'attraction' | 'event' | 'culture' | 'history' | 'post';

interface EditContentModalProps {
  isOpen: boolean;
  record: any;
  source: ContentSource;
  onClose: () => void;
  onSave: () => void;
}

interface EditFormData {
  title: string;
  name: string;
  description: string;
  full_description: string;
  category: string;
  location: string;
  price: string;
  stock: string;
  contact_number: string;
  email: string;
  facebook: string;
  instagram: string;
  website: string;
  
  // Hours/Time
  opening_hours?: string;
  closing_hours?: string;
  operating_hours?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  
  // Video/Media
  video_url?: string;
  virtual_tour_url?: string;
  
  // Content-type specific
  artist_name?: string;
  period_era?: string;
  historical_period?: string;
  history_date?: string;
  source_author?: string;
  capacity?: string;
  
  // Media URLs (as strings, will be kept as-is if unchanged)
  cover_image_url?: string;
  existing_images?: string[];
}

export function EditContentModal({ isOpen, record, source, onClose, onSave }: EditContentModalProps) {
  const [formData, setFormData] = useState<EditFormData>({
    title: '',
    name: '',
    description: '',
    full_description: '',
    category: '',
    location: '',
    price: '',
    stock: '',
    contact_number: '',
    email: '',
    facebook: '',
    instagram: '',
    website: '',
  });

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [newCoverImageFile, setNewCoverImageFile] = useState<File | null>(null);
  const [newCoverImagePreview, setNewCoverImagePreview] = useState<string>('');

  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newVideoPreview, setNewVideoPreview] = useState<string>('');
  const [existingVideoPath, setExistingVideoPath] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'video'>('basic');

  // Load record data on open
  useEffect(() => {
    if (!isOpen || !record) return;

    const images = Array.isArray(record.images) ? record.images : (record.image ? [record.image] : []);
    const coverImg = record.image || images[0] || '';

    setFormData({
      title: record.title || record.name || '',
      name: record.name || record.title || '',
      description: record.description || record.content || '',
      full_description: record.full_description || '',
      category: record.category || '',
      location: record.location || '',
      price: record.price ? String(record.price) : '',
      stock: record.stock ? String(record.stock) : '10',
      contact_number: record.contact_number || '',
      email: record.email || '',
      facebook: record.facebook || '',
      instagram: record.instagram || '',
      website: record.website || '',
      opening_hours: record.opening_hours || '',
      closing_hours: record.closing_hours || '',
      operating_hours: record.operating_hours || '',
      event_date: record.date || '',
      event_start_time: record.start_time || '',
      event_end_time: record.end_time || '',
      video_url: record.video || '',
      virtual_tour_url: record.virtual_tour_url || '',
      artist_name: record.artist_name || '',
      period_era: record.period_era || '',
      historical_period: record.period || record.historical_period || '',
      history_date: record.history_date || record.date || '',
      source_author: record.source || record.author || '',
      capacity: record.capacity ? String(record.capacity) : '',
    });

    setExistingImages(images);
    setCoverImage(coverImg);
    setExistingVideoPath(record.video || '');
    setVideoUrlInput(record.video || '');
    setNewImages([]);
    setNewImagePreviews([]);
    setImagesToRemove([]);
    setNewCoverImageFile(null);
    setNewCoverImagePreview('');
    setNewVideoFile(null);
    setNewVideoPreview('');
    setActiveTab('basic');
  }, [isOpen, record]);

  const getCategoryOptions = (): string[] => {
    switch (source) {
      case 'accommodation':
        return ACCOMMODATION_CATEGORIES;
      case 'product':
        return PRODUCT_CATEGORIES;
      case 'attraction':
        return ATTRACTION_CATEGORIES;
      case 'event':
        return EVENT_CATEGORIES;
      case 'culture':
        return CULTURE_ARTS_CATEGORIES;
      case 'history':
        return HISTORY_CATEGORIES;
      default:
        return [];
    }
  };

  const handleAddImages = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!isImageCandidate(file)) {
        toast.error(`${file.name} is not a supported image format`);
        return false;
      }
      return true;
    });

    setNewImages(prev => [...prev, ...validFiles]);
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setNewImagePreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    const imageUrl = existingImages[index];
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    setImagesToRemove(prev => [...prev, imageUrl]);
    if (coverImage === imageUrl) {
      setCoverImage('');
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isImageCandidate(file)) {
      toast.error('Invalid image format');
      return;
    }
    setNewCoverImageFile(file);
    const preview = URL.createObjectURL(file);
    setNewCoverImagePreview(preview);
    setCoverImage('');
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_INPUT_BYTES) {
      toast.error('Video exceeds size limit');
      return;
    }
    setNewVideoFile(file);
    const preview = URL.createObjectURL(file);
    setNewVideoPreview(preview);
    setVideoUrlInput('');
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.title.trim()) {
      toast.error('Title or name is required');
      return;
    }

    setIsSaving(true);
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;
    setUploadProgress(0);
    setUploadStatusText('Preparing...');

    try {
      // Prepare images if new ones were added
      let uploadedImagePaths: string[] = [];
      if (newImages.length > 0) {
        setUploadStatusText('Compressing images...');
        const preparedImages = await prepareMediaFiles(newImages, (file, phase, percent) => {
          if (phase === 'compressing' || phase === 'encoding') {
            setUploadProgress(Math.min(30, Math.round(percent * 0.3)));
            setUploadStatusText(`Compressing ${file.name} (${percent}%)`);
          }
        }, controller.signal);

        setUploadProgress(30);
        const compressedFiles = preparedImages.map(m => m.file);
        const totalSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
        let uploadedSize = 0;

        for (const [idx, file] of compressedFiles.entries()) {
          const url = await uploadMediaInChunks(file, (uploaded, total) => {
            const progress = 30 + Math.round(((uploadedSize + uploaded) / totalSize) * 60);
            setUploadProgress(progress);
            setUploadStatusText(`Uploading image ${idx + 1}/${compressedFiles.length}`);
          }, controller.signal, { prepared: true });
          uploadedImagePaths.push(url.url);
          uploadedSize += file.size;
        }
      }

      // Upload video if new one selected
      let uploadedVideoPath = '';
      if (newVideoFile) {
        setUploadStatusText('Compressing video...');
        setUploadProgress(85);

        const estimatedMs = estimateCompressionTime(newVideoFile.size);
        const estimatedStr = formatDuration(estimatedMs);
        setUploadStatusText(`Compressing video... (Est. ${estimatedStr})`);

        const result = await uploadMediaInChunks(newVideoFile, (uploaded, total) => {
          const percent = 85 + Math.round((uploaded / total) * 10);
          setUploadProgress(percent);
          setUploadStatusText(`Uploading video (${(uploaded / (1024 * 1024)).toFixed(1)}/${(total / (1024 * 1024)).toFixed(1)} MiB)`);
        }, controller.signal);
        uploadedVideoPath = result.url;
      }

      // Build update payload
      setUploadProgress(95);
      setUploadStatusText('Saving changes...');

      const updateData: any = {
        title: formData.title.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        full_description: formData.full_description.trim(),
        category: formData.category.trim() || null,
        location: formData.location.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        stock: formData.stock ? parseInt(formData.stock) : null,
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim() || null,
        facebook: formData.facebook.trim() || null,
        instagram: formData.instagram.trim() || null,
        website: formData.website.trim() || null,
      };

      // Add content-type-specific fields
      if (source === 'accommodation') {
        updateData.operating_hours = formData.operating_hours || null;
      }
      if (source === 'event') {
        updateData.date = formData.event_date || null;
        updateData.start_time = formData.event_start_time || null;
        updateData.end_time = formData.event_end_time || null;
        updateData.capacity = formData.capacity ? parseInt(formData.capacity) : null;
      }
      if (source === 'culture') {
        updateData.artist_name = formData.artist_name?.trim() || null;
        updateData.period_era = formData.period_era?.trim() || null;
      }
      if (source === 'history') {
        updateData.period = formData.historical_period?.trim() || null;
        updateData.date = formData.history_date || null;
        updateData.source = formData.source_author?.trim() || null;
      }

      // Handle images
      const finalImages = [...existingImages, ...uploadedImagePaths];
      if (finalImages.length > 0) {
        updateData.image = coverImage || newCoverImagePreview || finalImages[0];
        updateData.images = finalImages;
      }

      // Handle image removals
      if (imagesToRemove.length > 0) {
        updateData.images_to_remove = imagesToRemove;
      }

      // Handle videos
      if (uploadedVideoPath) {
        updateData.video = uploadedVideoPath;
      } else if (videoUrlInput && videoUrlInput !== existingVideoPath) {
        updateData.video = videoUrlInput;
      }
      if (formData.virtual_tour_url) {
        updateData.virtual_tour_url = formData.virtual_tour_url.trim();
      }

      // Handle cover image upload
      if (newCoverImageFile) {
        setUploadStatusText('Uploading cover image...');
        const coverImages = await prepareMediaFiles([newCoverImageFile], undefined, controller.signal);
        if (coverImages.length > 0) {
          const coverUrl = await uploadMediaInChunks(
            coverImages[0].file,
            undefined,
            controller.signal,
            { prepared: true }
          );
          updateData.image = coverUrl.url;
        }
      }

      // Save to backend
      await putJSON(`/admin/manage-posts/${source}/${record.id}`, updateData);

      setUploadProgress(100);
      setUploadStatusText('Saved!');
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Content updated successfully');
      onClose();
      onSave();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.info('Save cancelled');
      } else {
        toast.error(error.message || 'Failed to save content');
      }
    } finally {
      setIsSaving(false);
      uploadAbortControllerRef.current = null;
    }
  };

  if (!isOpen) return null;

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${API_BASE}${path}`;
    return `${API_BASE}/${path}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Content</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'basic'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'media'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'video'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Video
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">{uploadStatusText}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSaveChanges} className="space-y-6">
            {/* BASIC INFO TAB */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Title/Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Title / Name *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                    required
                  />
                </div>

                {/* Category & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                    >
                      <option value="">Select category</option>
                      {getCategoryOptions().map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <select
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                    >
                      <option value="">Select location</option>
                      {MANSALAY_BARANGAYS.map(barangay => (
                        <option key={barangay} value={barangay}>
                          {barangay}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price & Stock */}
                {(source === 'product' || source === 'accommodation') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                    {source === 'product' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Stock</label>
                        <input
                          type="number"
                          value={formData.stock}
                          onChange={e => setFormData({ ...formData, stock: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                  />
                </div>

                {/* Full Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Full Description</label>
                  <textarea
                    value={formData.full_description}
                    onChange={e => setFormData({ ...formData, full_description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                  />
                </div>

                {/* Contact Info */}
                {source === 'accommodation' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Contact Number</label>
                        <input
                          type="tel"
                          value={formData.contact_number}
                          onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Facebook</label>
                        <input
                          type="url"
                          value={formData.facebook}
                          onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Instagram</label>
                        <input
                          type="url"
                          value={formData.instagram}
                          onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}

                {/* Content-specific fields */}
                {source === 'culture' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Artist Name</label>
                      <input
                        type="text"
                        value={formData.artist_name}
                        onChange={e => setFormData({ ...formData, artist_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Period / Era</label>
                      <input
                        type="text"
                        value={formData.period_era}
                        onChange={e => setFormData({ ...formData, period_era: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                {source === 'history' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Historical Period</label>
                      <input
                        type="text"
                        value={formData.historical_period}
                        onChange={e => setFormData({ ...formData, historical_period: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <input
                        type="date"
                        value={formData.history_date}
                        onChange={e => setFormData({ ...formData, history_date: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Source / Author</label>
                      <input
                        type="text"
                        value={formData.source_author}
                        onChange={e => setFormData({ ...formData, source_author: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                {source === 'event' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Event Date</label>
                      <input
                        type="date"
                        value={formData.event_date}
                        onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Start Time</label>
                        <input
                          type="time"
                          value={formData.event_start_time}
                          onChange={e => setFormData({ ...formData, event_start_time: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">End Time</label>
                        <input
                          type="time"
                          value={formData.event_end_time}
                          onChange={e => setFormData({ ...formData, event_end_time: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Capacity</label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                {/* Cover Image */}
                <div>
                  <h3 className="font-semibold mb-3">Cover Image</h3>
                  <div className="space-y-3">
                    {newCoverImagePreview && (
                      <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-pink-200">
                        <img src={newCoverImagePreview} alt="New cover" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewCoverImageFile(null);
                            setNewCoverImagePreview('');
                            if (coverImageInputRef.current) coverImageInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {coverImage && !newCoverImagePreview && (
                      <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-slate-300">
                        <img src={getImageUrl(coverImage)} alt="Current cover" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input
                      ref={coverImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="block w-full"
                    />
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <h3 className="font-semibold mb-3">Gallery Images ({existingImages.length + newImages.length})</h3>

                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Current Images:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {existingImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={getImageUrl(img)} alt={`Gallery ${idx}`} className="w-full h-32 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(idx)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images */}
                  {newImagePreviews.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">New Images (to be uploaded):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {newImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative group">
                            <img src={preview} alt={`New ${idx}`} className="w-full h-32 object-cover rounded-lg border-2 border-green-300" />
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(idx)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add More Images */}
                  <label className="block border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-pink-500 transition">
                    <Plus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-medium">Click to add more images</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => handleAddImages(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* VIDEO TAB */}
            {activeTab === 'video' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Choose one: Upload a video file OR enter a video URL. If you upload a file, the URL will be replaced.
                  </p>
                </div>

                {/* Existing Video */}
                {existingVideoPath && !newVideoFile && !videoUrlInput && (
                  <div>
                    <p className="text-sm font-medium mb-2">Current Video:</p>
                    <video src={getImageUrl(existingVideoPath)} controls className="w-full max-h-64 rounded-lg" />
                  </div>
                )}

                {/* New Video Preview */}
                {newVideoPreview && (
                  <div>
                    <p className="text-sm font-medium mb-2">New Video Preview (to be uploaded):</p>
                    <div className="relative">
                      <video src={newVideoPreview} controls className="w-full max-h-64 rounded-lg border-2 border-green-300" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewVideoFile(null);
                          setNewVideoPreview('');
                          if (videoFileInputRef.current) videoFileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Video File */}
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Video File</label>
                  <label className="block border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-pink-500 transition">
                    <Film className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-medium">Click to upload MP4, WebM, or MOV</span>
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600" />
                  <span className="text-sm text-slate-500">OR</span>
                  <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">Video URL</label>
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={e => setVideoUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter direct MP4/WebM URL or external video service URL</p>
                </div>

                {/* Virtual Tour URL (if applicable) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Virtual Tour URL (optional)</label>
                  <input
                    type="url"
                    value={formData.virtual_tour_url}
                    onChange={e => setFormData({ ...formData, virtual_tour_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-pink-500 outline-none dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-6 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
