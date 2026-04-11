'use client';

import { useState, useEffect } from 'react';

type Bubble = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

/**
 * Decorative rising bubbles. Pure CSS — no JS animation loop.
 * Generated client-side only to avoid hydration mismatch from Math.random().
 */
export function Bubbles({
  count = 12,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    setBubbles(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 18,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 6,
        opacity: 0.3 + Math.random() * 0.4,
      }))
    );
  }, [count]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="ocean-bubble"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            opacity: b.opacity,
          }}
        />
      ))}
    </div>
  );
}
