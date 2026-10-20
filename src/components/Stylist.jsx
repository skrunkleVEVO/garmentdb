import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  CloudRain,
  Droplets,
  KeyRound,
  Loader2,
  Luggage,
  MapPin,
  Pencil,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Umbrella,
  Wand2,
} from 'lucide-react';
import { CATEGORIES, OCCASIONS } from '../lib/constants.js';
import { generateFitPack } from '../lib/gemini.js';
import { MANUAL_CONDITIONS, WET_THRESHOLD, cToF, fToC, formatTemp, isWet, timeAgo } from '../lib/weather.js';
import OutfitCard from './OutfitCard.jsx';
import { Chip, Glass, cx } from './ui.jsx';

function Metric({ icon: Icon, label, value, warn }) {
  return (
    <div className={cx('rounded-xl border px-2.5 py-2', warn ? 'border-sky-400/30 bg-sky-400/10' : 'border-ink/5 bg-ink/[0.03]')}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
        <Icon size={11} /> {label}
      </p>
      <p className={cx('mt-0.5 text-[15px] font-semibold tabular-nums', warn && 'text-sky-200')}>{value}</p>
    </div>
  );
}

function RainBars({ hours }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Rain probability · next 12h</p>
      <div className="flex h-12 items-end gap-1">
        {hours.map((h) => (
          <div key={h.hour} className="flex h-full flex-1 flex-col justify-end" title={`${h.hour} · ${h.chance}%`}>
            <div
              className={cx('w-full rounded-sm', h.chance >= WET_THRESHOLD ? 'bg-sky-400' : 'bg-sky-400/30')}
              style={{ height: `${Math.max(4, h.chance)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-600">
        <span>{hours[0]?.hour}</span>
        <span>{hours[hours.length - 1]?.hour}</span>
      </div>
    </div>
  );
}

function WeatherCard({ weather, setWeather, unit, location, loading, error, onRefresh, onPickLocation }) {
  const [editing, setEditing] = useState(false);
  const [manualTemp, setManualTemp] = useState('');
  const [manualCond, setManualCond] = useState('Clear');
  const wet = isWet(weather);

  const startEdit = () => {
    setManualTemp(weather ? String(Math.round(unit === 'F' ? cToF(weather.tempC) : weather.tempC)) : '');
    setManualCond(MANUAL_CONDITIONS.includes(weather?.condition) ? weather.condition : 'Clear');
    setEditing(true);
  };

  const saveManual = () => {
    const t = parseFloat(manualTemp);
    if (Number.isNaN(t)) return;
    setWeather({ tempC: unit === 'F' ? fToC(t) : t, condition: manualCond, manual: true, fetchedAt: Date.now() });
    setEditing(false);
  };

  const live = () => {
    setEditing(false);
    onRefresh();
  };

  return (
    <Glass className="p-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onPickLocation} className="label flex min-w-0 items-center gap-1.5 hover:text-zinc-300">
          <MapPin size={13} /> <span className="truncate">{weather?.manual ? 'Manual weather' : location.name}</span>
          <ChevronDown size={13} />
        </button>
        <div className="flex gap-1.5">
          <button type="button" className="btn-ghost !rounded-full !p-2" onClick={startEdit} aria-label="Set weather manually">
            <Pencil size={14} />
          </button>
          <button type="button" className="btn-ghost !rounded-full !p-2" onClick={live} aria-label="Refresh live weather">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {MANUAL_CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setManualCond(c)}
                className={cx(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition active:scale-95',
                  manualCond === c ? 'border-zinc-100 bg-zinc-100 text-zinc-950' : 'border-ink/10 bg-ink/[0.03] text-zinc-400',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={`°${unit}`}
            value={manualTemp}
            onChange={(e) => setManualTemp(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={saveManual}>
            Set
          </button>
          </div>
        </div>
      ) : weather ? (
        <>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-[44px] font-semibold leading-none tracking-tighter">{formatTemp(weather.tempC, unit)}</p>
              <p className="mt-1.5 text-[14px] text-zinc-300">{weather.condition}</p>
            </div>
            <div className="text-right text-[12px] leading-relaxed text-zinc-500">
              {weather.feelsC != null && <p>Feels {formatTemp(weather.feelsC, unit)}</p>}
              {weather.highC != null && (
                <p>
                  H {formatTemp(weather.highC, unit)} · L {formatTemp(weather.lowC, unit)}
                </p>
              )}
              <p className="flex items-center justify-end gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" />
                {weather.manual ? 'Manual' : 'Live'} · {timeAgo(weather.fetchedAt)}
              </p>
            </div>
          </div>

          {!weather.manual && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric icon={Droplets} label="Humidity" value={`${Math.round(weather.humidity ?? 0)}%`} warn={weather.humidity >= 80} />
                <Metric icon={Umbrella} label="Rain 6h" value={`${weather.rainChance ?? 0}%`} warn={weather.rainChance >= WET_THRESHOLD} />
                <Metric icon={CloudRain} label="Now" value={`${weather.precipMm ?? 0} mm`} warn={weather.precipMm > 0} />
              </div>
              {weather.hourlyRain?.length > 0 && <RainBars hours={weather.hourlyRain} />}
            </>
          )}

          {wet && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[12.5px] leading-relaxed text-sky-100">
              <Umbrella size={14} className="mt-0.5 shrink-0" />
              Rain-safe styling is on: suede and canvas sneakers sit this one out, boots and shell layers get priority.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-[13.5px] text-zinc-400">
          {loading ? 'Pulling the forecast…' : 'Weather unavailable. Tap refresh, or set it manually.'}
        </p>
      )}
      {error && !editing && <p className="mt-2 text-[12.5px] text-rose-300">{error}</p>}
    </Glass>
  );
}

export default function Stylist({
  items,
  settings,
  weather,
  setWeather,
  weatherState,
  onPickLocation,
  pack,
  setPack,
  isSaved,
  onToggleSave,
  goSettings,
}) {
  const [occasion, setOccasion] = useState('Everyday');
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  const { packingMode, apiKey, unit } = settings;

  const pool = useMemo(
    () => items.filter((i) => (packingMode ? i.status === 'packed' : i.status === 'active')),
    [items, packingMode],
  );
  const catCounts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, pool.filter((i) => i.category === c).length])),
    [pool],
  );
  const missing = ['Top', 'Bottom', 'Footwear'].filter((c) => !catCounts[c]);
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await generateFitPack({
        apiKey,
        items: pool,
        weather,
        occasion: [occasion, extra.trim()].filter(Boolean).join(' — '),
        styleNotes: settings.styleNotes,
        packingMode,
        signal: controller.signal,
      });
      setPack(result);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Something went wrong.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <WeatherCard
        weather={weather}
        setWeather={setWeather}
        unit={unit}
        location={settings.location}
        loading={weatherState.loading}
        error={weatherState.error}
        onRefresh={weatherState.refresh}
        onPickLocation={onPickLocation}
      />

      <Glass className="p-4">
        <div className="flex items-center justify-between">
          <p className="label flex items-center gap-1.5">
            {packingMode ? <Luggage size={13} className="text-amber-300" /> : <Wand2 size={13} />}
            {packingMode ? 'Suitcase only' : 'Active rotation'}
          </p>
          <p className="text-[13px] text-zinc-400">
            <span className="font-semibold text-zinc-100">{pool.length}</span> pieces
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {CATEGORIES.map((c) => (
            <div key={c} className="rounded-xl border border-ink/5 bg-ink/[0.03] py-2">
              <p className={cx('text-[16px] font-semibold tabular-nums', !catCounts[c] && 'text-zinc-600')}>{catCounts[c]}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{c}</p>
            </div>
          ))}
        </div>
        {missing.length > 0 && pool.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-amber-200/80">
            <TriangleAlert size={14} /> No {missing.join(' / ').toLowerCase()} available — fits may be incomplete.
          </p>
        )}
      </Glass>

      <div>
        <p className="label mb-2 px-1">Occasion</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>
              {o}
            </Chip>
          ))}
        </div>
        <input
          className="input mt-2.5"
          placeholder="Anything else? e.g. lots of walking, all-black, show the new jacket"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
      </div>

      {!apiKey ? (
        <Glass className="flex items-center gap-3 p-4">
          <KeyRound size={20} className="shrink-0 text-zinc-400" />
          <p className="flex-1 text-[13.5px] text-zinc-400">Add your free Gemini API key to start styling.</p>
          <button type="button" className="btn-primary !py-2" onClick={goSettings}>
            Add key
          </button>
        </Glass>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={loading || pool.length < 3}
          className="relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 text-[15px] font-semibold text-zinc-950 shadow-xl shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 size={19} className="animate-spin" /> Styling three fits…
            </>
          ) : (
            <>
              <Sparkles size={19} /> {pack ? 'Regenerate Fit Pack' : 'Generate Streetwear Fit Pack'}
            </>
          )}
        </button>
      )}
      {apiKey && pool.length < 3 && (
        <p className="text-center text-[12.5px] text-zinc-500">
          Need at least 3 {packingMode ? 'packed' : 'active'} pieces to style.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-200">{error}</p>
      )}

      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Glass key={i} className="relative h-64 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ink/[0.05] to-transparent" />
            </Glass>
          ))}
        </div>
      )}

      {!loading && pack && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between px-1 pt-2">
            <h2 className="text-[15px] font-semibold tracking-tight">Your fit pack</h2>
            <p className="text-[12px] text-zinc-500">
              {new Date(pack.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          {pack.outfits.map((o, i) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              index={i}
              itemsById={itemsById}
              saved={isSaved(o.id)}
              onToggleSave={() => onToggleSave(o, pack)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
