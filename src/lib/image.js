import { COLOR_SWATCHES } from './constants.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

const PALETTE = Object.entries(COLOR_SWATCHES).map(([name, hex]) => ({
  name,
  rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
}));

/**
 * Picks the palette colors that cover a meaningful share of the middle of the
 * photo (where the garment usually is): the main color plus up to two accents.
 */
function guessColors(ctx, w, h) {
  const x0 = Math.floor(w * 0.3);
  const y0 = Math.floor(h * 0.3);
  const cw = Math.max(1, Math.floor(w * 0.4));
  const ch = Math.max(1, Math.floor(h * 0.4));
  const { data } = ctx.getImageData(x0, y0, cw, ch);
  const votes = new Map();
  for (let i = 0; i < data.length; i += 4 * 6) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let best = PALETTE[0], bestD = Infinity;
    for (const p of PALETTE) {
      // Weighted RGB distance — cheap and good enough for naming a garment.
      const d = 2 * (r - p.rgb[0]) ** 2 + 4 * (g - p.rgb[1]) ** 2 + 3 * (b - p.rgb[2]) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    votes.set(best.name, (votes.get(best.name) || 0) + 1);
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((n, [, v]) => n + v, 0) || 1;
  return ranked.filter(([, v], i) => i === 0 || v / total >= 0.18).slice(0, 3).map(([name]) => name);
}

/**
 * Downscales a photo to a small JPEG so a whole wardrobe fits in localStorage
 * (~40–70 KB per item at the defaults).
 */
export async function compressImage(file, maxDim = 640, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff'; // flatten transparent PNGs onto white
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), colors: guessColors(ctx, w, h) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
