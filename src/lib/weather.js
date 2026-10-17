// Weather for a chosen city (default Kelowna) or GPS, via Open-Meteo (free, no API key).

const WMO = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export const MANUAL_CONDITIONS = ['Clear', 'Partly cloudy', 'Overcast', 'Rain', 'Snow', 'Windy', 'Humid'];

/** Rain probability (%) at or above which the stylist treats the day as wet. */
export const WET_THRESHOLD = 50;

export const DEFAULT_LOCATION = { name: 'Kelowna', region: 'British Columbia, Canada', lat: 49.888, lon: -119.496 };

export const PRESET_LOCATIONS = [
  DEFAULT_LOCATION,
  { name: 'West Kelowna', region: 'British Columbia, Canada', lat: 49.863, lon: -119.583 },
  { name: 'Vernon', region: 'British Columbia, Canada', lat: 50.267, lon: -119.272 },
  { name: 'Penticton', region: 'British Columbia, Canada', lat: 49.499, lon: -119.594 },
  { name: 'Kamloops', region: 'British Columbia, Canada', lat: 50.676, lon: -120.341 },
  { name: 'Vancouver', region: 'British Columbia, Canada', lat: 49.283, lon: -123.121 },
  { name: 'Calgary', region: 'Alberta, Canada', lat: 51.045, lon: -114.058 },
];

export const sameLocation = (a, b) => !!a && !!b && a.lat === b.lat && a.lon === b.lon;

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const msg =
        err.code === 1
          ? 'Location permission denied — pick a city instead.'
          : 'Could not get your location (it needs HTTPS). Pick a city instead.';
      reject(new Error(msg));
    }, { timeout: 12000, maximumAge: 10 * 60 * 1000 });
  });
}

/** Device GPS as a location object. */
export async function locateMe() {
  const { coords } = await getPosition();
  return { name: 'My location', region: 'GPS', lat: +coords.latitude.toFixed(3), lon: +coords.longitude.toFixed(3) };
}

/** City search via Open-Meteo's free geocoder. */
export async function searchLocations(query, signal) {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error('City search is unavailable right now.');
  const d = await res.json();
  return (d.results || []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: +r.latitude.toFixed(3),
    lon: +r.longitude.toFixed(3),
  }));
}

/**
 * Current conditions plus the next 12 hours of rain probability.
 * rainChance is the peak hourly probability over the next 6 hours,
 * the stretch of the day an outfit actually has to survive.
 */
export async function fetchWeather(location = DEFAULT_LOCATION) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    hourly: 'precipitation_probability',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '2',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Weather service unavailable right now.');
  const d = await res.json();

  // Hourly times are local ("2026-10-16T14:00"); start from the current hour.
  const hourKey = d.current.time.slice(0, 13);
  const times = d.hourly?.time || [];
  const probs = d.hourly?.precipitation_probability || [];
  const from = Math.max(0, times.findIndex((t) => t.startsWith(hourKey)));
  const hourlyRain = times.slice(from, from + 12).map((t, i) => ({ hour: t.slice(11, 16), chance: probs[from + i] ?? 0 }));
  const next6 = hourlyRain.slice(0, 6).map((h) => h.chance);

  return {
    location: { name: location.name, region: location.region, lat: location.lat, lon: location.lon },
    tempC: d.current.temperature_2m,
    feelsC: d.current.apparent_temperature,
    humidity: d.current.relative_humidity_2m,
    precipMm: d.current.precipitation,
    windKph: d.current.wind_speed_10m,
    condition: WMO[d.current.weather_code] || 'Mixed',
    highC: d.daily?.temperature_2m_max?.[0],
    lowC: d.daily?.temperature_2m_min?.[0],
    precipChance: d.daily?.precipitation_probability_max?.[0],
    rainNow: hourlyRain[0]?.chance ?? null,
    rainChance: next6.length ? Math.max(...next6) : null,
    hourlyRain,
    manual: false,
    fetchedAt: Date.now(),
  };
}

/** True when the outfit should be built for rain. */
export function isWet(w) {
  if (!w) return false;
  const wetSky = /rain|drizzle|shower|storm|snow/i.test(w.condition || '');
  if (w.manual) return wetSky;
  return wetSky || (w.precipMm ?? 0) > 0 || (w.rainChance ?? 0) >= WET_THRESHOLD;
}

/** Hard dressing rules derived from the forecast, passed to Gemini as constraints. */
export function weatherRules(w) {
  if (!w) return [];
  const rules = [];
  const temp = w.feelsC ?? w.tempC;
  if (isWet(w)) {
    const detail = [w.rainChance != null && `${w.rainChance}% rain probability`, w.precipMm > 0 && `${w.precipMm} mm falling now`]
      .filter(Boolean)
      .join(', ');
    rules.push(
      `WET DAY${detail ? ` (${detail})` : ''}: do NOT pick suede, nubuck, canvas, knit or mesh sneakers, pale runners or any delicate shoe. Choose the most water-resistant footwear available: waterproof or leather boots (e.g. Timberlands, Docs, Gore-Tex hikers) first, then dark leather shoes.`,
      'Add a protective outer layer if one exists (shell, rain jacket, coach jacket, parka or anything hooded). Keep hems off wet ground: crop, cuff or stack trousers above the shoe.',
    );
  } else if ((w.rainChance ?? 0) >= 30) {
    rules.push(`Chance of showers (${w.rainChance}%): prefer footwear that tolerates a splash and include a hooded layer if possible.`);
  }
  if ((w.humidity ?? 0) >= 80 && temp >= 18) {
    rules.push(`Humid and warm (${Math.round(w.humidity)}% humidity): favor breathable cotton or linen, looser fits and fewer layers.`);
  } else if ((w.humidity ?? 0) >= 80 && temp < 10) {
    rules.push(`Damp cold (${Math.round(w.humidity)}% humidity): it will feel colder than the number, so layer with something that blocks wind and moisture.`);
  }
  if (temp < 5) rules.push('Cold: at least two top layers, one of them a warm outer piece.');
  else if (temp > 26) rules.push('Hot: one breathable top layer; skip heavy outerwear.');
  return rules;
}

const DELICATE = /suede|nubuck|canvas|mesh|knit|satin|silk|velvet|white (sneaker|runner|trainer|shoe)/i;
const RAIN_READY = /timberland|boot|gore-?tex|waterproof|rain|shell|parka|anorak|windbreaker|nylon/i;

/** Per-item tag appended to the inventory line Gemini sees on wet days. */
export function itemWeatherTag(item, w) {
  if (!isWet(w)) return '';
  if (DELICATE.test(item.name)) return ' | ⚠ rain-sensitive';
  if (RAIN_READY.test(item.name)) return ' | rain-ready';
  return '';
}

export const cToF = (c) => (c * 9) / 5 + 32;
export const fToC = (f) => ((f - 32) * 5) / 9;

export function formatTemp(c, unit = 'C') {
  if (c == null || Number.isNaN(c)) return '—';
  return `${Math.round(unit === 'F' ? cToF(c) : c)}°`;
}

/** Header strip, e.g. "KELOWNA: 11°C • 85% HUMIDITY • 75% RAIN PROBABILITY". */
export function headerLine(w, unit = 'C') {
  if (!w) return '';
  const parts = [`${formatTemp(w.tempC, unit)}${unit}`];
  if (w.humidity != null) parts.push(`${Math.round(w.humidity)}% humidity`);
  if (w.rainChance != null) parts.push(`${Math.round(w.rainChance)}% rain probability`);
  else if (w.manual) parts.push(w.condition);
  const place = w.manual ? 'Manual' : w.location?.name || 'Local';
  return `${place}: ${parts.join(' • ')}`.toUpperCase();
}

export function describeWeather(w) {
  if (!w) return 'Unknown — assume mild, around 18°C / 64°F';
  const parts = [`${Math.round(w.tempC)}°C / ${Math.round(cToF(w.tempC))}°F`, w.condition];
  if (w.location?.name && !w.manual) parts.unshift(w.location.name);
  if (w.feelsC != null) parts.push(`feels like ${Math.round(w.feelsC)}°C`);
  if (w.highC != null && w.lowC != null) parts.push(`high ${Math.round(w.highC)}°C, low ${Math.round(w.lowC)}°C`);
  if (w.humidity != null) parts.push(`relative humidity ${Math.round(w.humidity)}%`);
  if (w.precipMm != null) parts.push(`${w.precipMm} mm precipitation right now`);
  if (w.rainChance != null) parts.push(`${w.rainChance}% peak rain probability over the next 6 hours`);
  if (w.hourlyRain?.length) parts.push(`hourly rain %: ${w.hourlyRain.map((h) => `${h.hour} ${h.chance}`).join(', ')}`);
  if (w.windKph != null) parts.push(`wind ${Math.round(w.windKph)} km/h`);
  return parts.join('; ');
}

export function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
