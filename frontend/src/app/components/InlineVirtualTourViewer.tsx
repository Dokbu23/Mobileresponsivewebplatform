import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass,
  RotateCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  Sparkles,
  Layers,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { Tour360Scene } from './VirtualTourModal';

interface InlineVirtualTourViewerProps {
  scenes: Tour360Scene[];
  businessName: string;
  businessType?: 'resort' | 'enterprise';
  initialSceneId?: string;
  onOpenFullscreen?: () => void;
}

export function InlineVirtualTourViewer({
  scenes,
  businessName,
  businessType = 'resort',
  initialSceneId,
  onOpenFullscreen,
}: InlineVirtualTourViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pannellumInstanceRef = useRef<any>(null);

  const [activeSceneId, setActiveSceneId] = useState<string>(
    initialSceneId || (scenes.length > 0 ? scenes[0].id : '')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  // Helper to load Pannellum dynamically
  const loadPannellum = useCallback((): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).pannellum) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      if (!document.getElementById('pannellum-css')) {
        const link = document.createElement('link');
        link.id = 'pannellum-css';
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
        link.referrerPolicy = 'no-referrer';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('pannellum-custom-walk-style')) {
        const style = document.createElement('style');
        style.id = 'pannellum-custom-walk-style';
        style.innerHTML = `
          .pnlm-hotspot-base.pnlm-scene {
            width: 50px !important;
            height: 50px !important;
            margin-left: -25px !important;
            margin-top: -25px !important;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.9) 65%, rgba(4, 120, 87, 0.75) 100%) !important;
            border: 3px solid #ffffff !important;
            border-radius: 50% !important;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.95), 0 0 45px rgba(16, 185, 129, 0.6) !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            animation: pnlmWalkPulse 2s infinite ease-in-out !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .pnlm-hotspot-base.pnlm-scene::after {
            content: '➔' !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #ffffff !important;
            font-size: 24px !important;
            font-weight: 900 !important;
            line-height: 1 !important;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
            transform: translateY(-1px) !important;
          }
          .pnlm-hotspot-base.pnlm-scene:hover {
            transform: scale(1.3) !important;
            background: radial-gradient(circle, rgba(236, 72, 153, 0.98) 0%, rgba(219, 39, 119, 0.92) 65%, rgba(190, 24, 93, 0.75) 100%) !important;
            border-color: #ffffff !important;
            box-shadow: 0 0 35px rgba(236, 72, 153, 0.95), 0 0 55px rgba(236, 72, 153, 0.7) !important;
          }
          .pnlm-hotspot-base.pnlm-scene .pnlm-tooltip span {
            background-color: rgba(15, 23, 42, 0.92) !important;
            backdrop-filter: blur(10px) !important;
            color: #ffffff !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 6px 12px !important;
            border-radius: 9999px !important;
            border: 1.5px solid rgba(255, 255, 255, 0.25) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
            white-space: nowrap !important;
            letter-spacing: 0.02em !important;
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
          .pnlm-container, .pnlm-container canvas, .pnlm-container img {
            filter: none !important;
            color-scheme: light !important;
          }
        `;
        document.head.appendChild(style);
      }

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

  // Initialize Pannellum viewer
  useEffect(() => {
    if (!scenes || scenes.length === 0) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    loadPannellum()
      .then(() => {
        if (!isMounted || !containerRef.current || !(window as any).pannellum) return;

        if (pannellumInstanceRef.current) {
          try {
            pannellumInstanceRef.current.destroy();
          } catch {}
          pannellumInstanceRef.current = null;
        }

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

        const viewer = (window as any).pannellum.viewer(containerRef.current, {
          default: {
            firstScene: initialScene,
            sceneFadeDuration: 800,
            autoLoad: true,
            autoRotate: isAutoRotating ? -2 : 0,
            compass: true,
          },
          scenes: scenesConfig,
        });

        pannellumInstanceRef.current = viewer;
        setIsLoading(false);

        viewer.on('scenechange', (newSceneId: string) => {
          if (isMounted) {
            setActiveSceneId(newSceneId);
          }
        });
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load 360 viewer.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (pannellumInstanceRef.current) {
        try {
          pannellumInstanceRef.current.destroy();
        } catch {}
        pannellumInstanceRef.current = null;
      }
    };
  }, [scenes, loadPannellum]);

  // Handle scene change from pill buttons
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    if (pannellumInstanceRef.current) {
      pannellumInstanceRef.current.loadScene(sceneId);
    }
  };

  const currentSceneIndex = scenes.findIndex((s) => s.id === activeSceneId);
  const safeIndex = currentSceneIndex >= 0 ? currentSceneIndex : 0;
  const prevScene = scenes.length > 0 ? scenes[(safeIndex - 1 + scenes.length) % scenes.length] : null;
  const nextScene = scenes.length > 0 ? scenes[(safeIndex + 1) % scenes.length] : null;

  const handleNextScene = useCallback(() => {
    if (scenes.length <= 1) return;
    const nextIdx = (safeIndex + 1) % scenes.length;
    handleSelectScene(scenes[nextIdx].id);
  }, [safeIndex, scenes]);

  const handlePrevScene = useCallback(() => {
    if (scenes.length <= 1) return;
    const prevIdx = (safeIndex - 1 + scenes.length) % scenes.length;
    handleSelectScene(scenes[prevIdx].id);
  }, [safeIndex, scenes]);

  // Keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        handleNextScene();
      } else if (e.key === 'ArrowLeft') {
        handlePrevScene();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextScene, handlePrevScene]);

  // Toggle auto rotate
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

  // Handle zoom in/out
  const handleZoom = (delta: number) => {
    if (!pannellumInstanceRef.current) return;
    try {
      const currentHfov = pannellumInstanceRef.current.getHfov();
      const newHfov = Math.max(50, Math.min(120, currentHfov + delta));
      pannellumInstanceRef.current.setHfov(newHfov);
    } catch {}
  };

  // Toggle container fullscreen
  const toggleFullscreen = () => {
    if (onOpenFullscreen) {
      onOpenFullscreen();
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 🧭 Main Interactive 360° Panorama Container */}
      <div className="relative rounded-3xl overflow-hidden bg-gray-950 shadow-xl border border-gray-100 group">
        {/* Pannellum DOM mount container */}
        <div
          ref={containerRef}
          className="w-full h-[440px] sm:h-[520px] md:h-[580px] bg-gray-950 cursor-grab active:cursor-grabbing select-none"
          style={{ minHeight: '440px' }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 text-white space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 animate-pulse">
              <Compass className="h-7 w-7 text-white animate-spin" />
            </div>
            <p className="text-sm font-bold tracking-wide">Loading 360° Walkthrough...</p>
            <p className="text-xs text-gray-400">Preparing high-resolution panoramic area</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center z-20 text-white p-6 text-center space-y-2">
            <Compass className="h-10 w-10 text-rose-400" />
            <p className="text-sm font-bold text-rose-300">360° View Error</p>
            <p className="text-xs text-gray-400 max-w-sm">{error}</p>
          </div>
        )}

        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          {/* Active Scene Badge */}
          <div className="flex items-center gap-2 bg-black/65 hover:bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-bold border border-white/15 shadow-md pointer-events-auto transition-all">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{currentScene?.title || '360° Panoramic View'}</span>
          </div>

          {/* Quick Viewer Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={toggleAutoRotate}
              className={`p-2 rounded-xl backdrop-blur-md border border-white/15 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md ${
                isAutoRotating ? 'bg-pink-600 text-white shadow-pink-500/30' : 'bg-black/60 hover:bg-black/80 text-white'
              }`}
              title={isAutoRotating ? 'Pause Auto-Rotate' : 'Start Auto-Rotate'}
            >
              <RotateCw className={`h-4 w-4 ${isAutoRotating ? 'animate-spin-slow' : ''}`} />
              <span className="hidden sm:inline text-[11px]">{isAutoRotating ? 'Rotating' : 'Rotate'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleZoom(-15)}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-md"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleZoom(15)}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-md"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/60 hover:bg-pink-600 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-md"
              title="Fullscreen 360 View"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ⬅️ PREVIOUS SCENE ARROW BUTTON */}
        {scenes.length > 1 && (
          <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={handlePrevScene}
              className="group relative flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-black/60 hover:bg-pink-600 text-white backdrop-blur-xl border border-white/20 hover:border-pink-300 shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              title={`Previous: ${prevScene?.title || 'Previous Area'}`}
              aria-label="Previous 360 scene"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 transition-transform group-hover:-translate-x-1" />
              {/* Tooltip hint on hover */}
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-gray-950/95 backdrop-blur-md text-white text-xs font-bold border border-white/15 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none -translate-x-2 group-hover:translate-x-0 hidden sm:flex items-center gap-1.5">
                <span className="text-gray-400 font-normal">Prev:</span>
                <span>{prevScene?.title}</span>
              </div>
            </button>
          </div>
        )}

        {/* ➡️ NEXT SCENE ARROW BUTTON */}
        {scenes.length > 1 && (
          <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={handleNextScene}
              className="group relative flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-pink-600/90 hover:bg-pink-600 text-white backdrop-blur-xl border border-pink-400/80 hover:border-white shadow-2xl shadow-pink-500/40 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              title={`Next: ${nextScene?.title || 'Next Area'}`}
              aria-label="Next 360 scene"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-1" />
              {/* Tooltip hint on hover */}
              <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-gray-950/95 backdrop-blur-md text-white text-xs font-bold border border-white/15 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-x-2 group-hover:translate-x-0 hidden sm:flex items-center gap-1.5">
                <span>{nextScene?.title}</span>
                <span className="text-pink-400 font-extrabold">Next ➔</span>
              </div>
            </button>
          </div>
        )}

        {/* Bottom Helper Instruction Badge & Quick Next Area Pill */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white/90 text-[11px] border border-white/10 font-medium">
            <Navigation className="h-3.5 w-3.5 text-emerald-400" />
            <span>Click & drag to pan • Click arrows (◀ / ▶) to walk to next 360° spot</span>
          </div>

          {scenes.length > 1 && (
            <button
              type="button"
              onClick={handleNextScene}
              className="pointer-events-auto ml-auto mr-16 sm:mr-20 flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-pink-500/30 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={`Next spot: ${nextScene?.title}`}
            >
              <span>Next Area</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 📍 Scene Navigation Selector Strip */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-pink-500" />
            <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider">
              Walkthrough Areas & Spots ({scenes.length})
            </h3>
          </div>
          {scenes.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevScene}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                title="Previous Spot"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextScene}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                title="Next Spot"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {scenes.map((scene, idx) => {
            const isCurrent = scene.id === activeSceneId;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSelectScene(scene.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer border ${
                  isCurrent
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-600 shadow-md shadow-pink-500/20 scale-[1.02]'
                    : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200 hover:border-pink-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                  isCurrent ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}>
                  {idx + 1}
                </div>
                <div className="text-left">
                  <div className="truncate max-w-[140px] sm:max-w-[180px]">{scene.title}</div>
                  {scene.subtitle && (
                    <div className={`text-[10px] font-normal truncate max-w-[140px] sm:max-w-[180px] ${
                      isCurrent ? 'text-white/80' : 'text-gray-400'
                    }`}>
                      {scene.subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
