/**
 * Forest theme — for the Accounting module.
 * Deep canopy greens, mossy mids, dappled light.
 */

export const forest = {
  // Deep canopy
  pine: '#0B2818',
  evergreen: '#1B4332',
  spruce: '#2D6A4F',
  // Mid forest
  moss: '#40916C',
  fern: '#52B788',
  sage: '#74C69D',
  // Light dappled
  mint: '#95D5B2',
  pale: '#B7E4C7',
  foam: '#D8F3DC',
  // Bark / earth
  bark: '#5C3A21',
  trunk: '#7B4B26',
  branch: '#8B5A2B',
  twig: '#A0522D',
  // Soil / understory
  soil: '#3E2C1C',
  leafLitter: '#6B4423',
  // Sunlight through leaves
  sunlit: '#F1F8E9',
  cream: '#F7F9F2',
} as const;

export const forestGradients = {
  canopy: 'linear-gradient(180deg, #0B2818 0%, #1B4332 50%, #2D6A4F 100%)',
  meadow: 'linear-gradient(180deg, #D8F3DC 0%, #B7E4C7 40%, #74C69D 100%)',
  dawn: 'linear-gradient(180deg, #F7F9F2 0%, #D8F3DC 50%, #95D5B2 100%)',
  bark: 'linear-gradient(180deg, #5C3A21 0%, #7B4B26 100%)',
} as const;
