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
} from 'lucide-react';
import { toast } from 'sonner';
import { VirtualTourModal, Tour360Scene } from './VirtualTourModal';
import { API_BASE, postJSON } from '../lib/api';

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
        panoramaUrl: slot.previewUrl || slot.imageUrl,
        hotSpots,
      };
    });
  };

  // Add new scene slot
  const handleAddSlot = () => {
    const newId = `scene_${Date.now()}`;
    const newSlot: EditableSlot = {
      id: newId,
      title: `📍 Bagong Pwesto #${slots.length + 1}`,
      subtitle: 'Custom Resort Spot / Villa Room',
      imageUrl: 'https://pannellum.org/images/alma.jpg',
    };
    setSlots((prev) => [...prev, newSlot]);
    toast.success('Idinagdag ang bagong 360 scene slot!');
  };

  // Remove a scene slot
  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) {
      toast.error('Dapat may kahit isang (1) scene man lang ang 360 tour.');
      return;
    }
    const slotToRemove = slots[index];
    const confirmed = window.confirm(`Sigurado ka bang nais mong alisin ang slot na "${slotToRemove.title}"?`);
    if (!confirmed) return;

    setSlots((prev) => prev.filter((_, i) => i !== index));
    toast.info(`Inalis ang "${slotToRemove.title}".`);
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

  // Handle local 360 file upload
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Mga imahe o litrato lamang ang maaaring i-upload.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        imageFile: file,
        previewUrl,
        imageUrl: previewUrl,
      };
      return copy;
    });
    toast.success(`Na-upload ang 360 litrato para sa "${slots[index].title}"!`);
  };

  // Save 360 tour to localStorage and backend
  const handleSaveTour = async () => {
    setIsSaving(true);
    try {
      // 1. Save to localStorage for instant local and tourist rendering
      const sanitized = slots.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        imageUrl: s.previewUrl || s.imageUrl,
      }));
      localStorage.setItem(storageKey, JSON.stringify(sanitized));
      localStorage.setItem('discover-mansalay:active_resort_360_scenes', JSON.stringify(sanitized));

      // 2. Try persisting to backend if user is authenticated
      try {
        const endpoint = businessType === 'enterprise' ? '/store-profile' : '/resort-profile';
        await postJSON(endpoint, {
          virtual_tour_scenes: sanitized,
        });
      } catch {
        // Continue even if backend has no active session; localStorage persists it
      }

      toast.success(`🎉 Matagumpay na na-save ang 360° Virtual Tour para sa iyong ${businessType === 'enterprise' ? 'shop' : 'resort'}!`);
      onSaveSuccess?.(sanitized);
    } catch (err: any) {
      toast.error(err.message || 'Hindi na-save ang 360 virtual tour.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase rounded-full border border-emerald-200">
                Interactive Feature
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                360° {businessType === 'enterprise' ? 'Store & Shop' : 'Resort'} Walkthrough Scene Manager
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              I-customize ang bawat pwesto ng iyong {businessType === 'enterprise' ? 'tindahan / shop' : 'resort'} na lilibutin ng mga turista gamit ang 360° walking arrows.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Eye className="h-4 w-4 text-emerald-400" />
            <span>Subukan / Preview 360</span>
          </button>
          <button
            type="button"
            onClick={handleSaveTour}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Sine-save...' : 'I-Save ang 360 Tour'}</span>
          </button>
        </div>
      </div>

      {/* Helpful Info Alert */}
      <div className="my-5 p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-emerald-800">
        <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Awtomatikong nilalagyan ng system ng mga <strong>Walking Arrows</strong> ang bawat eksena:
          </p>
          <p className="text-emerald-700 leading-relaxed">
            Mula sa unang slot (Entrance), may arrow papunta sa susunod na kwarto o pasilidad, hanggang sa huling slot. Pwede mong <strong>palitan ang pangalan</strong>, <strong>mag-upload ng 360 litrato</strong>, o <strong>magbawas/magdagdag ng slots</strong> ayon sa meron sa iyong {businessType === 'enterprise' ? 'shop' : 'resort'}!
          </p>
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-4">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className="bg-gray-50/70 hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Column: Re-order controls & Number */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded-md hover:bg-white text-gray-500 hover:text-gray-900 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Ilipat Paitaas"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === slots.length - 1}
                    className="p-1 rounded-md hover:bg-white text-gray-500 hover:text-gray-900 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Ilipat Paibaba"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 font-extrabold text-xs flex items-center justify-center border border-emerald-500/20">
                  {index + 1}
                </div>

                {/* Slot Title & Subtitle Inputs */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      Pangalan ng Pwesto / Eksena
                    </label>
                    <input
                      type="text"
                      value={slot.title}
                      onChange={(e) => handleUpdateText(index, 'title', e.target.value)}
                      placeholder="hal. 🚪 Entrance / Gate"
                      className="w-full sm:w-80 px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-extrabold text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={slot.subtitle}
                      onChange={(e) => handleUpdateText(index, 'subtitle', e.target.value)}
                      placeholder="Maikling paglalarawan (hal. Main approach)"
                      className="w-full sm:w-80 px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Image Preview & Upload & Delete */}
              <div className="flex items-center gap-3 self-end md:self-center">
                {/* 360 Panorama Preview Thumbnail */}
                <div className="relative w-24 h-14 rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-black flex-shrink-0 group">
                  <img
                    src={slot.previewUrl || slot.imageUrl}
                    alt={slot.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-extrabold text-white bg-black/70 px-1.5 py-0.5 rounded">
                      360° View
                    </span>
                  </div>
                </div>

                {/* Upload File Button */}
                <label className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Palitan Litrato</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(index, e)}
                    className="hidden"
                  />
                </label>

                {/* Remove Slot Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(index)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Alisin ang slot na ito"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Slot and Footer Controls */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddSlot}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="h-4 w-4" />
          <span>+ Magdagdag ng Bagong 360 Scene (Add Slot)</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Kasalukuyang may {slots.length} na 360 scenes na lilibutin</span>
        </div>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <VirtualTourModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          attractionName={`${resortName} (360° Walkthrough Preview)`}
          category="Resort Live Preview"
          customScenes={buildTourScenes()}
        />
      )}
    </div>
  );
}
