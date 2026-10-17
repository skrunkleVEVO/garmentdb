import { useCallback, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Save, Sparkles, X } from 'lucide-react';
import { compressImage } from '../lib/image.js';
import { analyzeItemPhoto } from '../lib/gemini.js';
import { uid } from '../lib/storage.js';
import ItemFields from './ItemFields.jsx';
import { Glass, Sheet } from './ui.jsx';

/**
 * Batch import. Staged items stay in memory while the sheet is closed,
 * so an accidental swipe-away doesn't lose a half-cataloged batch.
 */
export default function AddItemsModal({ open, onClose, onSave, apiKey, packingMode }) {
  const [staged, setStaged] = useState([]);
  const [reading, setReading] = useState(0);
  const [tagging, setTagging] = useState(null); // { done, total }
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const cancelTagging = useRef(false);

  const handleFiles = async (fileList) => {
    const files = [...(fileList || [])];
    setError('');
    setReading((n) => n + files.length);
    for (const file of files) {
      try {
        const { dataUrl, color } = await compressImage(file);
        setStaged((s) => [...s, { tempId: uid(), photo: dataUrl, name: '', color, category: 'Top', fit: 'Oversized', tagged: false }]);
      } catch {
        setError(`Couldn't read ${file.name}. Try a JPEG or PNG.`);
      } finally {
        setReading((n) => n - 1);
      }
    }
  };

  const onPick = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const update = (tempId, next) => setStaged((s) => s.map((x) => (x.tempId === tempId ? { ...x, ...next } : x)));
  const removeStaged = (tempId) => setStaged((s) => s.filter((x) => x.tempId !== tempId));

  const autoTag = async () => {
    const targets = staged.filter((s) => !s.tagged);
    cancelTagging.current = false;
    setError('');
    setTagging({ done: 0, total: targets.length });
    for (const t of targets) {
      if (cancelTagging.current) break;
      try {
        const r = await analyzeItemPhoto(apiKey, t.photo);
        setStaged((s) =>
          s.map((x) =>
            x.tempId === t.tempId
              ? { ...x, name: x.name || r.name, category: r.category, color: r.color || x.color, fit: r.fit, tagged: true }
              : x,
          ),
        );
      } catch (e) {
        setError(e.message);
        break;
      }
      setTagging((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setTagging(null);
  };

  const save = () => {
    const { savedIds } = onSave(staged);
    const remaining = staged.filter((s) => !savedIds.includes(s.tempId));
    setStaged(remaining);
    if (remaining.length) {
      setError(
        `Storage is full — saved ${savedIds.length}, ${remaining.length} left. Free space by deleting retired pieces or exporting a backup.`,
      );
    } else {
      onClose();
    }
  };

  const close = useCallback(() => {
    cancelTagging.current = true;
    onClose();
  }, [onClose]);

  const busy = reading > 0 || !!tagging;

  return (
    <Sheet
      open={open}
      onClose={close}
      tall
      title="Add items"
      subtitle={
        packingMode ? 'New pieces will be marked Packed for Trip.' : 'Batch-catalog once. Everything stays on this device.'
      }
      footer={
        staged.length > 0 && (
          <div className="space-y-2">
            {apiKey && (
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={tagging ? () => (cancelTagging.current = true) : autoTag}
                disabled={reading > 0 || (!tagging && staged.every((s) => s.tagged))}
              >
                {tagging ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Tagging {tagging.done}/{tagging.total} — tap to stop
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-emerald-300" /> Auto-tag with Gemini
                  </>
                )}
              </button>
            )}
            <button type="button" className="btn-primary w-full !py-3.5" onClick={save} disabled={busy}>
              <Save size={18} /> Save {staged.length} {staged.length === 1 ? 'item' : 'items'}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="glass flex flex-col items-center gap-2 py-6 transition active:scale-[0.97]"
          >
            <Camera size={24} className="text-emerald-300" />
            <span className="text-[14px] font-medium">Snap photo</span>
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            className="glass flex flex-col items-center gap-2 py-6 transition active:scale-[0.97]"
          >
            <ImagePlus size={24} className="text-emerald-300" />
            <span className="text-[14px] font-medium">Choose many</span>
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
          <input ref={libraryRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        </div>

        {!staged.length && !reading && (
          <p className="px-2 text-center text-[13px] leading-relaxed text-zinc-500">
            Tip: lay each piece flat on a plain background. Photos are compressed to ~50 KB each so a full wardrobe fits on
            your phone.{apiKey ? ' Gemini can auto-fill names, categories, colors and fits.' : ''}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-200">{error}</p>
        )}

        {staged.map((s, i) => (
          <Glass key={s.tempId} className="animate-rise p-3">
            <div className="mb-3 flex items-center gap-3">
              <img src={s.photo} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="label">Item {i + 1}</p>
                <p className="mt-1 truncate text-[14px] font-medium">{s.name || 'Untitled'}</p>
                {s.tagged && <p className="mt-0.5 text-[11.5px] text-emerald-300/80">Tagged by Gemini</p>}
              </div>
              <button
                type="button"
                onClick={() => removeStaged(s.tempId)}
                aria-label="Remove"
                className="btn-ghost !rounded-full !p-2"
              >
                <X size={16} />
              </button>
            </div>
            <ItemFields value={s} onChange={(next) => update(s.tempId, next)} />
          </Glass>
        ))}

        {reading > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Processing {reading} photo{reading > 1 ? 's' : ''}…
          </div>
        )}
      </div>
    </Sheet>
  );
}
