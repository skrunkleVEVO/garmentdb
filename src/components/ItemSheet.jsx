import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { STATUSES, descriptor, normalizeItem } from '../lib/constants.js';
import ItemFields from './ItemFields.jsx';
import { Photo, Sheet, StatusDot, cx } from './ui.jsx';

/** Detail / edit sheet for one item. Mount with key={item.id} so the draft resets per item. */
export default function ItemSheet({ item, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => normalizeItem(item));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    onSave({ ...draft, name: draft.name.trim() || `${descriptor(draft)} ${draft.category}`.trim() });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.name}
      subtitle={`Added ${new Date(item.createdAt).toLocaleDateString()}`}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            className={cx('btn-danger', confirmDelete && '!bg-rose-500 !text-white')}
            onClick={() => (confirmDelete ? onDelete(item.id) : setConfirmDelete(true))}
          >
            <Trash2 size={16} />
            {confirmDelete ? 'Tap to confirm' : 'Delete'}
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            <Check size={18} /> Save changes
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-ink/10">
          <Photo id={item.id} alt={item.name} className="aspect-square w-full" />
        </div>

        <div>
          <p className="label mb-2">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDraft({ ...draft, status: s.id })}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition active:scale-[0.97]',
                  draft.status === s.id
                    ? 'border-ink/25 bg-ink/[0.08] text-zinc-50'
                    : 'border-ink/10 bg-zinc-950/50 text-zinc-500',
                )}
              >
                <StatusDot status={s.id} className={draft.status === s.id ? '' : 'opacity-50'} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <ItemFields value={draft} onChange={setDraft} />
      </div>
    </Sheet>
  );
}
