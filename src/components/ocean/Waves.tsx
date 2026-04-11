/**
 * Layered SVG waves. Use as a divider, hero footer, or full background.
 */
export function Waves({
  className = '',
  height = 140,
  variant = 'rolling',
}: {
  className?: string;
  height?: number;
  variant?: 'rolling' | 'calm' | 'choppy';
}) {
  return (
    <svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="waveGrad1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0096C7" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0077B6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#014F86" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waveGrad3" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#013A63" stopOpacity="1" />
          <stop offset="100%" stopColor="#012A4A" stopOpacity="1" />
        </linearGradient>
      </defs>

      {variant === 'rolling' && (
        <>
          <path
            d="M0,80 C240,40 480,120 720,90 C960,60 1200,130 1440,80 L1440,200 L0,200 Z"
            fill="url(#waveGrad1)"
          />
          <path
            d="M0,120 C240,90 480,160 720,130 C960,100 1200,160 1440,120 L1440,200 L0,200 Z"
            fill="url(#waveGrad2)"
          />
          <path
            d="M0,160 C240,140 480,180 720,160 C960,140 1200,180 1440,160 L1440,200 L0,200 Z"
            fill="url(#waveGrad3)"
          />
        </>
      )}
      {variant === 'calm' && (
        <>
          <path
            d="M0,120 C360,100 720,140 1440,110 L1440,200 L0,200 Z"
            fill="url(#waveGrad1)"
          />
          <path
            d="M0,150 C360,140 720,170 1440,150 L1440,200 L0,200 Z"
            fill="url(#waveGrad2)"
          />
        </>
      )}
      {variant === 'choppy' && (
        <>
          <path
            d="M0,60 C120,20 240,100 360,60 C480,20 600,100 720,60 C840,20 960,100 1080,60 C1200,20 1320,100 1440,60 L1440,200 L0,200 Z"
            fill="url(#waveGrad1)"
          />
          <path
            d="M0,100 C120,70 240,130 360,100 C480,70 600,130 720,100 C840,70 960,130 1080,100 C1200,70 1320,130 1440,100 L1440,200 L0,200 Z"
            fill="url(#waveGrad2)"
          />
          <path
            d="M0,150 C120,130 240,170 360,150 C480,130 600,170 720,150 C840,130 960,170 1080,150 C1200,130 1320,170 1440,150 L1440,200 L0,200 Z"
            fill="url(#waveGrad3)"
          />
        </>
      )}
    </svg>
  );
}

/**
 * Animated gradient water surface — used as background of hero sections.
 */
export function WaterSurface({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        background:
          'linear-gradient(180deg, #CAF0F8 0%, #90E0EF 12%, #48CAE4 25%, #00B4D8 45%, #0096C7 65%, #014F86 85%, #012A4A 100%)',
      }}
    />
  );
}
