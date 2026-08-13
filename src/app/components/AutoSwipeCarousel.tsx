import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AutoSwipeCarouselProps {
  images: string[];
  alt: string;
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
  onClick?: () => void;
}

export function AutoSwipeCarousel({
  images,
  alt,
  intervalMs = 3500,
  className = '',
  imageClassName = 'w-full h-full object-cover',
  showDots = true,
  showArrows = true,
  onClick,
}: AutoSwipeCarouselProps) {
  const cleanImages = images.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (cleanImages.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % cleanImages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cleanImages.length, intervalMs, isHovered]);

  if (cleanImages.length === 0) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-xs text-gray-400">No Image</span>
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : cleanImages.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % cleanImages.length);
  };

  return (
    <div
      className={`relative overflow-hidden group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Images Slider Track */}
      <div
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {cleanImages.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`${alt} ${idx + 1}`}
            className={`flex-shrink-0 w-full h-full ${imageClassName}`}
          />
        ))}
      </div>

      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Navigation Arrows */}
      {showArrows && cleanImages.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-pink-500 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-md border border-white/20 cursor-pointer"
            title="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-pink-500 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-md border border-white/20 cursor-pointer"
            title="Next image"
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
