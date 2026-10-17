import { useMemo, useState } from 'react';
import { Luggage, Plus, Search, Shirt } from 'lucide-react';
import { CATEGORIES, STATUSES, STATUS_BY_ID, swatchFor } from '../lib/constants.js';
import { Chip, EmptyState, Glass, Photo, StatusDot, Swatch, cx } from './ui.jsx';

function ItemCard({ item, index, onOpen }) {
  const status = STATUS_BY_ID[item.status] || STATUS_BY_ID.active;
  const dimmed = item.status === 'laundry' || item.status === 'retired';
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="glass group animate-rise overflow-hidden text-left transition active:scale-[0.98]"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
        <Photo id={item.id} alt={item.name} className={cx('h-full w-full transition', dimmed && 'opacity-50 grayscale-[40%]')} />
        <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10.5px] font-medium text-zinc-200 backdrop-blur-md">
          <StatusDot status={item.status} />
          {status.short}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
          {item.fit}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-[14px] font-medium tracking-tight">{item.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-500">
          <Swatch color={swatchFor(item.color)} className="h-2.5 w-2.5" />
          <span className="truncate">
            {item.color || '—'} · {item.category}
          </span>
        </p>
      </div>
    </button>
  );
}

export default function Closet({ items, packingMode, onOpenItem, onAdd }) {
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.id, 0]));
    items.forEach((it) => (c[it.status] = (c[it.status] || 0) + 1));
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => (packingMode ? it.status === 'packed' : status === 'all' || it.status === status))
      .filter((it) => category === 'All' || it.category === category)
      .filter((it) => !q || `${it.name} ${it.color} ${it.fit} ${it.category}`.toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [items, packingMode, status, category, query]);

  if (!items.length) {
    return (
      <EmptyState
        icon={Shirt}
        title="Your closet is empty"
        body="Snap or upload your clothes once — they're saved on this device, so you never catalog them again."
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus size={18} /> Add items
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {packingMode ? (
        <Glass className="flex items-center gap-3 !border-amber-400/20 !bg-amber-400/[0.06] p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Luggage size={18} />
          </div>
          <p className="text-[13px] leading-snug text-zinc-300">
            <span className="font-semibold text-amber-200">Packing mode.</span> Showing the {counts.packed} pieces in your suitcase —
            the stylist only uses these.
          </p>
        </Glass>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(status === s.id ? 'all' : s.id)}
              className={cx(
                'glass px-2.5 py-2.5 text-left transition active:scale-95',
                status === s.id && '!border-white/25 !bg-white/[0.07]',
              )}
            >
              <div className="flex items-center gap-1.5">
                <StatusDot status={s.id} />
                <span className="text-[17px] font-semibold tabular-nums leading-none">{counts[s.id]}</span>
              </div>
              <p className="mt-1.5 truncate text-[10.5px] font-medium uppercase tracking-wider text-zinc-500">{s.short}</p>
            </button>
          ))}
        </div>
      )}

      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          className="input pl-10"
          type="search"
          placeholder={`Search ${items.length} pieces`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {['All', ...CATEGORIES].map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {{ Top: 'Tops', Bottom: 'Bottoms', Accessory: 'Accessories' }[c] || c}
          </Chip>
        ))}
      </div>

      {visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} onOpen={onOpenItem} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={packingMode ? Luggage : Search}
          title={packingMode ? 'Nothing packed yet' : 'No matches'}
          body={
            packingMode
              ? 'Turn off packing mode, open a piece and set its status to “Packed for Trip”.'
              : 'Try a different filter or search.'
          }
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-30">
        <div className="mx-auto flex max-w-lg justify-end px-4">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add items"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-300 active:scale-90"
          >
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
