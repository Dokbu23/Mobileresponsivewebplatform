import { useState } from 'react';
import { X, MapPin, Calendar, Clock, Users, Hotel, Star, Navigation, Package, ExternalLink, Phone, Mail, Play } from 'lucide-react';
import { Link } from 'react-router';
import { VirtualTourModal } from './VirtualTourModal';

export type DetailModalType = 'attraction' | 'event' | 'product' | 'accommodation';

export interface DetailModalItem {
  id: string;
  type: DetailModalType;
  name: string;
  image?: string;
  description?: string;
  fullDescription?: string;
  category?: string;
  location?: string;
  contact_number?: string;
  phone?: string;
  email?: string;
  facebook_link?: string;
  facebook?: string;
  instagram_link?: string;
  instagram?: string;
  video?: string;
  // Attraction-specific
  view_count?: number;
  // Event-specific
  date?: string;
  time?: string;
  capacity?: string;
  // Product-specific
  price?: number;
  stock?: number;
  // Accommodation-specific
  pricePerNight?: number;
  user_id?: string | number;
  is_registered?: boolean;
}

interface DetailModalProps {
  item: DetailModalItem | null;
  onClose: () => void;
}

function isPastEvent(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function DetailModal({ item, onClose }: DetailModalProps) {
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Image Header ── */}
        <div className="relative">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-72 object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Package className="h-20 w-20 text-primary/30" />
            </div>
          )}

          {/* Past event badge */}
          {item.type === 'event' && isPastEvent(item.date) && (
            <div className="absolute top-3 left-3 bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
              Past Event
            </div>
          )}

          {/* Out of stock badge */}
          {item.type === 'product' && item.stock !== undefined && item.stock <= 0 && (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
              Out of Stock
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="p-6 space-y-4">

          {/* Title + category */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{item.name}</h2>
            {item.category && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                {item.category}
              </span>
            )}
          </div>

          {/* ── ATTRACTION info ── */}
          {item.type === 'attraction' && (
            <>
              {item.location && (
                <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{item.location}</p>
                  </div>
                </div>
              )}
              {(item.fullDescription || item.description) && (
                <div>
                  <h4 className="font-semibold mb-2">About this Attraction</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.fullDescription || item.description}
                  </p>
                </div>
              )}
              {item.location && (
                <div className="bg-primary/5 p-3 rounded-lg">
                  <p className="text-sm flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
                    <span><strong>How to get there:</strong> {item.location}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── EVENT info ── */}
          {item.type === 'event' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {item.date && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {item.time && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">{item.time}</p>
                    </div>
                  </div>
                )}
                {item.location && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{item.location}</p>
                    </div>
                  </div>
                )}
              </div>
              {item.capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Capacity: <strong>{item.capacity}</strong></span>
                </div>
              )}
              {(item.fullDescription || item.description) && (
                <div>
                  <h4 className="font-semibold mb-2">About this Event</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.fullDescription || item.description}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── PRODUCT info ── */}
          {item.type === 'product' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    ₱{Number(item.price ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              {item.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              )}
            </>
          )}

          {/* ── ACCOMMODATION info ── */}
          {item.type === 'accommodation' && (
            <>
              <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Resort & Accommodation</p>
                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">4.8</span>
                </div>
              </div>

              {item.location && (
                <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{item.location}</p>
                  </div>
                </div>
              )}

              {item.description && (
                <div>
                  <h4 className="font-semibold mb-2">About this Accommodation</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                {item.user_id && item.is_registered && (
                  <Link
                    to={`/business/resort/${item.user_id}`}
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Business Page
                  </Link>
                )}
              </div>
            </>
          )}

          {/* ── Virtual Tour Box ── */}
          <div className="bg-pink-50/50 dark:bg-slate-800/60 p-4 rounded-2xl border border-pink-100 dark:border-slate-700/60 text-center space-y-2.5 my-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400">
              <Play className="h-4 w-4 fill-pink-500 text-pink-500" />
              <span>Virtual Tour Available</span>
            </div>
            <button
              onClick={() => setIsVirtualTourOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Virtual Tour</span>
            </button>
          </div>

          {/* ── Contact & Connect Section ── */}
          {(() => {
            const phoneNum = item.contact_number || item.phone || '0917-123-4567';
            const fbUrl = item.facebook_link || item.facebook || 'https://facebook.com/DiscoverMansalayOfficial';
            const igUrl = item.instagram_link || item.instagram || 'https://instagram.com/discover_mansalay';

            return (
              <div className="border-t border-gray-100 dark:border-slate-800 pt-5 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-pink-500" />
                    <span>Contact & Connect</span>
                  </h4>
                  <span className="text-[10px] text-pink-500 font-bold bg-pink-50 dark:bg-pink-500/10 px-2 py-0.5 rounded-full">Direct Inquiry</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Direct Phone Call Button */}
                  <a
                    href={`tel:${phoneNum.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all text-center"
                    title={`Call ${phoneNum}`}
                  >
                    <Phone className="h-4 w-4 fill-white flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-[9px] uppercase opacity-80 leading-none">Call Phone</div>
                      <div className="text-xs font-bold leading-tight line-clamp-1">{phoneNum}</div>
                    </div>
                  </a>

                  {/* Facebook Link Button */}
                  <a
                    href={fbUrl.startsWith('http') ? fbUrl : `https://${fbUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all text-center"
                    title="Open Facebook Page"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-[9px] uppercase opacity-80 leading-none">Facebook</div>
                      <div className="text-xs font-bold leading-tight">Visit Page</div>
                    </div>
                  </a>

                  {/* Instagram Link Button */}
                  <a
                    href={igUrl.startsWith('http') ? igUrl : `https://${igUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-90 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md shadow-pink-500/20 transition-all text-center"
                    title="Open Instagram Profile"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-[9px] uppercase opacity-80 leading-none">Instagram</div>
                      <div className="text-xs font-bold leading-tight">Visit Profile</div>
                    </div>
                  </a>
                </div>

                {item.email && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60 mt-2">
                    <Mail className="h-4 w-4 text-pink-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase">Email Address</p>
                      <a href={`mailto:${item.email}`} className="text-xs font-semibold text-gray-800 dark:text-slate-200 hover:text-pink-600 truncate block">
                        {item.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* ── Virtual Tour Video Modal ── */}
      {isVirtualTourOpen && (
        <VirtualTourModal
          isOpen={isVirtualTourOpen}
          onClose={() => setIsVirtualTourOpen(false)}
          attractionName={item.name}
          category={item.category || 'Virtual Tour'}
          mainImage={item.image}
          videoUrl={item.video || (item as any).video_url || (item as any).virtual_tour_video}
          phone={item.contact_number || item.phone}
          facebook={item.facebook_link || item.facebook}
          instagram={item.instagram_link || item.instagram}
        />
      )}
    </div>
  );
}
