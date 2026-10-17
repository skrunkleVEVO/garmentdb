import { useEffect } from 'react';
import { Shirt, X } from 'lucide-react';
import { STATUS_BY_ID, swatchFor } from '../lib/constants.js';
import { getPhoto } from '../lib/storage.js';

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export function Glass({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('glass', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Chip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95',
        active
          ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
          : 'border-ink/10 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Equal-width segmented control. options: string[] or {value,label}[] */
export function Segmented({ options, value, onChange, className }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div
      className={cx('grid gap-1 rounded-xl border border-ink/10 bg-zinc-950/60 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))` }}
    >
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'truncate rounded-lg px-1.5 py-2 text-[12.5px] font-medium transition',
            value === o.value ? 'bg-ink/10 text-zinc-50 shadow-inner' : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusDot({ status, className }) {
  const s = STATUS_BY_ID[status] || STATUS_BY_ID.active;
  return <span className={cx('inline-block h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_8px]', s.dot, s.glow, className)} />;
}

export function Photo({ id, alt = '', className }) {
  const src = getPhoto(id);
  if (!src) {
    return (
      <div className={cx('flex items-center justify-center bg-zinc-900 text-zinc-700', className)}>
        <Shirt size={28} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} className={cx('object-cover', className)} />;
}

/** Overlapping dots for an item's colors (up to 4). */
export function Swatches({ colors, className }) {
  if (!colors?.length) return <Swatch color="#a1a1aa" className={className} />;
  return (
    <span className="inline-flex -space-x-1">
      {colors.slice(0, 4).map((c) => (
        <Swatch key={c} color={swatchFor(c)} className={className} />
      ))}
    </span>
  );
}

export function Swatch({ color, className }) {
  return <span className={cx('inline-block shrink-0 rounded-full border border-ink/20', className)} style={{ background: color }} />;
}

export function Sheet({ open, onClose, title, subtitle, children, footer, tall }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex w-full max-w-lg animate-sheet-up flex-col rounded-t-3xl border border-b-0 border-ink/10 bg-zinc-950/95 shadow-2xl shadow-ink/20 backdrop-blur-xl',
          tall ? 'h-[94dvh]' : 'max-h-[92dvh]',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15" />
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost !rounded-full !p-2">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-ink/10 bg-zinc-950/80 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Glass className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/10 bg-ink/[0.04] text-zinc-400">
        <Icon size={24} strokeWidth={1.6} />
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-zinc-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Glass>
  );
}
