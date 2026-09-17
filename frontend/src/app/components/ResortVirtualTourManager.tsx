import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plus,
  Trash2,
  Upload,
  Eye,
  Save,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  CheckCircle2,
  Image as ImageIcon,
  Footprints,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { VirtualTourModal, Tour360Scene } from './VirtualTourModal';
import { API_BASE, postJSON, getAuthToken } from '../lib/api';

export interface EditableSlot {
  id: string;
  title: string;
  subtitle: string;
  imageFile?: File | null;
  imageUrl: string;
  previewUrl?: string;
}

const INITIAL_DEFAULT_SLOTS: EditableSlot[] = [
  {
    id: 'entrance',
    title: '🚪 Entrance / Gate',
    subtitle: 'Main Entrance & Scenic Approach',
    imageUrl: 'https://pannellum.org/images/alma.jpg',
  },
  {
    id: 'lobby',
    title: '🏨 Lobby / Dining',
    subtitle: 'Guest Reception & Dining Area',
    imageUrl: 'https://pannellum.org/images/bma-0.jpg',
  },
  {
    id: 'pool',
    title: '🏊 Pool / Amenities',
    subtitle: 'Freshwater Pool & Tropical Sun Loungers',
    imageUrl: 'https://pannellum.org/images/jfk.jpg',
  },
  {
    id: 'beach',
    title: '🏖️ Beach Front / Cottages',
    subtitle: 'Pristine Shoreline & Seafront Cottages',
    imageUrl: 'https://pannellum.org/images/cerro-toco-0.jpg',
  },
];

const ENTERPRISE_DEFAULT_SLOTS: EditableSlot[] = [
  {
    id: 'entrance',
    title: '🚪 Store Entrance / Front',
    subtitle: 'Street Entrance & Welcome Facade',
    imageUrl: 'https://pannellum.org/images/alma.jpg',
  },
  {
    id: 'showroom',
    title: '🛍️ Main Showroom & Aisles',
    subtitle: 'Featured Products & Customer Aisles',
    imageUrl: 'https://pannellum.org/images/bma-0.jpg',
  },
  {
    id: 'display',
    title: '🍯 Products & Souvenir Shelf',
    subtitle: 'Handicrafts, Delicacies & Souvenirs',
    imageUrl: 'https://pannellum.org/images/jfk.jpg',
  },
  {
    id: 'workshop',
    title: '📦 Workshop / Crafting Area',
    subtitle: 'Artisan Workshop & Packaging Counter',
    imageUrl: 'https://pannellum.org/images/cerro-toco-0.jpg',
  },
];

interface ResortVirtualTourManagerProps {
  resortId?: number | string;
  resortName?: string;
  businessType?: 'resort' | 'enterprise';
  initialScenes?: any[];
  onSaveSuccess?: (scenes: any[]) => void;
}

export function ResortVirtualTourManager({
  resortId,
  resortName = 'Our Location',
  businessType = 'resort',
  initialScenes,
  onSaveSuccess,
}: ResortVirtualTourManagerProps) {
  const defaultSlots = businessType === 'enterprise' ? ENTERPRISE_DEFAULT_SLOTS : INITIAL_DEFAULT_SLOTS;

  const storageKey = resortId
    ? `discover-mansalay:${businessType}_360_scenes_${resortId}`
    : `discover-mansalay:active_${businessType}_360_scenes`;

  const [slots, setSlots] = useState<EditableSlot[]>(() => {
    if (Array.isArray(initialScenes) && initialScenes.length > 0) {
      return initialScenes.map((s: any, idx: number) => ({
        id: s.id || `scene_${idx}`,
        title: s.title || `📍 Spot #${idx + 1}`,
        subtitle: s.subtitle || '',
        imageUrl: s.imageUrl || s.panoramaUrl || '',
      }));
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return defaultSlots;
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(null);

  // Sync with initialScenes when loaded from database
  useEffect(() => {
    if (Array.isArray(initialScenes) && initialScenes.length > 0) {
      setSlots(initialScenes.map((s: any, idx: number) => ({
        id: s.id || `scene_${idx}`,
        title: s.title || `📍 Spot #${idx + 1}`,
        subtitle: s.subtitle || '',
        imageUrl: s.imageUrl || s.panoramaUrl || '',
      })));
    }
  }, [initialScenes]);

  const getDisplayImageUrl = (slot: EditableSlot) => {
    const src = slot.previewUrl || slot.imageUrl;
    if (!src) return 'https://pannellum.org/images/alma.jpg';
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) return src;
    return `${API_BASE}${src}`;
  };

  // Convert current editable slots into Tour360Scene[] with automated directional walking arrows
  const buildTourScenes = (): Tour360Scene[] => {
    return slots.map((slot, index) => {
      const hotSpots: any[] = [];

      // Forward walking arrow (to next scene)
      if (index < slots.length - 1) {
        const nextSlot = slots[index + 1];
        hotSpots.push({
          pitch: -4,
          yaw: 20,
          text: `Walk to ${nextSlot.title} ➡️`,
          type: 'scene',
          targetSceneId: nextSlot.id,
          targetPitch: 0,
          targetYaw: 0,
        });
      }

      // Backward walking arrow (to previous scene)
      if (index > 0) {
        const prevSlot = slots[index - 1];
        hotSpots.push({
          pitch: -5,
          yaw: -160,
          text: `⬅️ Return to ${prevSlot.title}`,
          type: 'scene',
          targetSceneId: prevSlot.id,
          targetPitch: 0,
          targetYaw: 0,
        });
      }

      // General info badge
      hotSpots.push({
        pitch: 5,
        yaw: 45,
        text: `${slot.title} - ${resortName}`,
        type: 'info',
      });

      return {
        id: slot.id,
        title: slot.title,
        subtitle: slot.subtitle,
        panoramaUrl: getDisplayImageUrl(slot),
        hotSpots,
      };
    });
  };

  // Add new scene slot
  const handleAddSlot = () => {
    const newId = `scene_${Date.now()}`;
    const newSlot: EditableSlot = {
      id: newId,
      title: `📍 New Scene Spot #${slots.length + 1}`,
      subtitle: 'Custom Location Spot / Room',
      imageUrl: 'https://pannellum.org/images/alma.jpg',
    };
    setSlots((prev) => [...prev, newSlot]);
    toast.success('New 360 scene slot added!');
  };

  // Remove a scene slot
  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) {
      toast.error('The 360 tour must have at least one (1) scene.');
      return;
    }
    const slotToRemove = slots[index];
    const confirmed = window.confirm(`Are you sure you want to remove "${slotToRemove.title}"?`);
    if (!confirmed) return;

    setSlots((prev) => prev.filter((_, i) => i !== index));
    toast.info(`Removed "${slotToRemove.title}".`);
  };

  // Move slot up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move slot down
  const handleMoveDown = (index: number) => {
    if (index === slots.length - 1) return;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Update title or subtitle
  const handleUpdateText = (index: number, field: 'title' | 'subtitle', value: string) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Handle per-image 360 file upload
  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset so selecting the same file again triggers
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload image files only.');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const slotTitle = slots[index]?.title || `Scene ${index + 1}`;
    const slotId = slots[index]?.id || `scene_${index}`;

    // Immediate local preview — only updates this specific slot
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], imageFile: file, previewUrl: localPreviewUrl };
      return copy;
    });

    setUploadingSlotIndex(index);
    const toastId = toast.loading(`Uploading 360 photo for "${slotTitle}"...`);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('slot_id', slotId);

      const res = await fetch(`${API_BASE}/api/360-tour/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload 360 image to server.');
      }

      const serverUrl: string = data.url;

      // Build the definitive updated slots list BEFORE calling setSlots
      // This avoids the stale-closure issue where updatedList was empty
      // because React state updates are asynchronous.
      const updatedSlots = slots.map((s, idx) => {
        if (idx === index) {
          return { ...s, imageUrl: serverUrl, previewUrl: undefined, imageFile: null };
        }
        return s;
      });

      // Apply to React state (only this slot changes)
      setSlots(updatedSlots);

      // Build sanitized payload from the correct, up-to-date list
      const sanitized = updatedSlots.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        imageUrl: s.imageUrl || s.previewUrl || '',
      }));

      // Persist scoped localStorage key (per business/resort id)
      localStorage.setItem(storageKey, JSON.stringify(sanitized));

      // Persist to backend immediately — only this scene's imageUrl changed
      try {
        await postJSON('/360-tour/scenes', { virtual_tour_scenes: sanitized });
      } catch (saveErr: any) {
        // Non-fatal: local state is already correct, warn in console
        console.warn('[360 Tour] Background save after upload failed:', saveErr?.message);
      }

      onSaveSuccess?.(sanitized);
      toast.success(`360 photo for "${slotTitle}" uploaded successfully!`, { id: toastId });
    } catch (err: any) {
      // Revert the optimistic preview on failure
      setSlots((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], imageFile: null, previewUrl: undefined };
        return copy;
      });
      toast.error(err.message || 'Error uploading 360 photo. Please try again.', { id: toastId });
    } finally {
      setUploadingSlotIndex(null);
    }
  };

  // Save 360 tour to localStorage and backend
  const handleSaveTour = async () => {
    setIsSaving(true);
    try {
      const sanitized = slots.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        imageUrl: s.imageUrl || s.previewUrl,
      }));

      // Strictly scoped to this business (NO global pollution)
      localStorage.setItem(storageKey, JSON.stringify(sanitized));

      // Persist to backend
      try {
        await postJSON('/360-tour/scenes', {
          virtual_tour_scenes: sanitized,
        });
      } catch {
        const endpoint = businessType === 'enterprise' ? '/enterprise-profile' : '/resort-profile';
        await postJSON(endpoint, {
          virtual_tour_scenes: sanitized,
        });
      }

      toast.success(`🎉 360° Virtual Tour for your ${businessType === 'enterprise' ? 'shop' : 'resort'} saved successfully!`);
      onSaveSuccess?.(sanitized);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save 360 virtual tour.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8 overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-rose-50 text-rose-400 text-[9px] font-bold uppercase tracking-widest rounded-md border border-rose-100">
                Interactive Feature
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight">
                360° {businessType === 'enterprise' ? 'Store & Shop' : 'Resort'} Walkthrough Scene Manager
              </h2>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Customize each area of your {businessType === 'enterprise' ? 'store / shop' : 'resort'} for visitors to explore with interactive 360° walking arrows.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-rose-300" />
            <span>Preview 360</span>
          </button>
          <button
            type="button"
            onClick={handleSaveTour}
            disabled={isSaving}
            className="px-4 py-2 bg-rose-400 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save 360 Tour'}</span>
          </button>
        </div>
      </div>

      {/* Helpful Info Alert */}
      <div className="my-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5 text-xs text-gray-500">
        <Sparkles className="h-3.5 w-3.5 text-rose-300 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-gray-600">
            Walking Arrows are auto-generated between consecutive scenes.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Rename spots, upload a 360 photo per scene, or add/remove slots to match your {businessType === 'enterprise' ? 'shop' : 'resort'} layout.
          </p>
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className="bg-gray-50/60 hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Column: Re-order controls & Number */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-white text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === slots.length - 1}
                    className="p-1 rounded hover:bg-white text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-400 font-bold text-[11px] flex items-center justify-center border border-rose-100 flex-shrink-0">
                  {index + 1}
                </div>

                {/* Slot Title & Subtitle Inputs */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-300 block mb-0.5">
                      Scene Name / Title
                    </label>
                    <input
                      type="text"
                      value={slot.title}
                      onChange={(e) => handleUpdateText(index, 'title', e.target.value)}
                      placeholder="e.g. 🚪 Main Entrance / Gate"
                      className="w-full sm:w-72 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-100 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={slot.subtitle}
                      onChange={(e) => handleUpdateText(index, 'subtitle', e.target.value)}
                      placeholder="Short description"
                      className="w-full sm:w-72 px-3 py-1 bg-white border border-gray-100 rounded-lg text-[11px] text-gray-400 focus:outline-none focus:border-rose-200 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Image Preview & Upload & Delete */}
              <div className="flex items-center gap-2.5 self-end md:self-center">
                {/* 360 Panorama Preview Thumbnail */}
                <div className="relative w-24 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0 group">
                  <img
                    src={getDisplayImageUrl(slot)}
                    alt={slot.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                      360°
                    </span>
                  </div>
                  {uploadingSlotIndex === index && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Upload File Button */}
                <label
                  htmlFor={`tour360-upload-${slot.id}-${index}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                    uploadingSlotIndex === index
                      ? 'bg-rose-50 text-rose-300 border-rose-100 pointer-events-none opacity-70'
                      : 'bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-400 border-gray-200 hover:border-rose-200'
                  }`}
                >
                  {uploadingSlotIndex === index ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" />
                      <span>Change Photo</span>
                    </>
                  )}
                  <input
                    id={`tour360-upload-${slot.id}-${index}`}
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlotIndex !== null}
                    onChange={(e) => handleFileChange(index, e)}
                    className="hidden"
                  />
                </label>

                {/* Remove Slot Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(index)}
                  className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove this scene slot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Slot and Footer Controls */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddSlot}
          className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-rose-400 border border-gray-200 hover:border-rose-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add New Scene Slot</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-rose-300" />
          <span>{slots.length} scene{slots.length !== 1 ? 's' : ''} configured</span>
        </div>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <VirtualTourModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          attractionName={`${resortName} (360° Walkthrough Preview)`}
          category={businessType === 'enterprise' ? 'Store Live Preview' : 'Resort Live Preview'}
          customScenes={buildTourScenes()}
        />
      )}
    </div>
  );
}
