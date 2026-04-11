/**
 * Metal theme — for the Manufacturing module.
 * Iron, steel, gold, copper — industrial and forged.
 */

export const metal = {
  // Deep iron
  iron: '#1C1C1E',
  gunmetal: '#2C2F33',
  // Mid steel
  steel: '#4A4E54',
  pewter: '#6B7280',
  // Polished
  silver: '#9CA3AF',
  chrome: '#C0C5CC',
  // Light
  platinum: '#E5E7EB',
  fog: '#F3F4F6',
  // Accent metals
  gold: '#D4A843',
  copper: '#B87333',
  bronze: '#A97142',
  rust: '#8B4513',
} as const;

export const metalGradients = {
  forge: 'linear-gradient(180deg, #1C1C1E 0%, #2C2F33 40%, #4A4E54 100%)',
  alloy: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 40%, #9CA3AF 100%)',
  molten: 'linear-gradient(135deg, #D4A843 0%, #B87333 50%, #8B4513 100%)',
  anvil: 'linear-gradient(180deg, #2C2F33 0%, #4A4E54 100%)',
} as const;
