/**
 * Ocean theme color tokens.
 * Inspired by deep sea, coastal waters, and shoreline sand.
 */

export const ocean = {
  // Deep sea — used for primary nav, dark surfaces
  abyss: '#001F3F',
  trench: '#012A4A',
  midnight: '#013A63',
  deep: '#01497C',
  ocean: '#014F86',

  // Open ocean — primary accents
  sea: '#0077B6',
  wave: '#0096C7',
  surf: '#00B4D8',

  // Lagoon / shallow — bright accents, hover states
  lagoon: '#48CAE4',
  shallow: '#90E0EF',
  foam: '#CAF0F8',
  mist: '#E0F4F8',

  // Shoreline / sand
  sand: '#F5DEB3',
  shore: '#F4E1D2',
  driftwood: '#E6CBA8',
  pearl: '#FDF6E3',
  cream: '#FAEBD7',

  // Coral accents (warnings / highlights)
  coral: '#FF8C7A',
  sunset: '#FF6F61',

  // Algae / kelp (success / positive)
  kelp: '#40916C',
  algae: '#52B788',

  // Neutrals tuned to the palette
  ink: '#0A1F33',
  slate: '#3B5566',
  cloud: '#F8FBFD',
} as const;

// Common gradients used across the UI
export const oceanGradients = {
  deepSea: 'linear-gradient(180deg, #001F3F 0%, #014F86 50%, #0077B6 100%)',
  sunlitWater: 'linear-gradient(180deg, #00B4D8 0%, #0096C7 50%, #014F86 100%)',
  shoreline: 'linear-gradient(180deg, #CAF0F8 0%, #90E0EF 40%, #48CAE4 100%)',
  beachToSea: 'linear-gradient(180deg, #F5DEB3 0%, #FAEBD7 25%, #CAF0F8 55%, #00B4D8 100%)',
  podSwim: 'linear-gradient(135deg, #013A63 0%, #0077B6 50%, #00B4D8 100%)',
} as const;
