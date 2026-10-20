import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Loader2, Luggage, MapPin } from 'lucide-react';
import BottomDock, { TABS } from './components/BottomDock.jsx';
import Closet from './components/Closet.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import AddItemsModal from './components/AddItemsModal.jsx';
import Stylist from './components/Stylist.jsx';
import SavedLooks from './components/SavedLooks.jsx';
import Settings from './components/Settings.jsx';
import LocationSheet from './components/LocationSheet.jsx';
import { cx } from './components/ui.jsx';
import { usePersistentState } from './hooks/usePersistentState.js';
import { useWeather } from './hooks/useWeather.js';
import { useCloudSync } from './hooks/useCloudSync.js';
import { APP_NAME, DEFAULT_SETTINGS, descriptor } from './lib/constants.js';
import { headerLine, isWet } from './lib/weather.js';
import { buildBackup, clearAll, deletePhoto, downloadJSON, putPhoto, restoreBackup, uid } from './lib/storage.js';

function PackingToggle({ on, onToggle, count }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cx(
        'flex items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-1.5 text-[12.5px] font-medium transition active:scale-95',
        on ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-ink/10 bg-ink/[0.04] text-zinc-400',
      )}
    >
      <Luggage size={15} />
      {on ? `Packed · ${count}` : 'Packing'}
      <span className={cx('relative h-[18px] w-[30px] rounded-full transition', on ? 'bg-amber-400' : 'bg-zinc-700')}>
        <span
          className={cx(
            'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all',
            on ? 'left-[14px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  );
}

export default function App() {
  const [items, setItems, itemsFailed] = usePersistentState('items', []);
  const [looks, setLooks, looksFailed] = usePersistentState('looks', []);
  const [storedSettings, setSettings] = usePersistentState('settings', DEFAULT_SETTINGS);
  const [weather, setWeather] = usePersistentState('weather', null);
  const [pack, setPack] = usePersistentState('lastPack', null);
  const [tab, setTab] = useState('closet');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...storedSettings }), [storedSettings]);
  const weatherState = useWeather(settings.location, weather, setWeather);
  const cloud = useCloudSync({ items, setItems, looks, setLooks, settings, setSettings });
  const selected = items.find((i) => i.id === selectedId);
  const packedCount = items.filter((i) => i.status === 'packed').length;

  const notify = useCallback((message, isError = false) => setToast({ message, isError, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (itemsFailed || looksFailed) notify('Storage is full — export a backup or remove some pieces.', true);
  }, [itemsFailed, looksFailed, notify]);

  const changeTab = (id) => {
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // ---- Items -------------------------------------------------------------
  const addItems = (staged) => {
    const created = [];
    const savedIds = [];
    for (const s of staged) {
      const id = uid();
      if (!putPhoto(id, s.photo)) break; // quota hit — stop and report
      savedIds.push(s.tempId);
      created.push({
        id,
        name: s.name.trim() || `${descriptor(s)} ${s.category}`.trim(),
        category: s.category,
        colors: s.colors,
        color: s.colors.join(', '),
        designs: s.designs,
        fit: s.fit,
        status: settings.packingMode ? 'packed' : 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    if (created.length) {
      setItems((prev) => [...created, ...prev]);
      notify(`Added ${created.length} ${created.length === 1 ? 'piece' : 'pieces'} to your closet`);
    }
    return { savedIds };
  };

  const updateItem = (next) =>
    setItems((prev) => prev.map((i) => (i.id === next.id ? { ...next, updatedAt: Date.now() } : i)));

  const deleteItem = (id) => {
    deletePhoto(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    notify('Piece removed');
  };

  const markWorn = (itemIds) => {
    const washable = (i) =>
      itemIds.includes(i.id) && ['Top', 'Shirt', 'Bottom'].includes(i.category) && i.status !== 'retired';
    const moved = items.filter(washable).length;
    setItems((prev) => prev.map((i) => (washable(i) ? { ...i, status: 'laundry', updatedAt: Date.now() } : i)));
    notify(moved ? `Sent ${moved} to the laundry` : 'Nothing to wash');
  };

  // ---- Looks -------------------------------------------------------------
  const isSaved = (outfitId) => looks.some((l) => l.outfitId === outfitId);

  const toggleSaveLook = (outfit, fromPack) => {
    if (isSaved(outfit.id)) {
      setLooks((prev) => prev.filter((l) => l.outfitId !== outfit.id));
      return;
    }
    setLooks((prev) => [
      { ...outfit, id: uid(), outfitId: outfit.id, savedAt: Date.now(), weather: fromPack.weather, occasion: fromPack.occasion },
      ...prev,
    ]);
    notify('Saved to Fit Packs');
  };

  // ---- Data --------------------------------------------------------------
  const exportData = () => {
    downloadJSON(buildBackup({ items, looks, settings }), `garmentdb-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const importData = (data) => {
    const restored = restoreBackup(data);
    setItems(restored.items);
    setLooks(restored.looks);
    setSettings((s) => ({ ...s, ...restored.settings, apiKey: s.apiKey }));
    notify(`Restored ${restored.items.length} pieces`);
  };

  const resetAll = async () => {
    try {
      if (cloud.user) await cloud.eraseCloud();
    } catch (e) {
      notify(e.message || 'Could not erase the cloud copy', true);
      return;
    }
    clearAll();
    window.location.reload();
  };

  const title = TABS.find((t) => t.id === tab)?.title;

  return (
    <div className="relative min-h-[100dvh]">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-72 w-72 rounded-full bg-teal-400/[0.05] blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-ink/5 bg-zinc-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
              {APP_NAME}
            </p>
            <h1 className="truncate text-[18px] font-semibold leading-tight tracking-tight">{title}</h1>
          </div>
          <PackingToggle
            on={settings.packingMode}
            count={packedCount}
            onToggle={() => setSettings((s) => ({ ...s, packingMode: !settings.packingMode }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setLocationOpen(true)}
          aria-label={`Weather for ${settings.location.name}. Change location`}
          className="mx-auto flex h-8 w-full max-w-lg items-center gap-1.5 px-4 text-left text-[10px] font-medium tracking-[0.05em] text-zinc-400 active:text-zinc-200"
        >
          {weatherState.loading && !weather ? (
            <Loader2 size={12} className="shrink-0 animate-spin" />
          ) : (
            <MapPin size={12} className={cx('shrink-0', isWet(weather) ? 'text-sky-300' : 'text-emerald-400')} />
          )}
          <span className="truncate tabular-nums">
            {weather
              ? headerLine(weather, settings.unit)
              : weatherState.error
                ? `${settings.location.name.toUpperCase()}: WEATHER UNAVAILABLE`
                : `${settings.location.name.toUpperCase()}: LOADING WEATHER…`}
          </span>
        </button>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+170px)] pt-4">
        {tab === 'closet' && (
          <Closet items={items} packingMode={settings.packingMode} onOpenItem={setSelectedId} onAdd={() => setAddOpen(true)} />
        )}
        {tab === 'stylist' && (
          <Stylist
            items={items}
            settings={settings}
            weather={weather}
            setWeather={setWeather}
            weatherState={weatherState}
            onPickLocation={() => setLocationOpen(true)}
            pack={pack}
            setPack={setPack}
            isSaved={isSaved}
            onToggleSave={toggleSaveLook}
            goSettings={() => changeTab('settings')}
          />
        )}
        {tab === 'looks' && (
          <SavedLooks
            looks={looks}
            items={items}
            unit={settings.unit}
            onDelete={(id) => setLooks((prev) => prev.filter((l) => l.id !== id))}
            onWore={markWorn}
            goStylist={() => changeTab('stylist')}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            items={items}
            onExport={exportData}
            onImport={importData}
            onReset={resetAll}
            notify={notify}
            cloud={cloud}
          />
        )}
      </main>

      <BottomDock tab={tab} onChange={changeTab} badges={{ looks: looks.length }} />

      <AddItemsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={addItems}
        apiKey={settings.apiKey}
        packingMode={settings.packingMode}
      />
      {selected && (
        <ItemSheet
          key={selected.id}
          item={selected}
          onClose={() => setSelectedId(null)}
          onSave={updateItem}
          onDelete={deleteItem}
        />
      )}

      <LocationSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        location={settings.location}
        onChange={(location) => {
          setSettings((s) => ({ ...s, location }));
          if (weather?.manual) setWeather(null); // picking a city switches back to live weather
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+96px)] z-[60] flex justify-center px-4">
          <div
            key={toast.id}
            role="status"
            className={cx(
              'glass flex animate-toast-in items-center gap-2 !rounded-full !bg-zinc-900/90 px-4 py-2 text-[13px] shadow-xl shadow-ink/15',
              toast.isError ? 'text-rose-200' : 'text-zinc-100',
            )}
          >
            {toast.isError ? (
              <CircleAlert size={15} />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
