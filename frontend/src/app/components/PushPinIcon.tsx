import React from 'react';

interface PushPinIconProps {
  isPinned?: boolean;
  className?: string;
  size?: number;
  alwaysTilted?: boolean;
  idPrefix?: string;
}

/**
 * Authentic 3D Red Pushpin (Thumbtack) Icon matching real stationery pushpin:
 * - When NOT pinned: Upright (0deg), clean outline / subtle neutral tone
 * - When PINNED (pag pinindot): Tilts "patagilid" (-42deg) into the board, with
 *   vibrant glossy red body, 3D highlights, sharp silver metallic needle, and drop shadow.
 */
export function PushPinIcon({
  isPinned = false,
  className = '',
  size = 18,
  alwaysTilted = false,
  idPrefix = 'pushpin',
}: PushPinIconProps) {
  const active = isPinned || alwaysTilted;
  const gradientId = `${idPrefix}-red-${isPinned ? 'pinned' : 'unpinned'}`;
  const needleGradId = `${idPrefix}-needle`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: active ? 'rotate(-42deg) scale(1.06)' : 'rotate(0deg) scale(1)',
        transformOrigin: '50% 50%',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease',
        filter: active
          ? 'drop-shadow(-1.5px 2px 3px rgba(0,0,0,0.35))'
          : 'none',
      }}
      className={`inline-block flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        {/* Glossy Red Plastic 3D Gradient */}
        <linearGradient id={gradientId} x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="#FF6060" />
          <stop offset="25%" stopColor="#EF4444" />
          <stop offset="65%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        {/* Chrome Metallic Steel Needle Gradient */}
        <linearGradient id={needleGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="35%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* 1. Sharp Metallic Needle / Patusok na Karayom */}
      <path
        d="M11.1 15.5L12 23.5L12.9 15.5Z"
        fill={active ? `url(#${needleGradId})` : '#94A3B8'}
        stroke={active ? '#64748B' : '#94A3B8'}
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
      {active && (
        <line
          x1="12"
          y1="16"
          x2="12"
          y2="22.5"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* 2. Pushpin Plastic Body (Head, Waist & Bell Base) */}
      <path
        d="M7.5 2.5
           C7.5 1.6 9 1 12 1
           C15 1 16.5 1.6 16.5 2.5
           C16.5 3.6 15.4 5.6 14.3 7.6
           C13.8 8.5 13.8 9.6 14.3 10.5
           C15.5 12.2 18.6 13.4 18.6 15.1
           C18.6 16.2 15.6 16.8 12 16.8
           C8.4 16.8 5.4 16.2 5.4 15.1
           C5.4 13.4 8.5 12.2 9.7 10.5
           C10.2 9.6 10.2 8.5 9.7 7.6
           C8.6 5.6 7.5 3.6 7.5 2.5 Z"
        fill={active ? `url(#${gradientId})` : 'transparent'}
        stroke={active ? '#B91C1C' : '#9CA3AF'}
        strokeWidth={active ? '0.75' : '1.75'}
        strokeLinejoin="round"
      />

      {/* 3. 3D Plastic Glossy Highlights (Only when active/pinned or colored) */}
      {active && (
        <>
          {/* Top Oval Cap Highlight */}
          <ellipse
            cx="12"
            cy="2.4"
            rx="3.8"
            ry="1"
            fill="#FFA3A3"
            opacity="0.85"
          />

          {/* Waist Subtle Shine */}
          <path
            d="M10.2 8.8 C11.2 9.2 12.8 9.2 13.8 8.8"
            stroke="#FFA3A3"
            strokeWidth="0.75"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Bell Base Front Curved Highlight */}
          <path
            d="M7.8 14.8 C9.5 15.7 14.5 15.7 16.2 14.8"
            stroke="#FFA3A3"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.6"
          />
        </>
      )}
    </svg>
  );
}
