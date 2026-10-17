import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORIES, COLOR_SWATCHES, DESIGNS, MAX_COLORS, fitOptions, swatchFor } from '../lib/constants.js';
import { Segmented, Swatch, cx } from './ui.jsx';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

function Pill({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition active:scale-95',
        active ? 'border-zinc-100 bg-zinc-100 text-zinc-950' : 'border-ink/10 bg-ink/[0.03] text-zinc-400 hover:text-zinc-200',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Multi-select tag editor. Chosen tags show first (tap to remove), then a row of
 * presets to add, then a free-text field for anything else ("sage", "Y2K flames").
 */
function TagPicker({ label, hint, presets, value, onChange, max, swatches, placeholder, listId }) {
  const [draft, setDraft] = useState('');
  const full = max != null && value.length >= max;
  const remaining = presets.filter((p) => !value.some((v) => same(v, p)));

  const add = (tag) => {
    const t = tag.trim();
    if (!t || full || value.some((v) => same(v, t))) return;
    onChange([...value, t]);
  };
  const remove = (tag) => onChange(value.filter((v) => v !== tag));
  const submit = () => {
    add(draft);
    setDraft('');
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="label">{label}</p>
        {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
      </div>

      <div className="flex min-h-[34px] flex-wrap gap-1.5">
        {value.length === 0 && <span className="py-1.5 text-[13px] text-zinc-600">None selected</span>}
        {value.map((v) => (
          <Pill key={v} active onClick={() => remove(v)}>
            {swatches && <Swatch color={swatchFor(v)} className="h-3 w-3 !border-ink/30" />}
            {v}
            <X size={12} className="-mr-0.5 opacity-60" />
          </Pill>
        ))}
      </div>

      {remaining.length > 0 && !full && (
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {remaining.map((p) => (
            <Pill key={p} onClick={() => add(p)}>
              {swatches && <Swatch color={COLOR_SWATCHES[p]} className="h-3 w-3" />}
              {p}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          className="input !py-2"
          placeholder={full ? `Max ${max}. Remove one to add more` : placeholder}
          value={draft}
          disabled={full}
          list={listId}
          autoCapitalize="words"
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="button" className="btn-ghost !px-3" onClick={submit} disabled={!draft.trim() || full} aria-label={`Add ${label.toLowerCase()}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Shared editor for name / category / colors / designs / fit.
 * Fit only appears for tops and bottoms and can be left on "None".
 */
export default function ItemFields({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const fits = fitOptions(value.category, value.fit);

  const setCategory = (category) => {
    const next = fitOptions(category);
    set({ category, fit: next?.includes(value.fit) ? value.fit : '' });
  };

  return (
    <div className="space-y-4">
      <input
        className="input"
        placeholder="Name, e.g. Washed Black Boxy Tee"
        value={value.name}
        onChange={(e) => set({ name: e.target.value })}
        autoCapitalize="words"
      />

      <div>
        <p className="label mb-1.5">Category</p>
        <Segmented options={CATEGORIES} value={value.category} onChange={setCategory} />
      </div>

      <TagPicker
        label="Colors"
        hint={`up to ${MAX_COLORS}, main color first`}
        presets={Object.keys(COLOR_SWATCHES)}
        value={value.colors || []}
        onChange={(colors) => set({ colors, color: colors.join(', ') })}
        max={MAX_COLORS}
        swatches
        placeholder="Add a color, e.g. Sage"
        listId="dc-colors"
      />

      <TagPicker
        label="Design"
        hint="optional"
        presets={DESIGNS}
        value={value.designs || []}
        onChange={(designs) => set({ designs })}
        placeholder="Graphic, washed, striped…"
      />

      {fits && (
        <div>
          <p className="label mb-1.5">Fit</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={!value.fit} onClick={() => set({ fit: '' })}>
              None
            </Pill>
            {fits.map((f) => (
              <Pill key={f} active={value.fit === f} onClick={() => set({ fit: f })}>
                {f}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
