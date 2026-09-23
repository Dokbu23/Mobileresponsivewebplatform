import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, MapPin, Star, Share2, Search, X, ChevronLeft, ChevronRight, Phone, Facebook, Instagram, MessageSquare, Navigation, Clock, Filter, ChevronDown, Users, Bed, Building2, ExternalLink, Footprints, Maximize2, FileText } from 'lucide-react';
import { API_BASE, getPublicJSON, formatImageUrl, getAuthToken, decodeHtml, recordView } from '../../lib/api';
import { ACCOMMODATION_CATEGORIES } from '../../lib/constants';
import { useApp } from '../../context/AppContext';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { ShareModal } from '../../components/ShareModal';
import { VirtualTourModal } from '../../components/VirtualTourModal';
import { toast } from 'sonner';
import { showUnsaveConfirmDialog } from '../../lib/sweetAlert';
import { PushPinIcon } from '../../components/PushPinIcon';

export interface RoomItem {
  id: string;
  room_id?: number | string;
  name: string;
  type?: string;
  description?: string;
  full_description?: string;
  price_per_night?: number;
  price?: number;
  capacity?: number;
  image: string;
  images?: string[];
  amenities?: string[];
  features?: string[];
  virtual_tour_scenes?: any[];
  likes?: number;
}

export interface AccommodationItem {
  id: string;
  name: string;
  resort_name: string;
  description?: string;
  full_description?: string;
  image: string;
  images?: string[];
  pricePerNight?: number;
  location?: string;
  type?: string;
  rating?: number;
  contact?: string;
  facebook?: string;
  instagram?: string;
  socials?: any;
  amenities?: string[];
  view_count?: number;
  user_id?: number | string;
  badge?: string;
  likes?: number;
  is_registered?: boolean;
  resort_amenities?: string[];
  contact_number?: string;
  website?: string;
  rooms: RoomItem[];
  rooms_count?: number;
  capacity?: number;
  is_room?: boolean;
  virtual_tour_video?: string;
  video?: string;
  phone?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number;
  lng?: number;
  virtual_tour_scenes?: any[];
}

/**
 * 🛡️ Resort-First Grouping & Normalization Logic
 * Rule: 1 RESORT = 1 CARD.
 * Multiple rooms of the same resort become CAROUSEL SLIDES of that single resort card.
 */
function groupAndNormalizeAccommodations(rawItems: any[]): AccommodationItem[] {
  const resortGroups: Record<string, AccommodationItem> = {};
  const userKeyMap: Record<string, string> = {};
  const nameKeyMap: Record<string, string> = {};

  const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  rawItems.forEach((d: any, idx: number) => {
    const rawId = String(d.id || '');
    const cleanName = decodeHtml(d.name || '').trim();
    const cleanResortName = decodeHtml(d.resort_name || (!d.is_room ? d.name : '') || '').trim();
    const userId = d.user_id ? String(d.user_id) : '';

    const effectiveResortName = cleanResortName || (!d.is_room ? cleanName : 'Resort Stay');
    const normalizedResortName = norm(effectiveResortName);

    // Resolve canonical group key for the resort
    let groupKey = '';
    if (userId && userKeyMap[userId]) {
      groupKey = userKeyMap[userId];
    } else if (normalizedResortName && nameKeyMap[normalizedResortName]) {
      groupKey = nameKeyMap[normalizedResortName];
    } else if (userId) {
      groupKey = `resort_user_${userId}`;
    } else if (normalizedResortName) {
      groupKey = `resort_name_${normalizedResortName}`;
    } else {
      groupKey = `resort_item_${rawId || idx}`;
    }

    if (userId) userKeyMap[userId] = groupKey;
    if (normalizedResortName) nameKeyMap[normalizedResortName] = groupKey;
    if (cleanName && !d.is_room) nameKeyMap[norm(cleanName)] = groupKey;

    // Parse images for this record
    let parsedImages: string[] = [];
    if (Array.isArray(d.images)) {
      parsedImages = d.images.map((img: any) => formatImageUrl(img)).filter(Boolean);
    } else if (typeof d.images === 'string' && d.images.trim()) {
      try {
        const arr = JSON.parse(d.images);
        if (Array.isArray(arr)) {
          parsedImages = arr.map((img: any) => formatImageUrl(img)).filter(Boolean);
        }
      } catch { }
    }
    const mainImg = formatImageUrl(d.image);
    if (mainImg && !parsedImages.includes(mainImg)) {
      parsedImages.unshift(mainImg);
    }

    // Initialize group if new
    if (!resortGroups[groupKey]) {
      resortGroups[groupKey] = {
        id: userId ? `resort-${userId}` : (!d.is_room ? rawId : `resort-${norm(effectiveResortName)}`),
        name: effectiveResortName,
        resort_name: effectiveResortName,
        description: !d.is_room ? decodeHtml(d.description || d.full_description || '') : '',
        full_description: !d.is_room ? decodeHtml(d.full_description || d.description || '') : '',
        pricePerNight: Number(d.price_per_night ?? d.pricePerNight ?? d.price ?? 0),
        location: d.location || (d.barangay ? `${d.barangay}, Mansalay, Oriental Mindoro` : 'Mansalay, Oriental Mindoro'),
        type: (d.type === 'resort_profile' || d.category === 'resort_profile' || !d.type || d.type === 'static')
          ? 'Beach Resort'
          : (d.is_room ? 'Beach Resort' : (d.category || d.type || 'Beach Resort')),
        badge: effectiveResortName,
        rating: Number(d.rating) || 4.8,
        likes: Number(d.likes) || 0,
        view_count: Number(d.view_count || d.views || 0),
        image: mainImg || parsedImages[0] || '',
        images: parsedImages,
        resort_amenities: Array.isArray(d.resort_amenities) ? d.resort_amenities : [],
        rooms: [],
        rooms_count: 0,
        capacity: d.capacity ? Number(d.capacity) : undefined,
        is_room: false,
        user_id: d.user_id,
        is_registered: d.is_registered,
        contact_number: d.contact_number || d.phone || d.owner?.phone,
        phone: d.phone || d.contact_number || d.owner?.phone,
        facebook: d.facebook || d.facebook_link || d.owner?.facebook_link,
        instagram: d.instagram || d.instagram_link || d.owner?.instagram_link,
        website: d.website || d.owner?.website,
        virtual_tour_video: d.virtual_tour_video || d.video || d.owner?.virtual_tour_video,
        latitude: d.latitude || d.lat || d.owner?.latitude,
        longitude: d.longitude || d.lng || d.owner?.longitude,
        virtual_tour_scenes: d.virtual_tour_scenes || d.user?.virtual_tour_scenes || d.owner?.virtual_tour_scenes || [],
      };
    }

    const currentResort = resortGroups[groupKey];

    // Merge resort-level details
    if (!currentResort.user_id && d.user_id) currentResort.user_id = d.user_id;
    if (d.resort_name && !currentResort.resort_name) currentResort.resort_name = decodeHtml(d.resort_name);
    if (!d.is_room) {
      if (!currentResort.description && (d.description || d.full_description)) {
        currentResort.description = decodeHtml(d.description || d.full_description);
      }
      if (!currentResort.full_description && (d.full_description || d.description)) {
        currentResort.full_description = decodeHtml(d.full_description || d.description);
      }
      if (!currentResort.image && mainImg) currentResort.image = mainImg;
      if (d.type && d.type !== 'static' && d.type !== 'resort_profile') currentResort.type = d.type;
    }
    if (Array.isArray(d.resort_amenities) && d.resort_amenities.length > 0) {
      currentResort.resort_amenities = Array.from(new Set([...(currentResort.resort_amenities || []), ...d.resort_amenities]));
    }
    if (!currentResort.phone && (d.phone || d.contact_number)) currentResort.phone = d.phone || d.contact_number;
    if (!currentResort.facebook && (d.facebook || d.facebook_link)) currentResort.facebook = d.facebook || d.facebook_link;
    if (!currentResort.instagram && (d.instagram || d.instagram_link)) currentResort.instagram = d.instagram || d.instagram_link;
    if (!currentResort.website && (d.website || d.owner?.website)) currentResort.website = d.website || d.owner?.website;
    if (!currentResort.virtual_tour_video && (d.virtual_tour_video || d.video)) currentResort.virtual_tour_video = d.virtual_tour_video || d.video;
    if ((!currentResort.virtual_tour_scenes || currentResort.virtual_tour_scenes.length === 0) && d.virtual_tour_scenes) {
      currentResort.virtual_tour_scenes = d.virtual_tour_scenes;
    }
    if (d.likes) currentResort.likes = (currentResort.likes || 0) + Number(d.likes);
    if (d.view_count) currentResort.view_count = Math.max(currentResort.view_count || 0, Number(d.view_count));

    // Add room if this record is an individual room
    const isExplicitRoom = Boolean(d.is_room || d.room_id || rawId.startsWith('room-'));
    if (isExplicitRoom) {
      const roomId = String(d.room_id || d.id || `room-${currentResort.rooms.length + 1}`);
      const rName = cleanName || 'Standard Room';
      const existingIdx = currentResort.rooms.findIndex(
        r => r.id === roomId || (r.name && r.name.toLowerCase() === rName.toLowerCase())
      );

      if (existingIdx >= 0) {
        const existing = currentResort.rooms[existingIdx];
        const mergedImgs = Array.from(new Set([...(existing.images || []), ...parsedImages]));
        existing.images = mergedImgs;
        if (!existing.image && mergedImgs.length > 0) existing.image = mergedImgs[0];
      } else {
        currentResort.rooms.push({
          id: roomId,
          room_id: d.room_id || d.id,
          name: rName,
          type: d.type || 'Room',
          description: decodeHtml(d.description || d.full_description || ''),
          full_description: decodeHtml(d.full_description || d.description || ''),
          price_per_night: Number(d.price_per_night ?? d.pricePerNight ?? d.price ?? 0),
          price: Number(d.price_per_night ?? d.pricePerNight ?? d.price ?? 0),
          capacity: d.capacity ? Number(d.capacity) : 2,
          image: mainImg || parsedImages[0] || '',
          images: parsedImages,
          amenities: Array.isArray(d.amenities) && d.amenities.length > 0
            ? d.amenities
            : (Array.isArray(d.resort_amenities) ? d.resort_amenities : []),
          features: Array.isArray(d.features) ? d.features : [],
          virtual_tour_scenes: d.virtual_tour_scenes || [],
        });
      }
    }

    // If record contains nested rooms array (d.rooms)
    if (Array.isArray(d.rooms) && d.rooms.length > 0) {
      d.rooms.forEach((rm: any) => {
        const rmId = String(rm.id || `room-${currentResort.rooms.length + 1}`);
        const rmName = decodeHtml(rm.name || 'Room').trim();
        const existingIdx = currentResort.rooms.findIndex(
          r => r.id === rmId || (r.name && r.name.toLowerCase() === rmName.toLowerCase())
        );
        const rmImages = Array.isArray(rm.images) ? rm.images.map(formatImageUrl).filter(Boolean) : [];
        const rmMainImg = formatImageUrl(rm.image) || rmImages[0] || '';
        if (rmMainImg && !rmImages.includes(rmMainImg)) rmImages.unshift(rmMainImg);

        if (existingIdx < 0) {
          currentResort.rooms.push({
            id: rmId,
            room_id: rm.id,
            name: rmName,
            type: rm.type || 'Room',
            description: decodeHtml(rm.description || ''),
            full_description: decodeHtml(rm.description || ''),
            price_per_night: Number(rm.price_per_night ?? rm.price ?? 0),
            price: Number(rm.price_per_night ?? rm.price ?? 0),
            capacity: rm.capacity ? Number(rm.capacity) : 2,
            image: rmMainImg,
            images: rmImages,
            amenities: Array.isArray(rm.amenities) ? rm.amenities : (currentResort.resort_amenities || []),
          });
        }
      });
    }
  });

  // Ensure each resort card has at least 1 room slide
  Object.values(resortGroups).forEach(resort => {
    if (resort.rooms.length === 0) {
      resort.rooms.push({
        id: resort.id,
        name: resort.name,
        type: resort.type || 'Beach Resort',
        description: resort.description || `${resort.name} in Mansalay. Experience a comfortable and scenic stay.`,
        full_description: resort.full_description || resort.description || '',
        price_per_night: resort.pricePerNight || 0,
        price: resort.pricePerNight || 0,
        capacity: resort.capacity || 2,
        image: resort.image,
        images: resort.images || (resort.image ? [resort.image] : []),
        amenities: resort.resort_amenities || [],
      });
    }

    resort.rooms_count = resort.rooms.length;
    if (!resort.image && resort.rooms[0]?.image) {
      resort.image = resort.rooms[0].image;
    }
    if (!resort.pricePerNight && resort.rooms[0]?.price_per_night) {
      resort.pricePerNight = resort.rooms[0].price_per_night;
    }
  });

  return Object.values(resortGroups);
}

interface AccommodationCardProps {
  acc: AccommodationItem;
  typeFilter?: string;
  onCardClick: (activeRoom?: RoomItem) => void;
  onOpenLightbox: (images: string[], index: number, title: string) => void;
  onShare: (e: React.MouseEvent, activeRoom?: RoomItem) => void;
  onSave: (e: React.MouseEvent, activeRoom?: RoomItem) => void;
  isInWishlist: boolean;
  wishlistCount: number;
  userType: string | null;
  onResortClick: (resortName: string, userId?: number | string, e?: React.MouseEvent) => void;
}

function AccommodationCardItem({
  acc,
  typeFilter,
  onCardClick,
  onOpenLightbox,
  onShare,
  onSave,
  isInWishlist: parentIsInWishlist,
  wishlistCount: parentWishlistCount,
  userType,
  onResortClick,
}: AccommodationCardProps) {
  const { isInWishlist, getWishlistCount } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Filter or list all rooms for this resort
  const rooms = useMemo(() => {
    const allRooms = Array.isArray(acc.rooms) && acc.rooms.length > 0 ? acc.rooms : [{
      id: acc.id,
      name: acc.name,
      type: acc.type || 'Beach Resort',
      description: acc.description,
      full_description: acc.full_description,
      price_per_night: acc.pricePerNight || 0,
      price: acc.pricePerNight || 0,
      capacity: acc.capacity || 2,
      image: acc.image,
      images: acc.images || (acc.image ? [acc.image] : []),
      amenities: acc.resort_amenities || [],
    }];

    if (typeFilter && typeFilter !== 'All' && typeFilter !== 'All Stays') {
      const matched = allRooms.filter(r => r.type?.toLowerCase() === typeFilter.toLowerCase());
      if (matched.length > 0) return matched;
    }
    return allRooms;
  }, [acc, typeFilter]);

  const hasMultipleRooms = rooms.length > 1;
  const currentRoomIdx = currentIdx < rooms.length ? currentIdx : 0;
  const currentRoom = rooms[currentRoomIdx] || rooms[0];

  const isRoomSaved = isInWishlist(currentRoom.id, 'accommodation') ||
    (currentRoom.room_id && isInWishlist(`room-${currentRoom.room_id}`, 'accommodation')) ||
    isInWishlist(acc.id, 'accommodation');

  const roomWishlistCount = Math.max(
    getWishlistCount(currentRoom.id, 'accommodation', currentRoom.likes || 0),
    currentRoom.room_id ? getWishlistCount(`room-${currentRoom.room_id}`, 'accommodation', 0) : 0,
    getWishlistCount(acc.id, 'accommodation', acc.likes || 0)
  );

  // Each carousel slide represents ONE room with that room's photo
  const currentRoomImage = formatImageUrl(
    currentRoom.image || (currentRoom.images && currentRoom.images[0]) || acc.image
  ) || '/assets/mansalay_hero_bg.jpg';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultipleRooms) return;
    setCurrentIdx((prev) => (prev === 0 ? rooms.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultipleRooms) return;
    setCurrentIdx((prev) => (prev === rooms.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 35 && hasMultipleRooms) {
      setCurrentIdx((prev) => (prev === rooms.length - 1 ? 0 : prev + 1));
    } else if (distance < -35 && hasMultipleRooms) {
      setCurrentIdx((prev) => (prev === 0 ? rooms.length - 1 : prev - 1));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roomPhotos = rooms.map(r => formatImageUrl(r.image || r.images?.[0] || acc.image)).filter(Boolean);
    onOpenLightbox(
      roomPhotos.length > 0 ? roomPhotos : [currentRoomImage],
      currentRoomIdx,
      `${acc.resort_name || acc.name} — ${currentRoom.name}`
    );
  };

  return (
    <div
      onClick={() => onCardClick(currentRoom)}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer hover:border-pink-200 justify-between"
    >
      {/* ── ROOM CAROUSEL IMAGE CONTAINER ── */}
      <div
        className="relative aspect-4/3 overflow-hidden bg-gray-100 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentRoomImage}
          alt={`${currentRoom.name} - ${acc.resort_name || acc.name}`}
          onClick={handleImageClick}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
          loading="lazy"
        />

        {/* Top-Left Resort Name Badge */}
        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full shadow-xs z-10 pointer-events-none max-w-[150px] truncate">
          {acc.resort_name || acc.name}
        </span>

        {/* Room Carousel Counter Pill (Shows "Room X / Y") */}
        {hasMultipleRooms && (
          <button
            type="button"
            onClick={handleImageClick}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-[10px] font-extrabold rounded-full shadow-xs z-10 border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
            title="Click to view full screen gallery"
          >
            <Maximize2 className="h-2.5 w-2.5 opacity-80" />
            <span>Room {currentRoomIdx + 1} / {rooms.length}</span>
          </button>
        )}

        {/* Carousel Arrow Controls (Switch Between Rooms) */}
        {hasMultipleRooms && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-pink-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-md border border-white/20"
              aria-label="Previous room"
              title="Previous room"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-pink-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-md border border-white/20"
              aria-label="Next room"
              title="Next room"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Room Indicator Dots */}
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1 z-10">
              {rooms.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(i);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === currentRoomIdx ? 'w-4 bg-pink-500 shadow-xs' : 'w-1.5 bg-white/70 hover:bg-white'
                  }`}
                  aria-label={`Go to room ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top-Right Action Controls (Share + Pin / Save) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => onShare(e, currentRoom)}
            className="w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors hover:scale-110 cursor-pointer shadow-xs"
            title="Share this stay"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => onSave(e, currentRoom)}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-xs cursor-pointer ${
              isRoomSaved
                ? 'bg-rose-50 border border-rose-300 ring-2 ring-rose-100'
                : 'bg-white/90 hover:bg-white border border-gray-200'
            }`}
            title={isRoomSaved ? 'Remove from saved places' : 'Pin to saved places'}
          >
            <PushPinIcon
              isPinned={isRoomSaved}
              size={16}
              idPrefix={`acc-tr-${currentRoom.id || acc.id}`}
            />
          </button>
        </div>

        {/* Dark Overlay Saves Counter & Interactive Pin Button */}
        <button
          type="button"
          onClick={(e) => onSave(e, currentRoom)}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white text-[11px] font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 z-10 whitespace-nowrap"
          title={isRoomSaved ? 'Saved in pins' : 'Click to pin stay'}
        >
          <PushPinIcon isPinned={isRoomSaved} size={14} idPrefix={`acc-bl-${currentRoom.id || acc.id}`} />
          <span className={isRoomSaved ? 'text-red-400 font-extrabold whitespace-nowrap' : 'text-gray-200 whitespace-nowrap'}>
            Save: {roomWishlistCount}
          </span>
        </button>
      </div>

      {/* ── DYNAMIC ROOM INFORMATION (UPDATES PER ROOM SLIDE) ── */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Room Type & Capacity */}
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] uppercase font-bold text-gray-400">
              {currentRoom.type || acc.type || 'Room'}
            </p>
            {currentRoom.capacity ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Users className="h-3 w-3" /> Max {currentRoom.capacity}
              </span>
            ) : null}
          </div>

          {/* Room Name */}
          <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mt-0.5">
            {currentRoom.name}
          </h3>

          {/* Room Description */}
          <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 min-h-[32px] text-justify" style={{ textAlign: 'justify' }}>
            {currentRoom.description || currentRoom.full_description || `${currentRoom.name} at ${acc.resort_name || acc.name}. Experience a comfortable and scenic stay.`}
          </p>

          {/* Room Price */}
          {currentRoom.price_per_night && Number(currentRoom.price_per_night) > 0 ? (
            <div className="mt-2 text-pink-600 font-extrabold text-sm flex items-baseline gap-0.5">
              <span>₱{Number(currentRoom.price_per_night).toLocaleString()}</span>
              <span className="text-[10px] font-normal text-gray-400"> / night</span>
            </div>
          ) : null}

          {/* Room Amenities */}
          {(() => {
            const rawAmenities = (currentRoom.amenities && currentRoom.amenities.length > 0)
              ? currentRoom.amenities
              : (currentRoom.features && currentRoom.features.length > 0)
              ? currentRoom.features
              : (acc.resort_amenities && acc.resort_amenities.length > 0)
              ? acc.resort_amenities
              : [];
            if (!rawAmenities || rawAmenities.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-1 mt-2.5">
                {rawAmenities.slice(0, 3).map((amenity: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-pink-50/70 border border-pink-100 text-pink-700 rounded-md text-[10px] font-semibold flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span className="truncate max-w-[120px]">{amenity}</span>
                  </span>
                ))}
                {rawAmenities.length > 3 && (
                  <span className="text-gray-400 text-[10px] font-medium pl-0.5">
                    +{rawAmenities.length - 3}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Clickable Resort Host Link */}
        <div
          onClick={(e) => onResortClick(acc.resort_name || acc.name, acc.user_id, e)}
          className="flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold mt-4 pt-3 border-t border-gray-100 group/resort cursor-pointer transition-colors"
          title={`Click to view resort profile of ${acc.resort_name || acc.name || 'this resort'}`}
        >
          <Hotel className="h-3.5 w-3.5 text-emerald-600 group-hover/resort:scale-110 transition-transform flex-shrink-0" />
          <span className="truncate group-hover/resort:underline">{acc.resort_name || acc.name || 'Mansalay Beach Resort'}</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-auto flex-shrink-0 group-hover/resort:opacity-100 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}

interface FullscreenGalleryProps {
  isOpen: boolean;
  images: string[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

function FullscreenGalleryModal({
  isOpen,
  images,
  initialIndex,
  title,
  onClose,
}: FullscreenGalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      else if (e.key === 'ArrowRight') setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentSrc = images[index] || images[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40 && images.length > 1) {
      handleNext();
    } else if (diff < -40 && images.length > 1) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between z-20" onClick={(e) => e.stopPropagation()}>
        <div className="text-white">
          <h3 className="text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md">{title}</h3>
          {images.length > 1 && (
            <span className="text-xs text-gray-400 font-semibold">{index + 1} of {images.length} photos</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
          title="Close gallery (Esc)"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentSrc}
          alt={`${title} - Photo ${index + 1}`}
          className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300"
          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black/60 hover:bg-pink-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all z-20 cursor-pointer shadow-lg border border-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black/60 hover:bg-pink-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all z-20 cursor-pointer shadow-lg border border-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-12 w-16 sm:h-14 sm:w-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                i === index ? 'border-pink-500 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Accommodations() {
  const navigate = useNavigate();
  const { userType, currentUser, addToWishlist, removeFromWishlist, isInWishlist, getWishlistCount } = useApp();
  const isLoggedIn = Boolean(userType && currentUser);

  const [items, setItems] = useState<AccommodationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<AccommodationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedResortFilter, setSelectedResortFilter] = useState<string | null>(null);
  const [savedAccIds, setSavedAccIds] = useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  const [modalRoomIdx, setModalRoomIdx] = useState(0);
  const modalTouchStartX = useRef<number | null>(null);
  const modalTouchEndX = useRef<number | null>(null);

  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    title: string;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    title: '',
  });

  const loadAccommodations = async () => {
    setLoading(true);
    try {
      const [accRes, attrRes] = await Promise.all([
        getPublicJSON('/accommodations').catch(() => []),
        getPublicJSON('/attractions').catch(() => []),
      ]);
      const rawAcc = Array.isArray(accRes) ? accRes : accRes?.data ?? [];
      const rawAttr = Array.isArray(attrRes) ? attrRes : attrRes?.data ?? [];

      const accAttractions = rawAttr.filter((a: any) =>
        a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
      );

      let customResorts: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_resorts');
        if (stored) customResorts = JSON.parse(stored);
      } catch { }

      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) {
          const parsed = JSON.parse(stored);
          customAttractions = parsed.filter((a: any) =>
            a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
          );
        }
      } catch { }

      let deletedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
      } catch { }

      let archivedIds = new Set<string>();
      try {
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch { }

      const allRaw = [...rawAcc, ...accAttractions].filter(i => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map(r => String(r.id)));
      [...customResorts, ...customAttractions].forEach(cr => {
        if (!existingIds.has(String(cr.id)) && !deletedIds.has(String(cr.id)) && !archivedIds.has(String(cr.id))) {
          allRaw.unshift(cr);
        }
      });

      // Apply grouping and normalization: 1 Room = 1 Card
      const normalizedList = groupAndNormalizeAccommodations(allRaw);
      setItems(normalizedList);
    } catch (err) {
      console.error('Error fetching real accommodations:', err);
      let customResorts: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_resorts');
        if (stored) customResorts = JSON.parse(stored);
      } catch { }
      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) {
          const parsed = JSON.parse(stored);
          customAttractions = parsed.filter((a: any) =>
            a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
          );
        }
      } catch { }
      const fallbackList = groupAndNormalizeAccommodations([...customResorts, ...customAttractions]);
      setItems(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccommodations();
    window.addEventListener('contentUpdated', loadAccommodations);
    window.addEventListener('storage', loadAccommodations);
    return () => {
      window.removeEventListener('contentUpdated', loadAccommodations);
      window.removeEventListener('storage', loadAccommodations);
    };
  }, []);

  const handleAccCardClick = (acc: AccommodationItem, activeRoom?: RoomItem) => {
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view stay details');
      navigate('/tourist/login');
      return;
    }
    recordView(acc.id, 'accommodation');
    if (acc.user_id) recordView(acc.user_id, 'resort');

    const rooms = Array.isArray(acc.rooms) && acc.rooms.length > 0 ? acc.rooms : [];
    let initialIdx = 0;
    if (activeRoom && rooms.length > 0) {
      const foundIdx = rooms.findIndex(r => r.id === activeRoom.id || r.name.toLowerCase() === activeRoom.name.toLowerCase());
      if (foundIdx >= 0) initialIdx = foundIdx;
    }
    setModalRoomIdx(initialIdx);
    setSelectedAcc(acc);
  };

  const toggleSaveAcc = async (itemToSave: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to save to wishlist');
      navigate('/tourist/login');
      return;
    }
    const saveId = itemToSave.id || (itemToSave.room_id ? `room-${itemToSave.room_id}` : undefined);
    if (!saveId) return;

    const itemName = itemToSave.name || itemToSave.title || 'Stay';

    if (isInWishlist(saveId, 'accommodation')) {
      const confirmed = await showUnsaveConfirmDialog(itemName);
      if (confirmed) {
        removeFromWishlist(saveId, 'accommodation', itemName);
      }
    } else {
      addToWishlist({
        id: saveId,
        type: 'accommodation',
        title: itemName,
        image: itemToSave.image || (Array.isArray(itemToSave.images) ? itemToSave.images[0] : undefined),
        category: itemToSave.type || itemToSave.category || 'Room',
        price: itemToSave.price_per_night || itemToSave.pricePerNight || itemToSave.price,
        likes: itemToSave.likes,
      } as any);
    }
  };


  const predefinedStaysCategories = ACCOMMODATION_CATEGORIES;

  const handleResortClick = (resortName: string, userId?: number | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view resort profile');
      navigate('/login');
      return;
    }
    if (userId) {
      navigate(`/business/resort/${userId}`);
    } else {
      toast.info(`Resort profile for "${resortName}" is not yet available or registered.`);
    }
  };

  const typeCategories = useMemo(() => {
    const roomTypes = items.flatMap(acc => acc.rooms.map(r => r.type).filter(Boolean) as string[]);
    const resortTypes = items.map(acc => acc.type).filter(Boolean) as string[];
    const allTypes = Array.from(new Set([...predefinedStaysCategories, ...resortTypes, ...roomTypes]));
    return allTypes.filter(t => t && t.toLowerCase() !== 'static' && t.toLowerCase() !== 'resort_profile' && t.trim() !== '');
  }, [items]);

  const filteredAccommodations = items.filter(acc => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      acc.name.toLowerCase().includes(q) ||
      (acc.resort_name && acc.resort_name.toLowerCase().includes(q)) ||
      (acc.type && acc.type.toLowerCase().includes(q)) ||
      (acc.location && acc.location.toLowerCase().includes(q)) ||
      (acc.description && acc.description.toLowerCase().includes(q)) ||
      (Array.isArray(acc.rooms) && acc.rooms.some(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.type && r.type.toLowerCase().includes(q))
      ));

    const matchesType = typeFilter === 'All' || typeFilter === 'All Stays' ||
      (acc.type && acc.type.toLowerCase() === typeFilter.toLowerCase()) ||
      (Array.isArray(acc.rooms) && acc.rooms.some(r => r.type && r.type.toLowerCase() === typeFilter.toLowerCase()));

    const matchesResort = !selectedResortFilter ||
      (acc.resort_name && acc.resort_name.toLowerCase() === selectedResortFilter.toLowerCase()) ||
      (acc.name && acc.name.toLowerCase() === selectedResortFilter.toLowerCase());

    return matchesSearch && matchesType && matchesResort;
  });

  return (
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Stays & Resorts</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Discover rooms, suites, cottages, and beach resorts in Mansalay
            </p>
          </div>

          {/* Search Pill Input & Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms, types, or resorts..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
            </div>

            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Categories</option>
                {typeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── ACTIVE RESORT FILTER BANNER ── */}
        {selectedResortFilter && (
          <div className="mb-6 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-xs">
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Filtered by Resort</p>
                <h4 className="text-sm font-extrabold text-gray-900">{selectedResortFilter}</h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedResortFilter(null)}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-full text-xs font-bold text-emerald-800 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <X className="h-3.5 w-3.5 text-emerald-600" />
              <span>Show All Stays</span>
            </button>
          </div>
        )}

        {/* ── COUNT SUBHEADER ── */}
        <p className="text-xs font-semibold text-gray-400 mb-4">
          Showing <span className="text-gray-900 font-bold">{filteredAccommodations.length}</span> {filteredAccommodations.length === 1 ? 'stay & resort' : 'stays & resorts'}
        </p>

        {/* ── MAIN LISTINGS GRID (4 COLUMNS) ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-4/3 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-md w-1/2" />
                  <div className="h-4 bg-gray-200 rounded-md w-1/4 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAccommodations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto my-8">
            <Hotel className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No Stays Found</h3>
            <p className="text-xs text-gray-500 mt-1">Try selecting a different category or refining your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAccommodations.map((acc) => (
              <AccommodationCardItem
                key={acc.id}
                acc={acc}
                typeFilter={typeFilter}
                onCardClick={(activeRoom) => handleAccCardClick(acc, activeRoom)}
                onOpenLightbox={(images, index, title) => {
                  setLightboxData({
                    isOpen: true,
                    images,
                    initialIndex: index,
                    title,
                  });
                }}
                onShare={(e, activeRoom) => {
                  e.stopPropagation();
                  const targetRoom = activeRoom || acc.rooms?.[0];
                  setShareData({
                    title: `${acc.resort_name || acc.name}${targetRoom?.name ? ` — ${targetRoom.name}` : ''}`,
                    description: targetRoom?.description || acc.description,
                    image: targetRoom?.image || acc.image,
                    category: targetRoom?.type || acc.type || 'Resort',
                  });
                }}
                onSave={(e, targetRoom) => toggleSaveAcc(targetRoom || acc, e)}
                isInWishlist={isInWishlist(acc.id, 'accommodation') || (Array.isArray(acc.rooms) && acc.rooms.some(r => isInWishlist(r.id, 'accommodation')))}
                wishlistCount={getWishlistCount(acc.id, 'accommodation', acc.likes)}
                userType={userType}
                onResortClick={handleResortClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── ACCOMMODATION / ROOM DETAIL MODAL ── */}
      {selectedAcc && (() => {
        const modalRooms = (Array.isArray(selectedAcc.rooms) && selectedAcc.rooms.length > 0)
          ? selectedAcc.rooms
          : [{
              id: selectedAcc.id,
              name: selectedAcc.name,
              type: selectedAcc.type || 'Room',
              description: selectedAcc.description,
              full_description: selectedAcc.full_description,
              price_per_night: selectedAcc.pricePerNight,
              price: selectedAcc.pricePerNight,
              capacity: selectedAcc.capacity,
              image: selectedAcc.image,
              images: selectedAcc.images || (selectedAcc.image ? [selectedAcc.image] : []),
              amenities: selectedAcc.resort_amenities || [],
            }];
        const currentModalRoomIdx = modalRoomIdx < modalRooms.length ? modalRoomIdx : 0;
        const currentRoom = modalRooms[currentModalRoomIdx] || modalRooms[0];
        const hasMultipleModalRooms = modalRooms.length > 1;

        const currentRoomImg = formatImageUrl(
          currentRoom.image || (currentRoom.images && currentRoom.images[0]) || selectedAcc.image
        ) || '/assets/mansalay_hero_bg.jpg';

        const handleModalPrevRoom = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!hasMultipleModalRooms) return;
          setModalRoomIdx((prev) => (prev === 0 ? modalRooms.length - 1 : prev - 1));
        };

        const handleModalNextRoom = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!hasMultipleModalRooms) return;
          setModalRoomIdx((prev) => (prev === modalRooms.length - 1 ? 0 : prev + 1));
        };

        const handleModalTouchStart = (e: React.TouchEvent) => {
          modalTouchStartX.current = e.targetTouches[0].clientX;
        };

        const handleModalTouchMove = (e: React.TouchEvent) => {
          modalTouchEndX.current = e.targetTouches[0].clientX;
        };

        const handleModalTouchEnd = () => {
          if (modalTouchStartX.current === null || modalTouchEndX.current === null) return;
          const distance = modalTouchStartX.current - modalTouchEndX.current;
          if (distance > 35 && hasMultipleModalRooms) {
            setModalRoomIdx((prev) => (prev === modalRooms.length - 1 ? 0 : prev + 1));
          } else if (distance < -35 && hasMultipleModalRooms) {
            setModalRoomIdx((prev) => (prev === 0 ? modalRooms.length - 1 : prev - 1));
          }
          modalTouchStartX.current = null;
          modalTouchEndX.current = null;
        };

        const roomAmenities = (currentRoom.amenities && currentRoom.amenities.length > 0)
          ? currentRoom.amenities
          : (currentRoom.features && currentRoom.features.length > 0)
          ? currentRoom.features
          : (selectedAcc.resort_amenities && selectedAcc.resort_amenities.length > 0)
          ? selectedAcc.resort_amenities
          : ['Beachfront', 'Scenic View', 'Air Conditioning', 'Free Wi-Fi'];

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedAcc(null)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Header with Room Switching Arrows */}
              <div
                className="relative h-64 bg-gray-950 flex-shrink-0 select-none overflow-hidden"
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
              >
                <img
                  src={currentRoomImg}
                  alt={`${currentRoom.name} - ${selectedAcc.resort_name || selectedAcc.name}`}
                  className="w-full h-full object-cover transition-all duration-300 cursor-zoom-in"
                  onClick={() => {
                    const roomPhotos = modalRooms.map(r => formatImageUrl(r.image || r.images?.[0] || selectedAcc.image)).filter(Boolean);
                    setLightboxData({
                      isOpen: true,
                      images: roomPhotos.length > 0 ? roomPhotos : [selectedAcc.image],
                      initialIndex: currentModalRoomIdx,
                      title: `${selectedAcc.resort_name || selectedAcc.name} — ${currentRoom.name}`,
                    });
                  }}
                  onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                />

                {/* Close Button Top-Right */}
                <button
                  type="button"
                  onClick={() => setSelectedAcc(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-30 cursor-pointer shadow-md border border-white/20"
                  title="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Top-Left Room Counter Badge */}
                {hasMultipleModalRooms ? (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/65 backdrop-blur-md text-white text-xs font-extrabold rounded-full shadow-md border border-white/20 z-20 flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5 text-pink-400" />
                    <span>Room {currentModalRoomIdx + 1} of {modalRooms.length}</span>
                  </div>
                ) : (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full shadow-md z-20">
                    {selectedAcc.resort_name || selectedAcc.name}
                  </span>
                )}

                {/* Left & Right Room Switching Arrow Buttons */}
                {hasMultipleModalRooms && (
                  <>
                    <button
                      type="button"
                      onClick={handleModalPrevRoom}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-pink-600 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all z-20 cursor-pointer shadow-xl border border-white/30 hover:scale-105"
                      aria-label="Previous room"
                      title="Previous room"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleModalNextRoom}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-pink-600 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all z-20 cursor-pointer shadow-xl border border-white/30 hover:scale-105"
                      aria-label="Next room"
                      title="Next room"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Room Dots Indicator */}
                    <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20">
                      {modalRooms.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalRoomIdx(i);
                          }}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            i === currentModalRoomIdx ? 'w-5 bg-pink-500 shadow-md' : 'w-2 bg-white/70 hover:bg-white'
                          }`}
                          aria-label={`Go to room ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}

              </div>

              {/* Modal Body with Dynamic Room Information */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-pink-100 text-pink-600 text-[11px] font-bold rounded-full uppercase">
                        {currentRoom.type || selectedAcc.type || 'Room'}
                      </span>
                      {currentRoom.capacity ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                          <Users className="h-3 w-3" /> Max {currentRoom.capacity} Guests
                        </span>
                      ) : null}
                    </div>

                    {/* Room Name Heading */}
                    <h2 className="text-xl font-extrabold text-gray-900 mt-2">{currentRoom.name}</h2>

                    {/* Room Price */}
                    {currentRoom.price_per_night && Number(currentRoom.price_per_night) > 0 ? (
                      <div className="text-pink-600 font-extrabold text-base mt-1 flex items-baseline gap-1">
                        <span>₱{Number(currentRoom.price_per_night).toLocaleString()}</span>
                        <span className="text-xs font-normal text-gray-400">/ night</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShareData({
                          title: `${selectedAcc.resort_name || selectedAcc.name} — ${currentRoom.name}`,
                          description: currentRoom.description || selectedAcc.description,
                          image: currentRoom.image || selectedAcc.image,
                          category: currentRoom.type || selectedAcc.type || 'Resort',
                        });
                      }}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors cursor-pointer"
                      title="Share this stay"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSaveAcc(currentRoom || selectedAcc)}
                      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        isInWishlist(currentRoom?.id || selectedAcc.id, 'accommodation')
                          ? 'bg-rose-50 border border-rose-300 shadow-sm'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      title={isInWishlist(currentRoom?.id || selectedAcc.id, 'accommodation') ? 'Remove from saved places' : 'Pin to saved places'}
                    >
                      <PushPinIcon
                        isPinned={isInWishlist(currentRoom?.id || selectedAcc.id, 'accommodation')}
                        size={18}
                        idPrefix={`modal-acc-tr-${currentRoom?.id || selectedAcc.id}`}
                      />
                    </button>
                  </div>
                </div>

                {/* 🏨 Resort Host Card with "View Resort Profile" Button */}
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                      <Hotel className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Resort Host</p>
                      <h4 className="text-sm font-extrabold text-gray-900 truncate">{selectedAcc.resort_name || selectedAcc.name}</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const hostId = selectedAcc.user_id;
                      if (!hostId) {
                        toast.info(`Resort profile for "${selectedAcc.resort_name || selectedAcc.name}" is not yet available or registered.`);
                        return;
                      }
                      if (!currentUser && !getAuthToken()) {
                        toast.info('Please log in or register to view resort profile');
                        navigate('/login');
                        return;
                      }
                      setSelectedAcc(null);
                      navigate(`/business/resort/${hostId}`);
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-2xs flex-shrink-0 cursor-pointer"
                  >
                    <span>View Resort</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {/* Location & Directions Button */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <MapPin className="h-4 w-4 text-pink-500" />
                      <span>{selectedAcc.location || 'Mansalay, Oriental Mindoro'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>8:00 AM – 8:00 PM</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const query = encodeURIComponent(`${selectedAcc.resort_name || selectedAcc.name} ${selectedAcc.location || 'Mansalay Oriental Mindoro'}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Directions</span>
                  </button>
                </div>

                {/* Room Description Box */}
                <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-pink-500" />
                    <span>Description</span>
                  </h4>
                  <div className="text-xs text-gray-600 leading-relaxed font-normal text-justify space-y-2.5" style={{ textAlign: 'justify' }}>
                    {(currentRoom.full_description || currentRoom.description || selectedAcc.full_description || selectedAcc.description) ? (
                      (currentRoom.full_description || currentRoom.description || selectedAcc.full_description || selectedAcc.description)!
                        .replace(/<br\s*[\/]?>/gi, '\n')
                        .split(/\r?\n+/)
                        .map((p: string) => p.trim())
                        .filter((p: string) => p.length > 0)
                        .map((para: string, idx: number) => (
                          <p key={idx} className="text-justify leading-relaxed" style={{ textAlign: 'justify' }}>
                            {para}
                          </p>
                        ))
                    ) : (
                      <p className="text-justify leading-relaxed" style={{ textAlign: 'justify' }}>
                        Enjoy a relaxing and comfortable stay in {currentRoom.name} at {selectedAcc.resort_name || selectedAcc.name}. Clean, peaceful, and close to nature in Oriental Mindoro.
                      </p>
                    )}
                  </div>
                </div>

                {/* Room Amenities / Tags */}
                <div className="flex flex-wrap gap-2">
                  {roomAmenities.map((amenity: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold border border-pink-100">
                      ♡ {amenity}
                    </span>
                  ))}
                </div>

                {/* Contact & Connect Box */}
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-2.5">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Contact & Connect</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {(selectedAcc.contact_number || selectedAcc.phone) ? (
                      <a
                        href={`tel:${selectedAcc.contact_number || selectedAcc.phone}`}
                        className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call ({selectedAcc.contact_number || selectedAcc.phone})
                      </a>
                    ) : (
                      <span className="px-3.5 py-2 bg-gray-100 text-gray-500 rounded-full text-xs font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" /> Inquire via Resort
                      </span>
                    )}
                    {selectedAcc.facebook ? (
                      <a
                        href={selectedAcc.facebook.startsWith('http') ? selectedAcc.facebook : `https://${selectedAcc.facebook}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Facebook className="h-3.5 w-3.5" /> Facebook Page
                      </a>
                    ) : null}
                    {selectedAcc.instagram ? (
                      <a
                        href={selectedAcc.instagram.startsWith('http') ? selectedAcc.instagram : `https://${selectedAcc.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </a>
                    ) : null}
                  </div>

                  {/* 360° Walkthrough & Virtual Tour Button */}
                  <button
                    type="button"
                    onClick={() => setIsVirtualTourOpen(true)}
                    className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <Footprints className="h-4 w-4 text-emerald-100" />
                    <span>360° Walkthrough & Virtual Tour</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GUEST LOGIN REQUIRED MODAL ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="w-14 h-14 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <MapPin className="h-7 w-7 fill-pink-500/20 text-pink-500" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Login Required</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                You are currently in guest mode. Please log in or register to pin and save accommodations to your account.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  navigate('/select-role');
                }}
                className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-full shadow-md shadow-pink-500/20 transition-all"
              >
                Log In / Register
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-full transition-all"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOCIAL SHARE MODAL ── */}
      {shareData && (
        <ShareModal
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          title={shareData.title}
          description={shareData.description}
          image={shareData.image}
          category={shareData.category}
        />
      )}

      {/* ── FULLSCREEN GALLERY LIGHTBOX MODAL ── */}
      <FullscreenGalleryModal
        isOpen={lightboxData.isOpen}
        images={lightboxData.images}
        initialIndex={lightboxData.initialIndex}
        title={lightboxData.title}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ── 360° VIRTUAL WALKTHROUGH MODAL ── */}
      {selectedAcc && (
        <VirtualTourModal
          isOpen={isVirtualTourOpen}
          onClose={() => setIsVirtualTourOpen(false)}
          attractionName={selectedAcc.name || selectedAcc.resort_name || 'Resort Stay'}
          category={selectedAcc.type || 'Resort & Stay'}
          mainImage={selectedAcc.image}
          videoUrl={selectedAcc.virtual_tour_video || (selectedAcc as any).video}
          phone={selectedAcc.contact_number || selectedAcc.phone}
          lat={Number(selectedAcc.latitude || selectedAcc.lat) || undefined}
          lng={Number(selectedAcc.longitude || selectedAcc.lng) || undefined}
          customScenes={selectedAcc.virtual_tour_scenes}
        />
      )}
    </div>
  );
}
