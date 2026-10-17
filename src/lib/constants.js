import { DEFAULT_LOCATION } from './weather.js';

export const APP_NAME = 'GarmentDB';
export const GEMINI_MODEL = 'gemini-2.5-flash';

export const CATEGORIES = ['Top', 'Bottom', 'Footwear', 'Accessory'];
// Fit only makes sense for some garments. Footwear and accessories have none,
// and for tops/bottoms it can be left on "None" too (stored as '').
export const FITS_BY_CATEGORY = {
  Top: ['Oversized', 'Boxy', 'Cropped', 'Regular', 'Slim'],
  Bottom: ['Baggy', 'Wide', 'Straight', 'Tapered', 'Regular', 'Slim'],
};
export const FITS = [...new Set(Object.values(FITS_BY_CATEGORY).flat())];

/** Fit choices to show for a category (plus an item's existing value if it's no longer a preset). */
export function fitOptions(category, current = '') {
  const base = FITS_BY_CATEGORY[category];
  if (!base) return null; // no fit for this category
  return current && !base.includes(current) ? [current, ...base] : base;
}

// Patterns, prints and finishes that sit on top of the base colors.
export const DESIGNS = [
  'Graphic', 'Logo', 'Striped', 'Plaid', 'Floral', 'Camo', 'Tie-dye', 'Washed', 'Faded', 'Distressed',
  'Embroidered', 'Textured', 'Print',
];

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

export const MAX_COLORS = 4;

const splitList = (s) => (s || '').split(/[,/+&]| and /i).map((x) => x.trim()).filter(Boolean);

/** Colors of an item. Older items only have a single `color` string. */
export function colorList(item) {
  return Array.isArray(item?.colors) ? item.colors : splitList(item?.color);
}

export const designList = (item) => (Array.isArray(item?.designs) ? item.designs : []);

/** "Black, Red, Graphic" — colors then designs, for cards, search and prompts. */
export const descriptor = (item) => [...colorList(item), ...designList(item)].join(', ');

/** Fills in the new fields on older items so editors can rely on them. */
export function normalizeItem(item) {
  const colors = colorList(item);
  return { ...item, colors, color: colors.join(', '), designs: designList(item), fit: item.fit || '' };
}

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
