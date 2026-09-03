import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * Checks if the current date falls within the Philippine "Ber Months"
 * (September 1 to January 6 - Feast of the Three Kings)
 */
export function isBerMonths(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec
  const day = now.getDate();

  // September to December OR first 6 days of January
  return (month >= 8 && month <= 11) || (month === 0 && day <= 6);
}

// 4 Gentle, Non-Dizzying Snowflake Designs (Soft rounded crystals & fluffy snow)
function SnowflakeIcon({ type, size, color }: { type: number; size: number; color: string }) {
  switch (type % 4) {
    case 0:
      // Elegant 6-point crystal with soft rounded endpoints
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
          <circle cx="12" cy="12" r="1.8" fill={color} />
        </svg>
      );
    case 1:
      // Fluffy rounded snowball puff
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="7" fill={color} fillOpacity="0.85" />
          <circle cx="12" cy="12" r="9.5" fill={color} fillOpacity="0.25" />
        </svg>
      );
    case 2:
      // Classic symmetrical winter snowflake
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="5" y1="19" x2="19" y2="5" />
          <circle cx="12" cy="5" r="1.2" fill={color} />
          <circle cx="12" cy="19" r="1.2" fill={color} />
          <circle cx="5" cy="12" r="1.2" fill={color} />
          <circle cx="19" cy="12" r="1.2" fill={color} />
          <circle cx="12" cy="12" r="2" fill="#ffffff" />
        </svg>
      );
    case 3:
    default:
      // Soft glowing snow pearl
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5.5" fill="#ffffff" stroke={color} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.8" fill={color} />
        </svg>
      );
  }
}

interface SnowflakeItem {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  type: number;
  color: string;
  swayDuration: number;
}

const SNOWFLAKE_COLORS = [
  '#38bdf8', // crisp sky ice
  '#60a5fa', // soft winter blue
  '#818cf8', // calming indigo
  '#ec4899', // Mansalay holiday pink
  '#0284c7', // gentle cyan
  '#e0f2fe', // soft frosty white
];

export function ChristmasHolidayTheme() {
  const [active, setActive] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    const dismissed = sessionStorage.getItem('mansalay_holiday_banner_dismissed');
    return !dismissed;
  });

  useEffect(() => {
    const isHoliday = isBerMonths();
    setActive(isHoliday);
    if (isHoliday) {
      document.body.classList.add('holiday-theme-active');
    } else {
      document.body.classList.remove('holiday-theme-active');
    }
    return () => {
      document.body.classList.remove('holiday-theme-active');
    };
  }, []);

  // Generate 22 gentle, non-dizzying snowflakes
  const snowflakes: SnowflakeItem[] = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 96 + 2,
      size: Math.floor(Math.random() * 8) + 14, // 14px to 22px
      duration: Math.random() * 8 + 14, // 14s to 22s (very slow and calming)
      delay: Math.random() * 10,
      opacity: Math.random() * 0.35 + 0.45,
      type: i % 4,
      color: SNOWFLAKE_COLORS[i % SNOWFLAKE_COLORS.length],
      swayDuration: Math.random() * 3 + 5, // 5s to 8s slow gentle sway
    }));
  }, []);

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('mansalay_holiday_banner_dismissed', 'true');
  };

  if (!active) return null;

  return (
    <>
      {/* ── 1. FESTIVE TOP HOLIDAY GREETINGS BANNER ── */}
      {showBanner && (
        <div className="relative z-50 bg-gradient-to-r from-red-600 via-pink-600 to-emerald-700 text-white text-xs font-semibold py-2 px-4 shadow-md flex items-center justify-between transition-all duration-300">
          <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
            <span className="text-base animate-bounce">🎄</span>
            <span className="tracking-wide font-bold drop-shadow">
              Maligayang Pasko at Masaganang Bagong Taon, Mansalay!
            </span>
            <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse hidden sm:inline" />
            <span className="text-base">✨</span>
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors ml-2"
            title="Close"
            aria-label="Close holiday banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. FESTIVE FAIRY LIGHTS STRING ACROSS TOP ── */}
      <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-around items-start h-5 overflow-hidden select-none">
        {Array.from({ length: 24 }).map((_, idx) => {
          const colors = [
            'bg-red-500 shadow-red-500/80',
            'bg-yellow-400 shadow-yellow-400/80',
            'bg-emerald-500 shadow-emerald-500/80',
            'bg-sky-400 shadow-sky-400/80',
            'bg-pink-500 shadow-pink-500/80',
          ];
          const color = colors[idx % colors.length];
          return (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-0.5 h-2 bg-gray-700" />
              <div
                className={`w-2 h-2.5 rounded-full ${color} shadow-[0_0_8px] animate-pulse`}
                style={{
                  animationDuration: `${1.2 + (idx % 5) * 0.3}s`,
                  animationDelay: `${(idx % 4) * 0.25}s`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── 3. VISIBLE DESIGNED CRYSTAL SNOWFLAKES (POINTER-EVENTS-NONE) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
        aria-hidden="true"
      >
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute transition-transform will-change-transform"
            style={{
              left: `${flake.left}%`,
              top: '-35px',
              opacity: flake.opacity,
              animation: `snowFall ${flake.duration}s linear infinite, snowSway ${flake.swayDuration}s ease-in-out infinite`,
              animationDelay: `${flake.delay}s, ${flake.delay * 0.3}s`,
              filter: 'drop-shadow(0 2px 4px rgba(2, 132, 199, 0.3))',
            }}
          >
            <SnowflakeIcon type={flake.type} size={flake.size} color={flake.color} />
          </div>
        ))}
      </div>

      {/* ── 4. GLOBAL CHRISTMAS CARD & BUTTON STYLES ── */}
      <style>{`
        @keyframes snowFall {
          0% {
            transform: translateY(-40px);
          }
          100% {
            transform: translateY(105vh);
          }
        }
        @keyframes snowSway {
          0% {
            transform: translateX(-15px) rotate(-6deg);
          }
          50% {
            transform: translateX(15px) rotate(6deg);
          }
          100% {
            transform: translateX(-15px) rotate(-6deg);
          }
        }

        /* ── CARD CHRISTMAS DESIGN: SNOW SURROUNDING THE CARDS (PAIKOT NA WAVY SNOW SA MARGIN) ── */
        body.holiday-theme-active div.group.rounded-2xl,
        body.holiday-theme-active div.group.rounded-3xl,
        body.holiday-theme-active div.group.rounded-xl {
          position: relative;
          overflow: visible !important;
          border: none !important;
          outline: none !important;
          box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.08) !important;
          transition: all 0.3s ease;
        }

        /* Preserve clean rounded corners on card inner contents */
        body.holiday-theme-active div.group.rounded-2xl > div:first-child,
        body.holiday-theme-active div.group.rounded-3xl > div:first-child,
        body.holiday-theme-active div.group.rounded-xl > div:first-child {
          border-top-left-radius: 1.25rem;
          border-top-right-radius: 1.25rem;
          overflow: hidden;
        }

        body.holiday-theme-active div.group.rounded-2xl > div:last-child,
        body.holiday-theme-active div.group.rounded-3xl > div:last-child,
        body.holiday-theme-active div.group.rounded-xl > div:last-child {
          border-bottom-left-radius: 1.25rem;
          border-bottom-right-radius: 1.25rem;
        }

        /* Continuous Wavy Snow Border All Around Margin (Top, Bottom, Left, Right) */
        body.holiday-theme-active div.group.rounded-2xl::before,
        body.holiday-theme-active div.group.rounded-3xl::before,
        body.holiday-theme-active div.group.rounded-xl::before {
          content: '';
          position: absolute;
          inset: -7px;
          background-image: 
            /* 1. Top Wavy Snow Margin */
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 14'%3E%3Cpath d='M0,14 Q6,2 12,6 Q18,0 24,7 Q30,1 36,6 Q42,0 48,7 Q54,1 60,14 Z' fill='%23ffffff'/%3E%3Cpath d='M0,14 Q6,4 12,8 Q18,2 24,9 Q30,3 36,8 Q42,2 48,9 Q54,3 60,14 Z' fill='%23bae6fd' opacity='0.8'/%3E%3C/svg%3E"),
            /* 2. Bottom Wavy Snow Margin */
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 14'%3E%3Cpath d='M0,0 Q6,12 12,8 Q18,14 24,7 Q30,13 36,8 Q42,14 48,7 Q54,13 60,0 Z' fill='%23ffffff'/%3E%3Cpath d='M0,0 Q6,10 12,6 Q18,12 24,5 Q30,11 36,6 Q42,12 48,5 Q54,11 60,0 Z' fill='%23bae6fd' opacity='0.8'/%3E%3C/svg%3E"),
            /* 3. Left Wavy Snow Margin */
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 60'%3E%3Cpath d='M14,0 Q2,6 6,12 Q0,18 7,24 Q1,30 6,36 Q0,42 7,48 Q1,54 14,60 Z' fill='%23ffffff'/%3E%3Cpath d='M14,0 Q4,6 8,12 Q2,18 9,24 Q3,30 8,36 Q2,42 9,48 Q3,54 14,60 Z' fill='%23bae6fd' opacity='0.8'/%3E%3C/svg%3E"),
            /* 4. Right Wavy Snow Margin */
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 60'%3E%3Cpath d='M0,0 Q12,6 8,12 Q14,18 7,24 Q13,30 8,36 Q14,42 7,48 Q13,54 0,60 Z' fill='%23ffffff'/%3E%3Cpath d='M0,0 Q10,6 6,12 Q12,18 5,24 Q11,30 6,36 Q12,42 5,48 Q11,54 0,60 Z' fill='%23bae6fd' opacity='0.8'/%3E%3C/svg%3E");
          background-position: 
            top left, 
            bottom left, 
            top left, 
            top right;
          background-repeat: 
            repeat-x, 
            repeat-x, 
            repeat-y, 
            repeat-y;
          background-size: 
            42px 11px, 
            42px 11px, 
            11px 42px, 
            11px 42px;
          filter: drop-shadow(0 0 2.5px rgba(2, 132, 199, 0.4));
          z-index: 25;
          pointer-events: none;
        }

        /* 4 Fluffy Snowballs in the 4 Corners to connect the waves smoothly */
        body.holiday-theme-active div.group.rounded-2xl::after,
        body.holiday-theme-active div.group.rounded-3xl::after,
        body.holiday-theme-active div.group.rounded-xl::after {
          content: '';
          position: absolute;
          inset: -7px;
          background-image: 
            radial-gradient(circle at 6px 6px, #ffffff 5px, #bae6fd 6px, transparent 6.5px),
            radial-gradient(circle at calc(100% - 6px) 6px, #ffffff 5px, #bae6fd 6px, transparent 6.5px),
            radial-gradient(circle at 6px calc(100% - 6px), #ffffff 5px, #bae6fd 6px, transparent 6.5px),
            radial-gradient(circle at calc(100% - 6px) calc(100% - 6px), #ffffff 5px, #bae6fd 6px, transparent 6.5px);
          filter: drop-shadow(0 0 2px rgba(2, 132, 199, 0.4));
          z-index: 26;
          pointer-events: none;
        }

        /* ── MOBILE OPTIMIZATION: SLIM & PROPORTIONATE WAVY SNOW ── */
        @media (max-width: 640px) {
          body.holiday-theme-active div.group.rounded-2xl::before,
          body.holiday-theme-active div.group.rounded-3xl::before,
          body.holiday-theme-active div.group.rounded-xl::before {
            inset: -4px;
            background-size: 28px 7px, 28px 7px, 7px 28px, 7px 28px;
            filter: drop-shadow(0 0 1.5px rgba(2, 132, 199, 0.35));
          }

          body.holiday-theme-active div.group.rounded-2xl::after,
          body.holiday-theme-active div.group.rounded-3xl::after,
          body.holiday-theme-active div.group.rounded-xl::after {
            inset: -4px;
            background-image: 
              radial-gradient(circle at 4px 4px, #ffffff 3px, #bae6fd 4px, transparent 4.5px),
              radial-gradient(circle at calc(100% - 4px) 4px, #ffffff 3px, #bae6fd 4px, transparent 4.5px),
              radial-gradient(circle at 4px calc(100% - 4px), #ffffff 3px, #bae6fd 4px, transparent 4.5px),
              radial-gradient(circle at calc(100% - 4px) calc(100% - 4px), #ffffff 3px, #bae6fd 4px, transparent 4.5px);
            filter: drop-shadow(0 0 1.5px rgba(2, 132, 199, 0.35));
          }

          body.holiday-theme-active div.group.rounded-2xl,
          body.holiday-theme-active div.group.rounded-3xl,
          body.holiday-theme-active div.group.rounded-xl {
            box-shadow: 0 2px 8px -1px rgba(0, 0, 0, 0.07) !important;
          }
        }

        /* Card Hover - Shimmering Festive Snow Border Glow */
        body.holiday-theme-active div.group.rounded-2xl:hover,
        body.holiday-theme-active div.group.rounded-3xl:hover,
        body.holiday-theme-active div.group.rounded-xl:hover {
          box-shadow: 
            0 0 16px 4px rgba(56, 189, 248, 0.4),
            0 0 24px 6px rgba(225, 29, 72, 0.18),
            0 12px 28px -4px rgba(0, 0, 0, 0.14) !important;
          transform: translateY(-3px);
        }

        /* ── BUTTON CHRISTMAS DESIGN: HOLIDAY RED-PINK GRADIENTS ── */
        body.holiday-theme-active button.bg-pink-500,
        body.holiday-theme-active button.bg-pink-600,
        body.holiday-theme-active a.bg-pink-500,
        body.holiday-theme-active a.bg-pink-600 {
          background-image: linear-gradient(135deg, #e11d48 0%, #ec4899 50%, #f43f5e 100%) !important;
          box-shadow: 0 4px 14px 0 rgba(225, 29, 72, 0.35) !important;
        }

        body.holiday-theme-active button.bg-pink-500:hover,
        body.holiday-theme-active button.bg-pink-600:hover,
        body.holiday-theme-active a.bg-pink-500:hover,
        body.holiday-theme-active a.bg-pink-600:hover {
          background-image: linear-gradient(135deg, #be123c 0%, #db2777 50%, #e11d48 100%) !important;
          box-shadow: 0 6px 20px 0 rgba(225, 29, 72, 0.5), 0 0 12px rgba(253, 224, 71, 0.45) !important;
        }
      `}</style>
    </>
  );
}
