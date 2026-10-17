import { useEffect, useState } from 'react';
import { Check, Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import { PRESET_LOCATIONS, locateMe, sameLocation, searchLocations } from '../lib/weather.js';
import { Sheet, cx } from './ui.jsx';

function Row({ loc, active, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(loc)}
      className={cx(
        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition active:scale-[0.99]',
        active ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]',
      )}
    >
      <MapPin size={16} className={active ? 'text-emerald-300' : 'text-zinc-500'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{loc.name}</span>
        {loc.region && <span className="block truncate text-[12px] text-zinc-500">{loc.region}</span>}
      </span>
      {active && <Check size={16} className="text-emerald-300" />}
    </button>
  );
}

export default function LocationSheet({ open, onClose, location, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError('');
    }
  }, [open]);

  // Debounced city search.
  useEffect(() => {
    if (query.trim().length < 2) return setResults([]);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchLocations(query, controller.signal));
        setError('');
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const pick = (loc) => {
    onChange(loc);
    onClose();
  };

  const useGps = async () => {
    setLocating(true);
    setError('');
    try {
      pick(await locateMe());
    } catch (e) {
      setError(e.message);
    } finally {
      setLocating(false);
    }
  };

  const list = query.trim().length >= 2 ? results : PRESET_LOCATIONS;

  return (
    <Sheet open={open} onClose={onClose} title="Weather location" subtitle={`Now: ${location.name}`}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          className="input pl-10"
          placeholder="Search any city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        {searching && <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
      </div>

      <button type="button" className="btn-ghost mt-3 w-full !text-[13px]" onClick={useGps} disabled={locating}>
        {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} Use my current location
      </button>

      {error && <p className="mt-3 text-[12.5px] text-rose-300">{error}</p>}

      <p className="label mb-2 mt-5">{query.trim().length >= 2 ? 'Results' : 'Okanagan & nearby'}</p>
      <div className="space-y-2">
        {list.map((loc) => (
          <Row key={`${loc.lat},${loc.lon}`} loc={loc} active={sameLocation(loc, location)} onPick={pick} />
        ))}
        {query.trim().length >= 2 && !searching && !results.length && !error && (
          <p className="py-4 text-center text-[13px] text-zinc-500">No cities match “{query.trim()}”.</p>
        )}
      </div>
    </Sheet>
  );
}
