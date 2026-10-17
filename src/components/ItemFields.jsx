import { CATEGORIES, FITS, swatchFor } from '../lib/constants.js';
import { Segmented, Swatch } from './ui.jsx';

/** Shared editor for name / color / category / fit. Uses the #dc-colors datalist rendered in App. */
export default function ItemFields({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          className="input"
          placeholder="Name — e.g. Washed Black Boxy Tee"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          autoCapitalize="words"
        />
        <label className="relative block">
          <Swatch color={swatchFor(value.color)} className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            className="input pl-8"
            placeholder="Color"
            list="dc-colors"
            value={value.color}
            onChange={(e) => set({ color: e.target.value })}
            autoCapitalize="words"
          />
        </label>
      </div>
      <div>
        <p className="label mb-1.5">Category</p>
        <Segmented options={CATEGORIES} value={value.category} onChange={(category) => set({ category })} />
      </div>
      <div>
        <p className="label mb-1.5">Fit</p>
        <Segmented options={FITS} value={value.fit} onChange={(fit) => set({ fit })} />
      </div>
    </div>
  );
}
