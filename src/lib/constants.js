import { DEFAULT_LOCATION } from './weather.js';

export const APP_NAME = 'GarmentDB';
export const GEMINI_MODEL = 'gemini-2.5-flash';

export const CATEGORIES = ['Top', 'Bottom', 'Footwear', 'Accessory'];
export const FITS = ['Oversized', 'Boxy', 'Baggy', 'Slim'];

export const STATUSES = [
  { id: 'active', label: 'Active', short: 'Active', dot: 'bg-emerald-400', text: 'text-emerald-300', glow: 'shadow-emerald-400/60' },
  { id: 'laundry', label: 'In Laundry', short: 'Laundry', dot: 'bg-sky-400', text: 'text-sky-300', glow: 'shadow-sky-400/60' },
  { id: 'retired', label: 'Out of Commission', short: 'Out', dot: 'bg-rose-400', text: 'text-rose-300', glow: 'shadow-rose-400/60' },
  { id: 'packed', label: 'Packed for Trip', short: 'Packed', dot: 'bg-amber-400', text: 'text-amber-300', glow: 'shadow-amber-400/60' },
];
export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const DEFAULT_SETTINGS = {
  apiKey: '',
  unit: 'C',
  packingMode: false,
  styleNotes: '',
  location: DEFAULT_LOCATION,
};

export const OCCASIONS = ['Everyday', 'Campus', 'Café / Gallery', 'Date Night', 'Night Out', 'Travel Day'];

// Named colors used for swatches, the color picker suggestions and photo color guessing.
export const COLOR_SWATCHES = {
  Black: '#0b0b0c',
  Charcoal: '#3a3a3f',
  Grey: '#8b8b90',
  White: '#f4f4f2',
  Cream: '#efe6cf',
  Beige: '#d8c8a8',
  Khaki: '#b9a57e',
  Tan: '#b0875a',
  Brown: '#6a4529',
  Olive: '#66683a',
  Sage: '#9cae8a',
  Green: '#2f7a4a',
  Navy: '#1d2747',
  Denim: '#47668c',
  Blue: '#3768d0',
  'Light Blue': '#9fc4ee',
  Purple: '#6a4a9a',
  Lavender: '#b8a8e0',
  Pink: '#e7a1b5',
  Red: '#bf342a',
  Burgundy: '#6b1f2b',
  Orange: '#e07a2b',
  Yellow: '#e6c63b',
};

export function swatchFor(color) {
  if (!color) return '#52525b';
  const hit = Object.entries(COLOR_SWATCHES).find(([name]) => name.toLowerCase() === color.trim().toLowerCase());
  if (hit) return hit[1];
  // Fall back to the last word ("washed black" -> black), then raw CSS color names.
  const last = color.trim().split(/\s+/).pop().toLowerCase();
  const partial = Object.entries(COLOR_SWATCHES).find(([name]) => name.toLowerCase() === last);
  if (partial) return partial[1];
  if (typeof CSS !== 'undefined' && CSS.supports?.('color', last)) return last;
  return '#52525b';
}
