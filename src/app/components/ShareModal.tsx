import React, { useState } from 'react';
import { X, Share2, Copy, Check, Facebook, Send, Twitter, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  image?: string;
  category?: string;
  url?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  description = 'Check out this awesome place/product in Mansalay, Oriental Mindoro!',
  image,
  category,
  url,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(`Discover Mansalay: ${title}`);
  const encodedText = encodeURIComponent(`${title} - ${description.slice(0, 100)}...`);

  const shareLinks = [
    {
      name: 'Facebook',
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    },
    {
      name: 'Twitter / X',
      color: 'bg-black hover:bg-gray-800 text-white',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: 'WhatsApp',
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: 'Telegram',
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: 'Email',
      color: 'bg-gray-700 hover:bg-gray-800 text-white',
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: currentUrl,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden font-sans border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Share Content</h3>
              <p className="text-[11px] text-gray-500 font-medium">Spread the word on social media</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item Preview Box */}
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
          {image && (
            <img
              src={image}
              alt={title}
              className="w-16 h-16 object-cover rounded-xl border border-gray-200 flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            {category && (
              <span className="px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-[9px] font-bold uppercase tracking-wider">
                {category}
              </span>
            )}
            <h4 className="font-bold text-gray-900 text-xs truncate mt-0.5">{title}</h4>
            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Native Web Share Button (if available) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Share2 className="h-4 w-4" />
            <span>Share via Apps on Device</span>
          </button>
        )}

        {/* Social Share Grid */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Share directly to</p>
          <div className="grid grid-cols-5 gap-2">
            {shareLinks.map((platform) => {
              const Icon = platform.icon;
              return (
                <a
                  key={platform.name}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-gray-100 hover:border-pink-300 hover:shadow-xs transition-all text-center group"
                >
                  <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 truncate w-full">{platform.name}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Copy Link Input */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Or Copy Link</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 pl-3 rounded-2xl">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="bg-transparent text-xs text-gray-600 flex-1 outline-none truncate font-mono"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
