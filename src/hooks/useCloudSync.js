import { useCallback, useEffect, useRef, useState } from 'react';
import { isCloudConfigured } from '../firebase.config.js';
import { cachePhoto, deletePhoto, getPhoto, load, save } from '../lib/storage.js';

// Settings that follow you across devices. The Gemini key stays per-device.
const SYNCED_SETTINGS = ['unit', 'styleNotes', 'location', 'packingMode'];

/** JSON with sorted keys, so Firestore's field order doesn't look like a change. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Small fast string hash (cyrb53) so the "last synced" map stays tiny in localStorage. */
function hash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const fingerprint = (v) => hash(stable(v));
const stamp = (x) => x.updatedAt ?? x.savedAt ?? x.createdAt ?? 0;
const pickSettings = (s) => Object.fromEntries(SYNCED_SETTINGS.map((k) => [k, s[k]]));
const newestFirst = (key) => (a, b) => (b[key] ?? 0) - (a[key] ?? 0);

/**
 * Three-way merge of a local list with the cloud copy.
 * `seen` maps id -> fingerprint of the cloud version this device last saw, which
 * tells "edited here" apart from "deleted on another device".
 */
function merge(local, remote, seen, keepLocalOnly) {
  const localById = new Map(local.map((x) => [x.id, x]));
  const remoteIds = new Set(remote.map((x) => x.id));
  const out = remote.map((r) => {
    const l = localById.get(r.id);
    const editedHere = l && seen.get(r.id) !== fingerprint(l);
    return editedHere && stamp(l) > stamp(r) ? l : r;
  });
  if (keepLocalOnly) local.forEach((l) => !remoteIds.has(l.id) && !seen.has(l.id) && out.push(l));
  return out;
}

const emptySeen = () => ({ items: new Map(), looks: new Map(), settings: null });

function loadSeen(uid) {
  const raw = load(`sync:${uid}`, null);
  if (!raw) return emptySeen();
  return { items: new Map(Object.entries(raw.items || {})), looks: new Map(Object.entries(raw.looks || {})), settings: raw.settings ?? null };
}

function persistSeen(uid, seen) {
  save(`sync:${uid}`, {
    items: Object.fromEntries(seen.items),
    looks: Object.fromEntries(seen.looks),
    settings: seen.settings,
  });
}

/**
 * Two-way sync between local state (localStorage) and Firestore for the
 * signed-in Google account. Local state stays the source the UI renders from.
 * Cloud changes are merged in, and local changes are diffed and written back.
 */
export function useCloudSync({ items, setItems, looks, setLooks, settings, setSettings }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isCloudConfigured);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [, setPhotoRev] = useState(0);

  const cloud = useRef(null);
  const seen = useRef(emptySeen());
  const photoIds = useRef(new Set());
  const latest = useRef({ items, looks });
  latest.current = { items, looks };
  const uid = user?.uid;

  // Load the Firebase module and follow the auth state.
  useEffect(() => {
    if (!isCloudConfigured) return undefined;
    let unsub = () => {};
    let cancelled = false;
    import('../lib/cloud.js')
      .then((mod) => {
        if (cancelled) return;
        cloud.current = mod;
        unsub = mod.onUser((u) => {
          setUser(u ? { uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL } : null);
          setAuthReady(true);
        });
      })
      .catch((e) => {
        setError(`Could not load Firebase: ${e.message}`);
        setAuthReady(true);
      });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const push = useCallback(
    (ops) => {
      if (!ops.length || !uid) return;
      persistSeen(uid, seen.current);
      setPending((n) => n + 1);
      cloud.current
        .commit(uid, ops)
        .then(() => setError(''))
        .catch((e) => setError(e.message || 'Cloud save failed.'))
        .finally(() => setPending((n) => n - 1));
    },
    [uid],
  );

  // Subscribe to the signed-in user's data.
  useEffect(() => {
    if (!uid || !cloud.current) return undefined;
    const mod = cloud.current;
    const linked = load('cloudUid', null);
    const linkedBefore = linked === uid;
    // A brand-new link adopts this device's closet into the cloud. Switching
    // to a different account replaces the local closet with that account's.
    const keepLocalOnly = linked == null || linkedBefore;
    save('cloudUid', uid);
    seen.current = linkedBefore ? loadSeen(uid) : emptySeen();
    photoIds.current = new Set();
    setReady(false);
    setError('');

    const got = { items: false, looks: false, photos: false, settings: false };
    const markReady = (key) => {
      got[key] = true;
      if (Object.values(got).every(Boolean)) setReady(true);
    };
    const fail = (e) =>
      setError(
        e.code === 'permission-denied'
          ? 'Firestore refused access. Publish firestore.rules in the Firebase console.'
          : e.message || 'Cloud sync failed.',
      );

    const listFrom = (name, setList, sortKey) => (docs, _changes, fromCache) => {
      // Before this device has ever synced, wait for the server's answer so an
      // empty offline cache can't be mistaken for an empty closet.
      if (fromCache && !linkedBefore && !got[name]) return;
      const local = latest.current[name];
      // After the first answer, local-only entries are always fresh local adds.
      const merged = merge(local, docs, seen.current[name], keepLocalOnly || got[name]).sort(newestFirst(sortKey));
      seen.current[name] = new Map(docs.map((d) => [d.id, fingerprint(d)]));
      persistSeen(uid, seen.current);
      if (stable(merged) !== stable(local)) setList(merged);
      markReady(name);
    };

    const unsubs = [
      mod.watchCollection(uid, 'items', listFrom('items', setItems, 'createdAt'), fail),
      mod.watchCollection(uid, 'looks', listFrom('looks', setLooks, 'savedAt'), fail),
      mod.watchCollection(
        uid,
        'photos',
        (_docs, changes, fromCache) => {
          if (fromCache && !linkedBefore && !got.photos) return;
          changes.forEach((c) => {
            if (c.type === 'removed') {
              photoIds.current.delete(c.id);
              deletePhoto(c.id);
            } else {
              photoIds.current.add(c.id);
              if (c.data.dataUrl && getPhoto(c.id) !== c.data.dataUrl) cachePhoto(c.id, c.data.dataUrl);
            }
          });
          if (changes.length) setPhotoRev((n) => n + 1);
          markReady('photos');
        },
        fail,
      ),
      mod.watchUserDoc(
        uid,
        (data) => {
          if (data?.settings) {
            const remote = pickSettings(data.settings);
            seen.current.settings = fingerprint(remote);
            setSettings((s) => (fingerprint(pickSettings(s)) === seen.current.settings ? s : { ...s, ...remote }));
          }
          markReady('settings');
        },
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid, setItems, setLooks, setSettings]);

  // Write local item changes (plus each new item's photo) to the cloud.
  useEffect(() => {
    if (!ready || !uid) return;
    const known = seen.current.items;
    const ops = [];
    const ids = new Set();
    for (const it of items) {
      ids.add(it.id);
      const fp = fingerprint(it);
      if (known.get(it.id) === fp) continue;
      if (!photoIds.current.has(it.id)) {
        const dataUrl = getPhoto(it.id);
        if (dataUrl) {
          ops.push({ col: 'photos', id: it.id, data: { dataUrl, updatedAt: Date.now() } });
          photoIds.current.add(it.id);
        }
      }
      ops.push({ col: 'items', id: it.id, data: it });
      known.set(it.id, fp);
    }
    for (const id of [...known.keys()]) {
      if (ids.has(id)) continue;
      ops.push({ col: 'items', id, remove: true }, { col: 'photos', id, remove: true });
      known.delete(id);
      photoIds.current.delete(id);
    }
    push(ops);
  }, [items, ready, uid, push]);

  useEffect(() => {
    if (!ready || !uid) return;
    const known = seen.current.looks;
    const ops = [];
    const ids = new Set();
    for (const look of looks) {
      ids.add(look.id);
      const fp = fingerprint(look);
      if (known.get(look.id) === fp) continue;
      ops.push({ col: 'looks', id: look.id, data: look });
      known.set(look.id, fp);
    }
    for (const id of [...known.keys()]) {
      if (ids.has(id)) continue;
      ops.push({ col: 'looks', id, remove: true });
      known.delete(id);
    }
    push(ops);
  }, [looks, ready, uid, push]);

  // Settings: debounced so typing style notes doesn't write on every key.
  const syncedSettings = pickSettings(settings);
  const settingsFp = fingerprint(syncedSettings);
  useEffect(() => {
    if (!ready || !uid || settingsFp === seen.current.settings) return undefined;
    const t = setTimeout(() => {
      seen.current.settings = settingsFp;
      persistSeen(uid, seen.current);
      setPending((n) => n + 1);
      cloud.current
        .saveSettings(uid, syncedSettings)
        .catch((e) => setError(e.message || 'Cloud save failed.'))
        .finally(() => setPending((n) => n - 1));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsFp, ready, uid]);

  const signIn = useCallback(async () => {
    setError('');
    try {
      await cloud.current?.signIn();
    } catch (e) {
      setError(e.message || 'Sign-in failed.');
    }
  }, []);

  const signOut = useCallback(() => cloud.current?.signOut(), []);

  /** Deletes the cloud copy of everything and signs out. */
  const eraseCloud = useCallback(async () => {
    if (!uid) return;
    await cloud.current.eraseCloud(uid);
    await cloud.current.signOut();
  }, [uid]);

  let status = 'local';
  if (isCloudConfigured) {
    if (!authReady) status = 'loading';
    else if (!user) status = 'signed-out';
    else if (error) status = 'error';
    else if (!online) status = 'offline';
    else if (!ready || pending > 0) status = 'syncing';
    else status = 'synced';
  }

  return { configured: isCloudConfigured, user, status, error, signIn, signOut, eraseCloud };
}
