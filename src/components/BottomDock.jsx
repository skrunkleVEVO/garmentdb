import { Layers, Settings2, Shirt, Sparkles } from 'lucide-react';
import { cx } from './ui.jsx';

export const TABS = [
  { id: 'closet', label: 'Closet', title: 'Inventory', icon: Shirt },
  { id: 'stylist', label: 'Stylist', title: 'AI Stylist', icon: Sparkles },
  { id: 'looks', label: 'Fit Packs', title: 'Saved Looks', icon: Layers },
  { id: 'settings', label: 'Settings', title: 'Settings', icon: Settings2 },
];

export default function BottomDock({ tab, onChange, badges = {} }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-1 !rounded-[22px] !bg-zinc-900/75 p-1.5 shadow-2xl shadow-black/60">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex flex-col items-center gap-1 rounded-2xl py-2 transition active:scale-95',
                active ? 'bg-white/[0.07] text-zinc-50' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.1 : 1.7} />
                {badges[id] > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-emerald-400 px-1 text-center text-[9.5px] font-bold leading-4 text-zinc-950">
                    {badges[id]}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-medium tracking-wide">{label}</span>
              <span
                className={cx(
                  'absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400 transition-opacity',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
