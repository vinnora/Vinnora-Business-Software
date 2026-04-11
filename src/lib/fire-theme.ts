/**
 * Fire theme — for the Inventory module.
 * Warm flames balanced with golds and ambers (avoids harsh red).
 */

export const fire = {
  // Deep ember
  ember: '#4A1D0F',
  coal: '#6B2410',
  // Burning core
  rust: '#B14411',
  flame: '#E2671A',
  // Mid flame
  amber: '#F4A03A',
  gold: '#FFC15E',
  // Hottest tip
  glow: '#FFE26A',
  spark: '#FFF1A8',
  // Smoke / ash
  ash: '#6B5B4D',
  smoke: '#9A8C7C',
  // Cream backdrop
  warmCream: '#FFF6E5',
  parchment: '#FFF1D6',
} as const;

export const fireGradients = {
  campfire: 'linear-gradient(180deg, #FFE26A 0%, #FFC15E 25%, #F4A03A 50%, #E2671A 75%, #B14411 100%)',
  ember: 'linear-gradient(180deg, #6B2410 0%, #B14411 50%, #E2671A 100%)',
  hearth: 'linear-gradient(180deg, #2C1810 0%, #4A1D0F 50%, #6B2410 100%)',
  warmGlow: 'linear-gradient(180deg, #FFF6E5 0%, #FFE26A 50%, #F4A03A 100%)',
} as const;
