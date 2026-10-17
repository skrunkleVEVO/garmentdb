import { Bookmark, BookmarkCheck, Palette, Ruler, Thermometer, Trash2, WashingMachine } from 'lucide-react';
import { CATEGORIES, swatchFor } from '../lib/constants.js';
import { Glass, Photo, Swatch, cx } from './ui.jsx';

const order = (item) => (item ? CATEGORIES.indexOf(item.category) : 99);

export default function OutfitCard({ outfit, index, itemsById, saved, onToggleSave, onWore, onDelete, meta }) {
  const pieces = outfit.itemIds.map((id) => ({ id, item: itemsById[id] })).sort((a, b) => order(a.item) - order(b.item));
  const cols = pieces.length <= 3 ? pieces.length : pieces.length === 4 ? 4 : 3;

  return (
    <Glass className="animate-rise overflow-hidden" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="label truncate">
            Fit {String(index + 1).padStart(2, '0')}
            {outfit.vibe && <span className="text-emerald-300/80"> · {outfit.vibe}</span>}
          </p>
          <h3 className="mt-1 text-[18px] font-semibold leading-tight tracking-tight">{outfit.name}</h3>
          {meta && <p className="mt-1 text-[12px] text-zinc-500">{meta}</p>}
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={saved ? 'Unsave look' : 'Save look'}
            className={cx(
              'btn !rounded-full !p-2.5',
              saved ? 'bg-emerald-400 text-zinc-950' : 'border border-white/10 bg-white/[0.04] text-zinc-300',
            )}
          >
            {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        )}
      </div>

      <div className="grid gap-2 px-4" style={{ gridTemplateColumns: `repeat(${Math.max(cols, 1)}, minmax(0, 1fr))` }}>
        {pieces.map(({ id, item }) => (
          <div key={id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
            <Photo id={id} alt={item?.name} className="h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-6">
              <p className="truncate text-[11px] font-medium leading-tight text-zinc-100">{item?.name || 'Removed piece'}</p>
              <p className="truncate text-[9.5px] uppercase tracking-wider text-zinc-400">{item?.category || '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 p-4 text-[13.5px] leading-relaxed text-zinc-300">
        {outfit.silhouette && (
          <p className="flex items-start gap-2.5">
            <Ruler size={15} className="mt-0.5 shrink-0 text-zinc-500" />
            <span className="font-medium text-zinc-100">{outfit.silhouette}</span>
          </p>
        )}
        {outfit.colorStory && (
          <p className="flex items-start gap-2.5">
            <Palette size={15} className="mt-0.5 shrink-0 text-zinc-500" />
            <span>
              <span className="mr-1.5 inline-flex translate-y-[1px] -space-x-1">
                {pieces
                  .filter((p) => p.item)
                  .map((p) => (
                    <Swatch key={p.id} color={swatchFor(p.item.color)} className="h-3 w-3" />
                  ))}
              </span>
              {outfit.colorStory}
            </span>
          </p>
        )}
        <p className="text-zinc-400">{outfit.rationale}</p>
        {outfit.weatherNote && (
          <p className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[12.5px] text-zinc-400">
            <Thermometer size={14} className="mt-0.5 shrink-0 text-emerald-300/80" />
            {outfit.weatherNote}
          </p>
        )}

        {(onWore || onDelete) && (
          <div className="flex gap-2 pt-1">
            {onWore && (
              <button type="button" className="btn-ghost flex-1 !py-2 !text-[13px]" onClick={onWore}>
                <WashingMachine size={15} /> Wore it → laundry
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn-danger !py-2 !text-[13px]" onClick={onDelete} aria-label="Delete look">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </Glass>
  );
}
