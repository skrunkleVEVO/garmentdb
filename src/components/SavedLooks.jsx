import { useMemo } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { formatTemp } from '../lib/weather.js';
import OutfitCard from './OutfitCard.jsx';
import { EmptyState } from './ui.jsx';

export default function SavedLooks({ looks, items, unit, onDelete, onWore, goStylist }) {
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  if (!looks.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No saved looks yet"
        body="Generate a fit pack and tap the bookmark on any outfit you want to keep."
        action={
          <button type="button" className="btn-primary" onClick={goStylist}>
            <Sparkles size={17} /> Open stylist
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-[13px] text-zinc-500">
        {looks.length} saved {looks.length === 1 ? 'look' : 'looks'}. “Wore it” sends the tops and bottoms to the laundry.
      </p>
      {looks.map((look, i) => {
        const meta = [
          new Date(look.savedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          look.occasion,
          look.weather ? `${formatTemp(look.weather.tempC, unit)} ${look.weather.condition}` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <OutfitCard
            key={look.id}
            outfit={look}
            index={i}
            itemsById={itemsById}
            meta={meta}
            onWore={() => onWore(look.itemIds)}
            onDelete={() => onDelete(look.id)}
          />
        );
      })}
    </div>
  );
}
