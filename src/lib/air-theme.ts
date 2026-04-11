/**
 * Air theme — for the Marketing module.
 * Cool sky tones, soft mist, lavender hints.
 */

export const air = {
  // Deep sky
  twilight: '#3D5266',
  storm: '#5A7A8C',
  // Mid sky
  slate: '#94A8B8',
  steel: '#A6BBC9',
  // Light cloud
  cloud: '#D6E5EC',
  mist: '#E8F1F5',
  // Pale dawn
  skyLight: '#F4F9FB',
  cream: '#FAFCFD',
  // Lavender accents
  lavender: '#B9B5D8',
  lilac: '#D4D1E8',
  // Breeze accents
  breeze: '#C8DEE8',
  pollen: '#F7E5A1',
} as const;

export const airGradients = {
  daySky: 'linear-gradient(180deg, #E8F1F5 0%, #C8DEE8 50%, #94A8B8 100%)',
  windSwept: 'linear-gradient(135deg, #F4F9FB 0%, #D6E5EC 50%, #B9B5D8 100%)',
  duskHorizon: 'linear-gradient(180deg, #3D5266 0%, #5A7A8C 40%, #B9B5D8 100%)',
} as const;
