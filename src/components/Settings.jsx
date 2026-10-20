import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { testApiKey } from '../lib/gemini.js';
import { GEMINI_MODEL } from '../lib/constants.js';
import { STORAGE_BUDGET, storageBytes } from '../lib/storage.js';
import { canPromptInstall, isStandalone, onInstallAvailability, promptInstall } from '../lib/pwa.js';
import { Glass, Segmented, cx } from './ui.jsx';

function Section({ icon: Icon, title, children }) {
  return (
    <Glass className="p-4">
      <p className="label mb-3 flex items-center gap-1.5">
        <Icon size={13} /> {title}
      </p>
      {children}
    </Glass>
  );
}

const SYNC_STATUS = {
  loading: ['bg-zinc-400 animate-pulse', 'Connecting…'],
  'signed-out': ['bg-zinc-600', 'Signed out'],
  syncing: ['bg-sky-400 animate-pulse', 'Syncing…'],
  synced: ['bg-emerald-400', 'Synced'],
  offline: ['bg-amber-400', 'Offline: changes will sync later'],
  error: ['bg-rose-400', 'Sync problem'],
};

function CloudSection({ cloud }) {
  if (!cloud.configured) {
    return (
      <Section icon={Cloud} title="Cloud sync">
        <p className="text-[13px] leading-relaxed text-zinc-400">
          Not set up yet. Add your Firebase config to <span className="font-mono text-[12px] text-zinc-300">src/firebase.config.js</span> to
          back up your closet and share it across your devices.
        </p>
      </Section>
    );
  }
  const [dot, label] = SYNC_STATUS[cloud.status] || SYNC_STATUS.loading;
  return (
    <Section icon={Cloud} title="Cloud sync">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] text-zinc-400">
          {cloud.user ? (
            <>
              Signed in as <span className="text-zinc-200">{cloud.user.email}</span>
            </>
          ) : (
            'Firebase · Google account'
          )}
        </p>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-zinc-400">
          <span className={cx('h-1.5 w-1.5 rounded-full shadow-[0_0_6px]', dot)} />
          {label}
        </span>
      </div>
      {cloud.error && <p className="mb-3 text-[12.5px] text-rose-300">{cloud.error}</p>}
      {cloud.user ? (
        <button type="button" className="btn-ghost w-full !text-[13px]" onClick={cloud.signOut}>
          <LogOut size={15} /> Sign out
        </button>
      ) : (
        <button type="button" className="btn-primary w-full !text-[13px]" onClick={cloud.signIn} disabled={cloud.status === 'loading'}>
          <Cloud size={15} /> Sign in with Google to sync
        </button>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
        Your pieces, photos, statuses, saved looks and preferences sync to your own Firestore space. The app keeps working
        offline and catches up when you're back online. Your Gemini key syncs too, so it's waiting on every device you sign in on.
      </p>
    </Section>
  );
}

export default function Settings({ settings, setSettings, items, onExport, onImport, onReset, notify, cloud }) {
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keyState, setKeyState] = useState(settings.apiKey ? 'saved' : 'empty'); // empty | saved | testing | ok | error
  const [keyError, setKeyError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const importRef = useRef(null);

  useEffect(() => onInstallAvailability(setCanInstall), []);

  // A key synced in from another device shows up here without a reload.
  useEffect(() => {
    setKeyDraft((d) => (d.trim() === settings.apiKey ? d : settings.apiKey));
    setKeyState((k) => (k === 'empty' && settings.apiKey ? 'saved' : k));
  }, [settings.apiKey]);

  const used = storageBytes();
  const pct = Math.min(100, (used / STORAGE_BUDGET) * 100);

  const saveKey = async () => {
    const key = keyDraft.trim();
    setSettings((s) => ({ ...s, apiKey: key }));
    if (!key) return setKeyState('empty');
    setKeyState('testing');
    setKeyError('');
    try {
      await testApiKey(key);
      setKeyState('ok');
      notify('Gemini connected');
    } catch (e) {
      setKeyState('error');
      setKeyError(e.message);
    }
  };

  const indicator = {
    empty: ['bg-zinc-600', 'No key'],
    saved: ['bg-emerald-400', 'Key saved'],
    testing: ['bg-zinc-400 animate-pulse', 'Checking…'],
    ok: ['bg-emerald-400', 'Connected'],
    error: ['bg-rose-400', 'Key rejected'],
  }[keyState];

  const pickBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onImport(JSON.parse(await file.text()));
    } catch (err) {
      notify(err.message || 'Could not read that file', true);
    }
  };

  return (
    <div className="space-y-4">
      <Section icon={KeyRound} title="Gemini API">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] text-zinc-400">
            Model <span className="font-mono text-[12px] text-zinc-300">{GEMINI_MODEL}</span>
          </p>
          <span className="flex items-center gap-1.5 text-[12px] text-zinc-400">
            <span className={cx('h-1.5 w-1.5 rounded-full shadow-[0_0_6px]', indicator[0])} />
            {indicator[1]}
          </span>
        </div>
        <div className="relative">
          <input
            className="input pr-11 font-mono !text-[14px]"
            type={showKey ? 'text' : 'password'}
            placeholder="Paste your API key"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={keyDraft}
            onChange={(e) => {
              setKeyDraft(e.target.value);
              const key = e.target.value.trim();
              setSettings((s) => ({ ...s, apiKey: key }));
              setKeyState(key ? 'saved' : 'empty');
              setKeyError('');
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {keyError && <p className="mt-2 text-[12.5px] text-rose-300">{keyError}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a className="btn-ghost !text-[13px]" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Get a free key <ExternalLink size={14} />
          </a>
          <button type="button" className="btn-primary !text-[13px]" onClick={saveKey} disabled={keyState === 'testing'}>
            {keyState === 'testing' && <Loader2 size={15} className="animate-spin" />} Save & test
          </button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
          Saved on this device as you type and, when you're signed in, synced to your private cloud space. Sent only to Google's Gemini API and never included in backups.
        </p>
      </Section>

      <CloudSection cloud={cloud} />

      <Section icon={Smartphone} title="Preferences">
        <p className="mb-1.5 text-[13px] text-zinc-400">Temperature unit</p>
        <Segmented
          options={[
            { value: 'C', label: '°C' },
            { value: 'F', label: '°F' },
          ]}
          value={settings.unit}
          onChange={(unit) => setSettings((s) => ({ ...s, unit }))}
        />
        <p className="mb-1.5 mt-4 text-[13px] text-zinc-400">Personal style notes (sent to the stylist)</p>
        <textarea
          className="input min-h-[88px] resize-none leading-relaxed"
          placeholder="e.g. 175 cm, slim build. Prefer wide-leg trousers, avoid skinny fits, love earth tones."
          value={settings.styleNotes}
          onChange={(e) => setSettings((s) => ({ ...s, styleNotes: e.target.value }))}
        />
      </Section>

      <Section icon={HardDrive} title="Data">
        <div className="mb-1.5 flex justify-between text-[12.5px] text-zinc-400">
          <span>
            {items.length} pieces · {(used / 1024 / 1024).toFixed(2)} MB used
          </span>
          <span>~5 MB</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/5">
          <div
            className={cx('h-full rounded-full transition-all', pct > 85 ? 'bg-rose-400' : 'bg-emerald-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost !text-[13px]" onClick={onExport}>
            <Download size={15} /> Export backup
          </button>
          <button type="button" className="btn-ghost !text-[13px]" onClick={() => importRef.current?.click()}>
            <Upload size={15} /> Import backup
          </button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={pickBackup} />
        </div>
        <button
          type="button"
          className={cx('btn-danger mt-2 w-full !text-[13px]', confirmReset && '!bg-rose-500 !text-white')}
          onClick={() => (confirmReset ? onReset() : setConfirmReset(true))}
          onBlur={() => setConfirmReset(false)}
        >
          <Trash2 size={15} /> {confirmReset
            ? cloud.user
              ? 'Tap again to erase everything (cloud too)'
              : 'Tap again to erase everything'
            : 'Erase all data'}
        </button>
      </Section>

      {!isStandalone() && (
        <Section icon={Smartphone} title="Install">
          {canInstall ? (
            <button type="button" className="btn-primary w-full" onClick={promptInstall}>
              Install GarmentDB
            </button>
          ) : (
            <p className="text-[13px] leading-relaxed text-zinc-400">
              <span className="text-zinc-200">iPhone:</span> Safari → Share → <em>Add to Home Screen</em>.
              <br />
              <span className="text-zinc-200">Android:</span> Chrome ⋮ menu → <em>Install app</em>.
            </p>
          )}
        </Section>
      )}

      <p className="pb-2 text-center text-[11px] tracking-wide text-zinc-600">GarmentDB · v1.2 · {cloud.user ? 'synced with Firebase' : 'all data stays on device'}</p>
    </div>
  );
}
