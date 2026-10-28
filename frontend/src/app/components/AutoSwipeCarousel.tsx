import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '../lib/constants';
import { formatImageUrl } from '../lib/api';

interface AutoSwipeCarouselProps {
  images: string[];
  alt: string;
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  presentation?: 'card' | 'modal';
  showDots?: boolean;
  showArrows?: boolean;
  enableSwipe?: boolean;
  onClick?: () => void;
}

export function sanitizeImages(images: unknown = []): string[] {
  const seenUrls = new Set<string>();
  const seenFilenames = new Set<string>();
  const uniqueImages: string[] = [];
  const candidates = Array.isArray(images) ? images : [];

  for (const image of candidates.filter(
    (candidate): candidate is string => typeof candidate === 'string' && Boolean(candidate.trim())
  ).map((candidate) => candidate.trim())) {
    if (seenUrls.has(image)) continue;

    const rawFilename = image
      .split(/[?#]/, 1)[0]
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.trim();
    if (!rawFilename) continue;

    let filename = rawFilename.toLowerCase();
    try {
      filename = decodeURIComponent(rawFilename).toLowerCase();
    } catch {
      // Keep the raw basename when the URL contains malformed encoding.
    }

    if (filename && seenFilenames.has(filename)) continue;
    seenUrls.add(image);
    seenFilenames.add(filename);
    uniqueImages.push(image);
  }

  return uniqueImages;
}

export function uniqueImageUrls(images: string[]): string[] {
  return sanitizeImages(images);
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true') return;

  image.dataset.fallbackApplied = 'true';
  image.src = PLACEHOLDER_IMAGE;
}

export function AutoSwipeCarousel({
  images,
  alt,
  intervalMs = 3500,
  className = '',
  imageClassName = '',
  presentation = 'card',
  showDots = true,
  showArrows = true,
  enableSwipe = false,
  onClick,
}: AutoSwipeCarouselProps) {
  const extraImageClassName = imageClassName.replace(/\bobject-(cover|contain|fill|none|scale-down)\b/g, '');
  const cleanImages = useMemo(() => {
    const rawSlides = Array.isArray(images) && images.length > 0 ? images : [];
    const normalizedSlides = rawSlides
        .filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
        .map((image) => formatImageUrl(image.trim()))
        .filter(Boolean);
    const displaySlides = sanitizeImages(normalizedSlides);

    if (displaySlides.length !== normalizedSlides.length) {
      console.warn('[AutoSwipeCarousel] Duplicate slides removed before rendering', {
        alt,
        sourceSlides: normalizedSlides,
        displaySlides,
      });
    }

    return displaySlides.length > 0 ? displaySlides : [PLACEHOLDER_IMAGE];
  }, [images, alt]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [didSwipe, setDidSwipe] = useState(false);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(cleanImages.length - 1, 0)));
  }, [cleanImages.length]);

  useEffect(() => {
    if (cleanImages.length <= 1 || isHovered || currentIndex >= cleanImages.length - 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => prev + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cleanImages.length, currentIndex, intervalMs, isHovered]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => Math.min(prev + 1, cleanImages.length - 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (enableSwipe && cleanImages.length > 1) {
      setTouchStartX(e.touches[0].clientX);
      setDidSwipe(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!enableSwipe || touchStartX === null || cleanImages.length <= 1) return;

    const distance = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) >= 40) {
      setCurrentIndex(prev => (
        distance < 0
          ? Math.min(prev + 1, cleanImages.length - 1)
          : Math.max(prev - 1, 0)
      ));
      setDidSwipe(true);
    }
    setTouchStartX(null);
  };

  return (
    <div
      className={`relative overflow-hidden group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (didSwipe) {
          e.stopPropagation();
          setDidSwipe(false);
          return;
        }
        onClick?.();
      }}
      style={enableSwipe ? { touchAction: 'pan-y' } : undefined}
    >
      {/* Images Slider Track */}
      <div
        className="flex h-full min-w-0 transition-transform duration-700 ease-in-out bg-slate-900 will-change-transform"
        style={{
          width: `${cleanImages.length * 100}%`,
          transform: `translateX(-${currentIndex * 100 / cleanImages.length}%)`,
        }}
      >
        {cleanImages.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="relative min-w-0 max-w-full h-full bg-slate-900"
            style={{ flex: `0 0 ${100 / cleanImages.length}%` }}
          >
            {presentation === 'modal' && (
              <>
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover filter blur-md scale-110 opacity-60 pointer-events-none"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 z-[1] bg-black/20 pointer-events-none" />
              </>
            )}
            <img
              src={src}
              alt={`${alt} ${idx + 1}`}
              loading="eager"
              decoding="async"
              className={`relative z-10 flex-shrink-0 w-full h-full ${
                presentation === 'modal' ? 'object-contain' : 'object-cover object-center'
              } ${extraImageClassName}`}
              onError={handleImageError}
            />
          </div>
        ))}
      </div>

      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Navigation Arrows */}
      {showArrows && cleanImages.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-pink-500 disabled:hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-100 disabled:opacity-40 transition-all duration-200 z-10 shadow-md border border-white/20 cursor-pointer disabled:cursor-not-allowed"
            title="Previous image"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === cleanImages.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-pink-500 disabled:hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-100 disabled:opacity-40 transition-all duration-200 z-10 shadow-md border border-white/20 cursor-pointer disabled:cursor-not-allowed"
            title="Next image"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Auto-Slide Active Dots Indicator */}
      {showDots && cleanImages.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
          {cleanImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'bg-pink-500 w-4 shadow-sm' : 'bg-white/60 w-1.5 hover:bg-white'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
