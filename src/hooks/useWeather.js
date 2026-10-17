import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeather, sameLocation } from '../lib/weather.js';

const STALE_MS = 30 * 60 * 1000;

/**
 * Keeps live weather for `location` fresh: fetches on load, when the location
 * changes, every 30 minutes and when the app comes back to the foreground.
 * Manual weather is left alone until the user refreshes or changes city.
 */
export function useWeather(location, weather, setWeather) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef({ location, weather });
  latest.current = { location, weather };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setWeather(await fetchWeather(latest.current.location));
    } catch (e) {
      setError(e.message || 'Weather unavailable.');
    } finally {
      setLoading(false);
    }
  }, [setWeather]);

  const refreshIfStale = useCallback(() => {
    const { location: loc, weather: w } = latest.current;
    if (w?.manual) return;
    if (!w || !sameLocation(w.location, loc) || Date.now() - w.fetchedAt > STALE_MS) refresh();
  }, [refresh]);

  useEffect(refreshIfStale, [location.lat, location.lon, refreshIfStale]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refreshIfStale();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(refreshIfStale, STALE_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [refreshIfStale]);

  return { loading, error, refresh };
}
