'use client';

import { Orca } from './Orca';

/**
 * A pod of orcas swimming together with friendly bobbing motion,
 * occasionally jumping in sequence. Designed for sign-up / hero panels.
 */
export function OrcaPod({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background sunlit water gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #CAF0F8 0%, #90E0EF 18%, #48CAE4 35%, #00B4D8 55%, #0096C7 75%, #014F86 100%)',
        }}
      />

      {/* Sunbeams */}
      <div className="ocean-sunbeams" />

      {/* Pod members — staggered jumps along an arc */}
      <div className="orca-pod-track">
        <div className="orca-pod-member" style={{ animationDelay: '0s' }}>
          <div className="orca-pod-rotate">
            <Orca size={130} />
          </div>
        </div>
        <div className="orca-pod-member" style={{ animationDelay: '0.6s' }}>
          <div className="orca-pod-rotate">
            <Orca size={110} />
          </div>
        </div>
        <div className="orca-pod-member" style={{ animationDelay: '1.2s' }}>
          <div className="orca-pod-rotate">
            <Orca size={150} />
          </div>
        </div>
      </div>

      {/* Bottom water line with splash spots */}
      <div className="absolute bottom-0 left-0 right-0 h-32">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,80 C240,40 480,120 720,90 C960,60 1200,130 1440,80 L1440,200 L0,200 Z"
            fill="#0096C7"
            opacity="0.7"
          />
          <path
            d="M0,120 C240,90 480,160 720,130 C960,100 1200,160 1440,120 L1440,200 L0,200 Z"
            fill="#014F86"
            opacity="0.85"
          />
          <path
            d="M0,160 C240,140 480,180 720,160 C960,140 1200,180 1440,160 L1440,200 L0,200 Z"
            fill="#012A4A"
          />
        </svg>
      </div>
    </div>
  );
}
