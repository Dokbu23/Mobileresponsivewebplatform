import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Video,
  MapPin,
  Phone,
  ExternalLink,
  Compass,
  Maximize2,
  Minimize2,
  RotateCw,
  Navigation,
  Eye,
  Layers,
  Smartphone,
  Sparkles,
  Info,
  Footprints,
} from 'lucide-react';
import { API_BASE } from '../lib/api';
import { loadGoogleMapsAPI, checkStreetViewAvailability } from '../lib/googleMaps';

// Type definitions for Pannellum
declare global {
  interface Window {
    pannellum?: {
      viewer: (
        container: HTMLElement | string,
        config: Record<string, any>
      ) => PannellumViewerInstance;
    };
    google?: any;
  }
}

interface PannellumViewerInstance {
  destroy: () => void;
  loadScene: (sceneId: string, pitch?: number, yaw?: number, hfov?: number) => void;
  getScene: () => string;
  setPitch: (pitch: number) => void;
  getPitch: () => number;
  setYaw: (yaw: number) => void;
  getYaw: () => number;
  setHfov: (hfov: number) => void;
  getHfov: () => number;
  startAutoRotate: (speed?: number) => void;
  stopAutoRotate: () => void;
  startOrientation: () => void;
  stopOrientation: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

export interface Tour360Hotspot {
  pitch: number;
  yaw: number;
  text: string;
  type?: 'scene' | 'info';
  targetSceneId?: string;
  targetPitch?: number;
  targetYaw?: number;
}

export interface Tour360Scene {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  panoramaUrl: string;
  hotSpots?: Tour360Hotspot[];
}

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
  lat?: number;
  lng?: number;
  coords?: [number, number];
  customScenes?: Tour360Scene[];
}

// Curated 360 Equirectangular Panoramas of Mansalay vibe (Beach, Coastal Resort, Pavilion, Poolside)
const DEFAULT_MANSALAY_360_SCENES: Tour360Scene[] = [
  {
    id: 'entrance',
    title: 'Welcome Gate & Boardwalk',
    subtitle: 'Main Entrance & Scenic Approach',
    panoramaUrl: 'https://pannellum.org/images/alma.jpg',
    hotSpots: [
      {
        pitch: -3,
        yaw: 110,
        text: 'Walk to Resort Lobby & Lounge ➡️',
        type: 'scene',
        targetSceneId: 'lobby',
        targetPitch: 0,
        targetYaw: 0,
      },
      {
        pitch: 5,
        yaw: 30,
        text: 'Welcome to Mansalay Eco-Tourism Destination',
        type: 'info',
      },
    ],
  },
  {
    id: 'lobby',
    title: 'Resort Lobby & Veranda',
    subtitle: 'Guest Reception & Dining Area',
    panoramaUrl: 'https://pannellum.org/images/bma-0.jpg',
    hotSpots: [
      {
        pitch: -5,
        yaw: -175,
        text: '⬅️ Back to Welcome Gate',
        type: 'scene',
        targetSceneId: 'entrance',
        targetPitch: -3,
        targetYaw: -70,
      },
      {
        pitch: -4,
        yaw: 20,
        text: 'Walk to Poolside Deck & Tropical Garden 🏊',
        type: 'scene',
        targetSceneId: 'pool',
        targetPitch: -2,
        targetYaw: 0,
      },
      {
        pitch: 2,
        yaw: -45,
        text: 'Reception & Information Desk',
        type: 'info',
      },
    ],
  },
  {
    id: 'pool',
    title: 'Poolside Deck & Garden',
    subtitle: 'Relaxation Deck with Palm Trees',
    panoramaUrl: 'https://pannellum.org/images/jfk.jpg',
    hotSpots: [
      {
        pitch: -5,
        yaw: -170,
        text: '⬅️ Return to Lobby & Lounge',
        type: 'scene',
        targetSceneId: 'lobby',
        targetPitch: 0,
        targetYaw: -160,
      },
      {
        pitch: -3,
        yaw: 35,
        text: 'Walk to White Sand Beachfront 🏖️',
        type: 'scene',
        targetSceneId: 'beach',
        targetPitch: 0,
        targetYaw: 0,
      },
      {
        pitch: 1,
        yaw: -80,
        text: 'Freshwater Infinity Pool & Sunbeds',
        type: 'info',
      },
    ],
  },
  {
    id: 'beach',
    title: 'Beach Front & Mansalay Bay',
    subtitle: 'Pristine Shoreline & Ocean Breeze',
    panoramaUrl: 'https://pannellum.org/images/cerro-toco-0.jpg',
    hotSpots: [
      {
        pitch: -4,
        yaw: -180,
        text: '⬅️ Return to Poolside Garden',
        type: 'scene',
        targetSceneId: 'pool',
        targetPitch: -2,
        targetYaw: -145,
      },
      {
        pitch: 6,
        yaw: 45,
        text: 'Mansalay Marine Sanctuary & Coral View',
        type: 'info',
      },
    ],
  },
];

type ModalTab = '360' | 'streetview' | 'video';

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
  lat,
  lng,
  coords,
  customScenes,
}: VirtualTourModalProps) {
  // Determine effective coordinates
  const effectiveLat = lat ?? coords?.[0] ?? 12.5311;
  const effectiveLng = lng ?? coords?.[1] ?? 121.4394;
  const hasVideo = Boolean(videoUrl && String(videoUrl).trim() !== '');

  // UI state
  const [activeTab, setActiveTab] = useState<ModalTab>('360');
  const [activeSceneId, setActiveSceneId] = useState<string>('entrance');
  const [isPannellumLoaded, setIsPannellumLoaded] = useState<boolean>(false);
  const [isPannellumLoading, setIsPannellumLoading] = useState<boolean>(true);
  const [pannellumError, setPannellumError] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Street View state
  const [isStreetViewChecking, setIsStreetViewChecking] = useState<boolean>(false);
  const [streetViewAvailable, setStreetViewAvailable] = useState<boolean | null>(null);
  const [streetViewPanoId, setStreetViewPanoId] = useState<string | null>(null);

  // DOM Refs
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const streetViewContainerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const pannellumInstanceRef = useRef<PannellumViewerInstance | null>(null);

  const scenes: Tour360Scene[] = useMemo(() => {
    if (customScenes && customScenes.length > 0) return customScenes;
    try {
      const saved = localStorage.getItem('discover-mansalay:active_resort_360_scenes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((slot: any, index: number) => {
            const hotSpots: any[] = [];
            if (index < parsed.length - 1) {
              const next = parsed[index + 1];
              hotSpots.push({
                pitch: -4,
                yaw: 20,
                text: `Walk to ${next.title} ➡️`,
                type: 'scene',
                targetSceneId: next.id,
                targetPitch: 0,
                targetYaw: 0,
              });
            }
            if (index > 0) {
              const prev = parsed[index - 1];
              hotSpots.push({
                pitch: -5,
                yaw: -160,
                text: `⬅️ Return to ${prev.title}`,
                type: 'scene',
                targetSceneId: prev.id,
                targetPitch: 0,
                targetYaw: 0,
              });
            }
            return {
              id: slot.id,
              title: slot.title,
              subtitle: slot.subtitle,
              panoramaUrl: slot.imageUrl,
              hotSpots,
            };
          });
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_MANSALAY_360_SCENES;
  }, [customScenes]);
  const currentScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  // Helper to load Pannellum dynamically
  const loadPannellum = useCallback((): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).pannellum) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // 1. Inject Pannellum CSS
      if (!document.getElementById('pannellum-css')) {
        const link = document.createElement('link');
        link.id = 'pannellum-css';
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
        link.referrerPolicy = 'no-referrer';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);
      }

      // Inject custom styling for pulsating walking navigation arrows
      if (!document.getElementById('pannellum-custom-walk-style')) {
        const style = document.createElement('style');
        style.id = 'pannellum-custom-walk-style';
        style.innerHTML = `
          /* Custom 360 Walking Hotspots */
          .pnlm-hotspot-base.pnlm-scene {
            width: 44px !important;
            height: 44px !important;
            margin-left: -22px !important;
            margin-top: -22px !important;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.85) 60%, rgba(4, 120, 87, 0.5) 100%) !important;
            border: 2.5px solid #ffffff !important;
            border-radius: 50% !important;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.9), 0 0 35px rgba(16, 185, 129, 0.5) !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            animation: pnlmWalkPulse 2s infinite ease-in-out !important;
          }
          .pnlm-hotspot-base.pnlm-scene:hover {
            transform: scale(1.25) !important;
            background: radial-gradient(circle, rgba(236, 72, 153, 0.95) 0%, rgba(219, 39, 119, 0.9) 60%, rgba(190, 24, 93, 0.5) 100%) !important;
            border-color: #fdf2f8 !important;
            box-shadow: 0 0 25px rgba(236, 72, 153, 0.9), 0 0 45px rgba(236, 72, 153, 0.6) !important;
          }
          .pnlm-hotspot-base.pnlm-scene .pnlm-tooltip span {
            background-color: rgba(15, 23, 42, 0.9) !important;
            backdrop-filter: blur(8px) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 5px 10px !important;
            border-radius: 9999px !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
            white-space: nowrap !important;
          }
          .pnlm-hotspot-base.pnlm-info {
            width: 32px !important;
            height: 32px !important;
            margin-left: -16px !important;
            margin-top: -16px !important;
            background: rgba(59, 130, 246, 0.9) !important;
            border: 2px solid #ffffff !important;
            border-radius: 50% !important;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.7) !important;
          }
          .pnlm-hotspot-base.pnlm-info .pnlm-tooltip span {
            background-color: rgba(15, 23, 42, 0.9) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            padding: 4px 8px !important;
            border-radius: 8px !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
          }
          @keyframes pnlmWalkPulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); }
            70% { transform: scale(1.08); box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
          .pnlm-controls-container {
            border-radius: 12px !important;
            overflow: hidden !important;
          }
          /* Prevent browser dark mode extensions (Dark Reader / Force Dark) from inverting colors */
          .gm-style, .gm-style canvas, .gm-style img, .gm-style div,
          .pnlm-container, .pnlm-container canvas, .pnlm-container img {
            filter: none !important;
            color-scheme: light !important;
          }
        `;
        document.head.appendChild(style);
      }

      // 2. Inject Pannellum JS
      if ((window as any).pannellum) {
        resolve();
        return;
      }

      const existingScript = document.getElementById('pannellum-js') as HTMLScriptElement | null;
      if (existingScript) {
        if ((window as any).pannellum) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load 360 viewer engine.')), { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'pannellum-js';
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load 360 viewer engine.'));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Pannellum when tab is '360' and modal is open
  useEffect(() => {
    if (!isOpen || activeTab !== '360') return;

    let isMounted = true;
    setIsPannellumLoading(true);
    setPannellumError(null);

    loadPannellum()
      .then(() => {
        if (!isMounted || !viewerContainerRef.current || !window.pannellum) return;

        // Destroy previous instance if any
        if (pannellumInstanceRef.current) {
          try {
            pannellumInstanceRef.current.destroy();
          } catch {
            // ignore
          }
          pannellumInstanceRef.current = null;
        }

        // Prepare multi-scene configuration
        const scenesConfig: Record<string, any> = {};
        scenes.forEach((s) => {
          scenesConfig[s.id] = {
            title: s.title,
            type: 'equirectangular',
            panorama: s.panoramaUrl,
            hfov: 110,
            pitch: -2,
            yaw: 0,
            autoLoad: true,
            showZoomCtrl: false,
            showFullscreenCtrl: false,
            hotSpots: (s.hotSpots || []).map((h) => ({
              pitch: h.pitch,
              yaw: h.yaw,
              type: h.type || (h.targetSceneId ? 'scene' : 'info'),
              text: h.text,
              sceneId: h.targetSceneId,
              targetPitch: h.targetPitch ?? 0,
              targetYaw: h.targetYaw ?? 0,
            })),
          };
        });

        const initialScene = scenes.find((s) => s.id === activeSceneId)?.id || scenes[0].id;

        const viewer = window.pannellum.viewer(viewerContainerRef.current, {
          default: {
            firstScene: initialScene,
            sceneFadeDuration: 1000,
            autoLoad: true,
            compass: true,
          },
          scenes: scenesConfig,
        });

        pannellumInstanceRef.current = viewer;
        setIsPannellumLoaded(true);
        setIsPannellumLoading(false);

        // Listen for scene change (e.g., when user clicks a walking arrow)
        viewer.on('scenechange', (newSceneId: string) => {
          if (isMounted) {
            setActiveSceneId(newSceneId);
          }
        });
      })
      .catch((err) => {
        if (isMounted) {
          setPannellumError(err.message || 'Unable to load 360 viewer.');
          setIsPannellumLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (pannellumInstanceRef.current) {
        try {
          pannellumInstanceRef.current.destroy();
        } catch {
          // ignore
        }
        pannellumInstanceRef.current = null;
      }
    };
  }, [isOpen, activeTab, scenes, loadPannellum]);

  // Check Google Street View availability when modal opens or Street View tab clicked
  useEffect(() => {
    if (!isOpen || (activeTab !== 'streetview' && streetViewAvailable !== null)) return;

    let isMounted = true;
    setIsStreetViewChecking(true);

    checkStreetViewAvailability(effectiveLat, effectiveLng)
      .then((res) => {
        if (!isMounted) return;
        setStreetViewAvailable(res.available);
        if (res.panoId) setStreetViewPanoId(res.panoId);
        setIsStreetViewChecking(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setStreetViewAvailable(false);
        setIsStreetViewChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, effectiveLat, effectiveLng, streetViewAvailable]);

  // Mount Google Maps Street View when activeTab === 'streetview'
  useEffect(() => {
    if (!isOpen || activeTab !== 'streetview' || !streetViewContainerRef.current) return;

    let isMounted = true;

    loadGoogleMapsAPI()
      .then(() => {
        if (!isMounted || !streetViewContainerRef.current || typeof google === 'undefined') return;

        try {
          const panorama = new google.maps.StreetViewPanorama(streetViewContainerRef.current, {
            position: { lat: effectiveLat, lng: effectiveLng },
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
            addressControl: true,
            linksControl: true, // Clickable navigation arrows for walking along the road!
            panControl: true,
            enableCloseButton: false,
            motionTracking: true,
            motionTrackingControl: true,
          });

          if (streetViewPanoId) {
            panorama.setPano(streetViewPanoId);
          }
        } catch (err) {
          console.error('[Google Street View] Mount error:', err);
        }
      })
      .catch((err) => {
        console.warn('[Google Street View] SDK failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, effectiveLat, effectiveLng, streetViewPanoId]);

  // Scene navigation handler (when user clicks bottom scene thumbnails)
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    if (pannellumInstanceRef.current) {
      pannellumInstanceRef.current.loadScene(sceneId);
    }
  };

  // Toggle Auto Rotation
  const toggleAutoRotate = () => {
    if (!pannellumInstanceRef.current) return;
    if (isAutoRotating) {
      pannellumInstanceRef.current.stopAutoRotate();
      setIsAutoRotating(false);
    } else {
      pannellumInstanceRef.current.startAutoRotate(-2);
      setIsAutoRotating(true);
    }
  };

  // Toggle Gyroscope (Device Orientation)
  const toggleGyroscope = async () => {
    if (!pannellumInstanceRef.current) return;

    if (isGyroActive) {
      pannellumInstanceRef.current.stopOrientation();
      setIsGyroActive(false);
      return;
    }

    // Handle iOS 13+ DeviceOrientation permission request
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          pannellumInstanceRef.current.startOrientation();
          setIsGyroActive(true);
        }
      } catch (err) {
        console.warn('Gyroscope permission denied:', err);
      }
    } else {
      // Android or non-iOS standard
      pannellumInstanceRef.current.startOrientation();
      setIsGyroActive(true);
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (!pannellumInstanceRef.current) return;
    const currentHfov = pannellumInstanceRef.current.getHfov();
    const newHfov = Math.max(50, Math.min(120, currentHfov + delta));
    pannellumInstanceRef.current.setHfov(newHfov);
  };

  // Toggle Fullscreen on the modal container
  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // YouTube embed helper
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
    ? videoUrl!.startsWith('http') || videoUrl!.startsWith('/storage')
      ? videoUrl!.startsWith('http')
        ? videoUrl!
        : `${API_BASE}${videoUrl!}`
      : videoUrl!
    : '';
  const isYouTube = hasVideo && (videoUrl!.includes('youtube.com') || videoUrl!.includes('youtu.be'));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalContainerRef}
        className="bg-slate-950 border border-slate-800/80 rounded-3xl overflow-hidden max-w-5xl w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/90 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase rounded-full border border-emerald-500/30">
                  {category}
                </span>
                <h3 className="font-extrabold text-white text-sm sm:text-base md:text-lg tracking-tight line-clamp-1">
                  {attractionName}
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span>Mansalay, Oriental Mindoro</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer hidden sm:flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-900/60 border-b border-slate-800/80 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/70">
            <button
              onClick={() => setActiveTab('360')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === '360'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Footprints className="h-3.5 w-3.5" />
              <span>360° Walkthrough</span>
            </button>

            {streetViewAvailable && (
              <button
                onClick={() => setActiveTab('streetview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'streetview'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Google Street View</span>
              </button>
            )}

            {hasVideo && (
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Video Tour</span>
              </button>
            )}
          </div>

          {/* Quick Help Tip */}
          {activeTab === '360' && (
            <div className="hidden md:flex items-center gap-2 text-[11px] text-emerald-400/90 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Pindutin ang kumikislap na arrow para maglakad sa ibang lokasyon</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 bg-black overflow-hidden min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex items-center justify-center">
          {/* TAB 1: 360° Walkthrough (Pannellum) */}
          {activeTab === '360' && (
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex flex-col">
              {/* Pannellum Container */}
              <div
                ref={viewerContainerRef}
                className="w-full h-full flex-1"
                style={{ minHeight: '380px' }}
              />

              {/* Loading State */}
              {isPannellumLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-spin">
                    <Compass className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-white tracking-wide">
                    Loading 360° Walkthrough...
                  </p>
                  <p className="text-xs text-slate-400">Preparing high-definition panorama scenes</p>
                </div>
              )}

              {/* Error State */}
              {pannellumError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-3">
                    <Info className="h-7 w-7 text-rose-400" />
                  </div>
                  <h4 className="text-base font-extrabold text-white">360° View Unavailable</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{pannellumError}</p>
                  <button
                    onClick={() => setActiveTab('streetview')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs transition-colors"
                  >
                    Try Google Street View Instead
                  </button>
                </div>
              )}

              {/* Current Scene Badge & Directional Info (Top Left Overlay) */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800/90 shadow-xl flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Current Location
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      {currentScene.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating 360 Action Controls (Top Right Overlay) */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                {/* Auto Rotate */}
                <button
                  onClick={toggleAutoRotate}
                  className={`p-2.5 rounded-2xl border transition-all shadow-lg cursor-pointer ${
                    isAutoRotating
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                      : 'bg-slate-950/80 backdrop-blur-md text-slate-300 border-slate-800/80 hover:text-white hover:bg-slate-900'
                  }`}
                  title={isAutoRotating ? 'Stop Auto-Rotate' : 'Auto-Rotate 360°'}
                >
                  <RotateCw className={`h-4 w-4 ${isAutoRotating ? 'animate-spin' : ''}`} />
                </button>

                {/* Mobile Gyroscope / Motion */}
                <button
                  onClick={toggleGyroscope}
                  className={`p-2.5 rounded-2xl border transition-all shadow-lg cursor-pointer ${
                    isGyroActive
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/30'
                      : 'bg-slate-950/80 backdrop-blur-md text-slate-300 border-slate-800/80 hover:text-white hover:bg-slate-900'
                  }`}
                  title={isGyroActive ? 'Disable Phone Gyroscope' : 'Enable Phone Gyroscope (Move phone to look around)'}
                >
                  <Smartphone className="h-4 w-4" />
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => handleZoom(-15)}
                  className="p-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-800/80 hover:text-white hover:bg-slate-900 transition-all shadow-lg cursor-pointer font-bold text-xs"
                  title="Zoom In"
                >
                  +
                </button>

                {/* Zoom Out */}
                <button
                  onClick={() => handleZoom(15)}
                  className="p-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-800/80 hover:text-white hover:bg-slate-900 transition-all shadow-lg cursor-pointer font-bold text-xs"
                  title="Zoom Out"
                >
                  −
                </button>
              </div>

              {/* Bottom Scene Quick Navigation Bar */}
              <div className="absolute bottom-3 inset-x-3 z-20 flex flex-col items-center">
                <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/90 shadow-2xl flex items-center gap-1.5 max-w-full overflow-x-auto no-scrollbar">
                  {scenes.map((scene, idx) => {
                    const isActive = scene.id === activeSceneId;
                    return (
                      <button
                        key={scene.id}
                        onClick={() => handleSelectScene(scene.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{scene.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Google Maps Street View */}
          {activeTab === 'streetview' && (
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex flex-col">
              {/* Street View Canvas Container */}
              <div
                ref={streetViewContainerRef}
                className="w-full h-full flex-1"
                style={{ minHeight: '380px' }}
              />

              {/* Notice for Google Billing Account Requirement */}
              <div className="absolute top-3 inset-x-4 z-20 flex justify-center pointer-events-none">
                <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/40 shadow-xl flex items-center justify-between gap-3 pointer-events-auto max-w-lg w-full">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-[11px] text-slate-300 leading-tight">
                      <strong className="text-amber-400">Google Street View Notice:</strong> Nangangailangan ng Google Cloud Billing Account ang Street View API.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('360')}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[11px] rounded-lg shadow-md shadow-emerald-500/20 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                  >
                    <Footprints className="h-3 w-3" />
                    <span>360° Walk</span>
                  </button>
                </div>
              </div>

              {/* Checking Status Overlay */}
              {isStreetViewChecking && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center animate-spin">
                    <Navigation className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Checking Google Street View...</p>
                </div>
              )}

              {/* Graceful Fallback if Google Street View is not available on inland/private spot */}
              {streetViewAvailable === false && !isStreetViewChecking && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                    <Navigation className="h-7 w-7 text-amber-400" />
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white">
                    Google Street View Not Available on this Spot
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                    Ang <span className="text-emerald-400 font-semibold">{attractionName}</span> ay
                    isang pribadong resort o secluded area na hindi nadaraanan ng Google Street View car.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('360')}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Footprints className="h-4 w-4" />
                      <span>Lumipat sa 360° Walkthrough</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Video Tour */}
          {activeTab === 'video' && (
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] md:min-h-[520px] bg-black flex items-center justify-center">
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
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-3">
                    <Video className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-bold text-white">No Video Available</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Please use the 360° Walkthrough tab to explore.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Information & Contact Actions Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Eye className="h-3.5 w-3.5" />
              <span>Interactive 360° Virtual Tour</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-400">
              Pindutin ang arrow sa daan para maglakad
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <Phone className="h-3 w-3 fill-white" />
                <span>Call {phone}</span>
              </a>
            )}
            {facebook && (
              <a
                href={facebook.startsWith('http') ? facebook : `https://${facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Facebook</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
