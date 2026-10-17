import { CATEGORIES, FITS, GEMINI_MODEL, MAX_COLORS, colorList, designList } from './constants.js';
import { describeWeather, itemWeatherTag, weatherRules } from './weather.js';
import { uid } from './storage.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(apiKey, body, signal) {
  const res = await fetch(`${BASE}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini request failed (${res.status})`;
    if (res.status === 400 && /api key/i.test(msg)) throw new Error('Gemini rejected the API key. Check it in Settings.');
    if (res.status === 429) throw new Error('Gemini rate limit hit — wait a minute and try again.');
    throw new Error(msg);
  }
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) {
    const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'empty response';
    throw new Error(`Gemini returned no content (${reason}).`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON. Try again.');
  }
}

/** Cheap key check: fetches model metadata, costs no tokens. */
export async function testApiKey(apiKey) {
  const res = await fetch(`${BASE}/${GEMINI_MODEL}`, { headers: { 'x-goog-api-key': apiKey } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Key check failed (${res.status})`);
  }
  return true;
}

const STYLIST_SYSTEM = `You are a senior streetwear stylist specializing in contemporary Asian streetwear:
Tokyo (Ura-Hara layering, Japanese workwear, wide relaxed silhouettes), Seoul (clean oversized minimalism, tonal stacks with one accent) and Shanghai / Hong Kong / Taipei (utility and techwear-leaning pieces, sharp color blocking). You build outfits ONLY from the user's real wardrobe.

Principles:
- Proportion first. Choose a deliberate silhouette: oversized/boxy top + wide or baggy bottom with a chunky shoe (H shape, full volume); boxy cropped top + baggy high-rise bottom (long leg line); oversized top + slim/tapered bottom (Y shape); slim top + very wide bottom (A shape). Volume must look intentional, never sloppy.
- Color blocking. Think in 2–3 color fields: tonal/monochrome with texture contrast, one saturated accent against neutrals, or deliberate block pairings (navy + cream, olive + black, grey + brown). Name the color story.
- Layering reads as streetwear when lengths are staggered — say when a hem should peek out, tuck, or front-tuck, and how to cuff or stack trousers.
- Footwear anchors the silhouette: chunky soles under wide hems, sleeker shoes with tapered legs.
- Accessories (caps, bags, chains, socks, eyewear) are finishing touches: 0–2 per look.
- Items can have several colors and designs (graphics, logos, stripes, washes). A graphic or loud print is the focal point: pair it with calmer, solid pieces. Treat every listed color as part of the color story, not just the first. Washed or faded finishes read softer and vintage. Footwear and accessories have no fit; some pieces list none, so judge those by shape and name.
- Respect the weather: layer for cold, breathe in heat. Read humidity and rain probability closely: when rain is likely, delicate footwear (suede, nubuck, canvas, mesh sneakers) stays home and robust footwear (waterproof boots such as Timberlands, leather shoes) plus a protective outer layer take over. Items tagged "⚠ rain-sensitive" must not be used on a wet day unless nothing else exists in that category; prefer items tagged "rain-ready".

Hard rules:
- Use only the item refs given. Never invent pieces.
- Each outfit: at least 1 Top (2–3 if layering), exactly 1 Bottom, exactly 1 Footwear, 0–2 Accessories, 6 pieces max. If a category is missing from the wardrobe, build the best look possible and say what's missing.
- The 3 outfits must differ clearly in silhouette and color story; do not repeat the same hero piece in all three.
- Rationale: 2–3 tight, concrete sentences that name the actual pieces. No filler.`;

function fitPackSchema(refs) {
  return {
    type: 'OBJECT',
    properties: {
      outfits: {
        type: 'ARRAY',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Short evocative outfit name, 2–4 words' },
            vibe: { type: 'STRING', description: 'Style reference in 2–4 words, e.g. "Seoul tonal minimal"' },
            silhouette: { type: 'STRING', description: 'e.g. "Boxy crop / wide leg — long line"' },
            itemRefs: { type: 'ARRAY', items: { type: 'STRING', enum: refs } },
            colorStory: { type: 'STRING', description: 'One sentence on the color blocking' },
            rationale: { type: 'STRING' },
            weatherNote: { type: 'STRING', description: 'One sentence on how it handles today’s weather' },
          },
          required: ['name', 'vibe', 'silhouette', 'itemRefs', 'colorStory', 'rationale', 'weatherNote'],
        },
      },
    },
    required: ['outfits'],
  };
}

/**
 * Sends the available wardrobe + weather + constraints to Gemini and returns
 * a fit pack: { id, createdAt, weather, occasion, packingMode, outfits[] }.
 */
export async function generateFitPack({ apiKey, items, weather, occasion, styleNotes, packingMode, signal }) {
  // Short refs keep the prompt small and let the schema enum guarantee valid picks.
  const refs = items.map((item, i) => ({ ref: `P${i + 1}`, item }));
  const byRef = Object.fromEntries(refs.map((r) => [r.ref, r.item.id]));
  const inventory = refs
    .map(
      ({ ref, item }) =>
        [
          ref,
          item.category,
          item.name,
          `color: ${colorList(item).join(' + ') || 'unknown'}`,
          designList(item).length && `design: ${designList(item).join(', ')}`,
          item.fit && `fit: ${item.fit}`,
        ]
          .filter(Boolean)
          .join(' | ') + itemWeatherTag(item, weather),
    )
    .join('\n');
  const rules = weatherRules(weather);

  const prompt = [
    `Today's weather: ${describeWeather(weather)}.`,
    rules.length ? `Weather constraints (mandatory):\n${rules.map((r) => `- ${r}`).join('\n')}` : '',
    `Occasion / mood: ${occasion || 'Everyday'}.`,
    packingMode ? 'Context: I am traveling — these are only the pieces in my suitcase.' : '',
    styleNotes?.trim() ? `My personal notes: ${styleNotes.trim()}` : '',
    '',
    `Available wardrobe (${items.length} pieces; ref | category | name | color | design | fit):`,
    inventory,
    '',
    'Build exactly 3 outfits as a fit pack.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const json = await callGemini(
    apiKey,
    {
      systemInstruction: { parts: [{ text: STYLIST_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: fitPackSchema(refs.map((r) => r.ref)),
        temperature: 0.9,
      },
    },
    signal,
  );

  const outfits = (json.outfits || [])
    .slice(0, 3)
    .map((o) => ({
      id: uid(),
      name: o.name || 'Untitled fit',
      vibe: o.vibe || '',
      silhouette: o.silhouette || '',
      colorStory: o.colorStory || '',
      rationale: o.rationale || '',
      weatherNote: o.weatherNote || '',
      itemIds: [...new Set((o.itemRefs || []).map((r) => byRef[r]).filter(Boolean))],
    }))
    .filter((o) => o.itemIds.length > 0);

  if (!outfits.length) throw new Error('Gemini returned no usable outfits. Try again.');
  return { id: uid(), createdAt: Date.now(), weather, occasion, packingMode, outfits };
}

/** Looks at one clothing photo and suggests catalog fields (used by batch import). */
export async function analyzeItemPhoto(apiKey, dataUrl, signal) {
  const [meta, data] = dataUrl.split(',');
  const mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  return callGemini(
    apiKey,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data } },
            {
              text: `Catalog this single clothing item for a wardrobe app.
- name: short and specific, like a product title (e.g. "Washed Black Boxy Tee", "Cream Wide-Leg Trousers").
- colors: every distinct color you can actually see on the garment itself, main color first, then accents or secondary colors (max ${MAX_COLORS}). Ignore the background. Use plain names such as Black, Red, Grey, Cream, Navy. Do not list a color that is only a tiny detail.
- designs: patterns, prints or finishes you can see, such as Graphic, Logo, Striped, Plaid, Washed, Faded, Distressed, Embroidered. Use an empty list if the piece is plain and solid. Never invent a design.
- fit: how it is cut or drapes. Use "None" for footwear and accessories, and whenever the fit can't be judged from the photo.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            category: { type: 'STRING', enum: CATEGORIES },
            colors: { type: 'ARRAY', minItems: 1, maxItems: MAX_COLORS, items: { type: 'STRING' } },
            designs: { type: 'ARRAY', maxItems: 4, items: { type: 'STRING' } },
            fit: { type: 'STRING', enum: [...FITS, 'None'] },
          },
          required: ['name', 'category', 'colors', 'designs', 'fit'],
        },
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    signal,
  );
}
