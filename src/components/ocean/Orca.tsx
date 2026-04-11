/**
 * Stylized orca silhouette, facing right.
 * Pure SVG — no external assets. Composes nicely with CSS animations.
 */
export function Orca({
  size = 200,
  className = '',
  facing = 'right',
}: {
  size?: number;
  className?: string;
  facing?: 'left' | 'right';
}) {
  return (
    <svg
      viewBox="0 0 220 110"
      width={size}
      height={size * (110 / 220)}
      className={className}
      style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tail flukes */}
      <path
        d="M14,55 Q-2,32 -10,18 Q12,38 18,55 Q12,72 -10,92 Q-2,78 14,55 Z"
        fill="#0A1F33"
      />
      {/* Main body */}
      <path
        d="M16,55 C22,28 70,16 122,22 C162,27 188,40 200,52 C202,57 198,62 192,65 C176,76 132,88 90,86 C50,84 24,75 16,58 Z"
        fill="#0A1F33"
      />
      {/* White belly */}
      <path
        d="M34,72 C70,86 138,86 184,68 C176,76 132,88 90,86 C52,84 30,76 34,72 Z"
        fill="#F8FBFD"
      />
      {/* Saddle patch (lighter accent) */}
      <ellipse cx="120" cy="40" rx="18" ry="6" fill="#1B3A52" opacity="0.7" />
      {/* Dorsal fin */}
      <path d="M82,18 Q92,-4 108,16 Q112,20 100,22 Q88,22 82,18 Z" fill="#0A1F33" />
      {/* Pectoral fin */}
      <path d="M70,72 Q88,96 112,82 Q92,78 70,72 Z" fill="#06182A" />
      {/* Eye patch */}
      <ellipse cx="178" cy="44" rx="9" ry="4.5" fill="#F8FBFD" />
      {/* Eye */}
      <circle cx="180" cy="44" r="1.8" fill="#0A1F33" />
      {/* Mouth line */}
      <path
        d="M188,54 Q194,56 198,54"
        stroke="#F8FBFD"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
