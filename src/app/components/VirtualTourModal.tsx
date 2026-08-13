import React from 'react';
import { X, Play, Video, MapPin, Phone, ExternalLink } from 'lucide-react';
import { API_BASE } from '../lib/api';

interface VirtualTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  attractionName: string;
  category?: string;
  mainImage?: string;
  videoUrl?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
}

export function VirtualTourModal({
  isOpen,
  onClose,
  attractionName,
  category = 'Virtual Tour',
  mainImage,
  videoUrl,
  phone = '0917-123-4567',
  facebook = 'https://facebook.com/DiscoverMansalayOfficial',
  instagram = 'https://instagram.com/discover_mansalay',
}: VirtualTourModalProps) {
  if (!isOpen) return null;

  const hasVideo = Boolean(videoUrl && String(videoUrl).trim() !== '');

  // Helper to check if URL is YouTube
  const isYouTube = hasVideo && (videoUrl!.includes('youtube.com') || videoUrl!.includes('youtu.be'));

  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  const videoSrc = hasVideo
    ? (videoUrl!.startsWith('http') || videoUrl!.startsWith('/storage')
        ? (videoUrl!.startsWith('http') ? videoUrl! : `${API_BASE}${videoUrl!}`)
        : videoUrl!)
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Play className="h-4 w-4 fill-white text-white translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 font-bold text-[10px] uppercase rounded-full border border-pink-500/30">
                  {category}
                </span>
                <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight line-clamp-1">
                  {attractionName}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Virtual Video Tour</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Canvas / Screen */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {hasVideo ? (
            isYouTube ? (
              <iframe
                src={getYouTubeEmbedUrl(videoUrl!)}
                title={`Virtual Tour - ${attractionName}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video
                src={videoSrc}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            )
          ) : (
            /* Empty State: Video Not Available */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950">
              {mainImage ? (
                <div className="relative w-full h-full max-h-56 rounded-2xl overflow-hidden mb-4 border border-slate-800">
                  <img src={mainImage.startsWith('http') || mainImage.startsWith('/assets') ? mainImage : `${API_BASE}${mainImage}`} alt={attractionName} className="w-full h-full object-cover opacity-30" />
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-4">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center mb-3 border border-pink-500/30">
                      <Video className="h-7 w-7" />
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white">Virtual Tour Video Not Available</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                      The owner of <span className="text-pink-400 font-semibold">{attractionName}</span> has not uploaded a virtual tour video yet.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center mb-4 border border-pink-500/30">
                    <Video className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-extrabold text-white">Virtual Tour Video Not Available</h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                    The owner of <span className="text-pink-400 font-semibold">{attractionName}</span> has not uploaded a virtual tour video yet.
                  </p>
                </>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Phone className="h-3.5 w-3.5 fill-white" />
                  <span>Call {phone}</span>
                </a>
                <a
                  href={facebook.startsWith('http') ? facebook : `https://${facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0" />
            <span>Mansalay, Oriental Mindoro</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-extrabold rounded-full transition-colors ml-auto shadow-md shadow-pink-500/20 cursor-pointer"
          >
            Close Video
          </button>
        </div>
      </div>
    </div>
  );
}
