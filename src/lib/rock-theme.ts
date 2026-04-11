/**
 * Rock & Sand theme — for the HRM module.
 * Sandstone, gravel, terracotta — earthy and grounded.
 */

export const rock = {
  // Deep stone
  onyx: '#2C2620',
  basalt: '#463A2D',
  // Mid stone
  shale: '#6B5841',
  clay: '#8B6F47',
  // Sandstone
  sandstone: '#C9A178',
  tan: '#D4B896',
  // Light dust
  dust: '#E8D5B7',
  bone: '#F2E4CF',
  cream: '#FAF1E1',
  // Earth accents
  terracotta: '#B5651D',
  rust: '#A0522D',
} as const;

export const rockGradients = {
  canyon: 'linear-gradient(180deg, #2C2620 0%, #463A2D 30%, #6B5841 60%, #8B6F47 100%)',
  dune: 'linear-gradient(180deg, #FAF1E1 0%, #E8D5B7 40%, #C9A178 100%)',
  sandstone: 'linear-gradient(180deg, #D4B896 0%, #C9A178 50%, #8B6F47 100%)',
  cave: 'linear-gradient(180deg, #2C2620 0%, #463A2D 100%)',
} as const;
