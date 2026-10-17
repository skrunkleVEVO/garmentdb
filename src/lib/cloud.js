// Firebase Auth (Google sign-in) + Firestore. Loaded with a dynamic import
// only when firebase.config.js is filled in, so the base app stays small.
//
// Layout (all owner-only, see firestore.rules):
//   users/{uid}               { settings, updatedAt }
//   users/{uid}/items/{id}    one clothing item
//   users/{uid}/photos/{id}   { dataUrl, updatedAt } (same id as the item)
//   users/{uid}/looks/{id}    one saved look
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase.config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// IndexedDB cache: the closet loads offline and writes queue until back online.
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

getRedirectResult(auth).catch(() => {});

export function onUser(fn) {
  return onAuthStateChanged(auth, fn);
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Home-screen apps and strict browsers may block popups; fall back to a full redirect.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (e.code === 'auth/popup-closed-by-user') return;
    if (e.code === 'auth/unauthorized-domain') {
      throw new Error(`Add ${location.hostname} under Firebase → Authentication → Settings → Authorized domains.`);
    }
    throw e;
  }
}

export const signOut = () => fbSignOut(auth);

const col = (uid, name) => collection(db, 'users', uid, name);

/** Live listener on a user's subcollection: fn(docs[], changes[], fromCache). */
export function watchCollection(uid, name, fn, onError) {
  return onSnapshot(
    col(uid, name),
    { includeMetadataChanges: false },
    (snap) =>
      fn(
        snap.docs.map((d) => d.data()),
        snap.docChanges().map((c) => ({ type: c.type, id: c.doc.id, data: c.doc.data() })),
        snap.metadata.fromCache,
      ),
    onError,
  );
}

export function watchUserDoc(uid, fn, onError) {
  return onSnapshot(doc(db, 'users', uid), (snap) => fn(snap.exists() ? snap.data() : null), onError);
}

export function saveSettings(uid, settings) {
  return setDoc(doc(db, 'users', uid), { settings, updatedAt: Date.now() }, { merge: true });
}

// Firestore caps a commit at 500 writes and ~10 MB, and photos are ~60–90 KB each.
const MAX_OPS = 400;
const MAX_BYTES = 4 * 1024 * 1024;

/** ops: [{ col, id, data }] to set, or [{ col, id, remove: true }] to delete. */
export async function commit(uid, ops) {
  let batch = writeBatch(db);
  let count = 0;
  let bytes = 0;
  const pending = [];
  for (const op of ops) {
    const ref = doc(db, 'users', uid, op.col, op.id);
    if (op.remove) batch.delete(ref);
    else batch.set(ref, op.data);
    count++;
    bytes += op.remove ? 100 : JSON.stringify(op.data).length;
    if (count >= MAX_OPS || bytes >= MAX_BYTES) {
      pending.push(batch.commit());
      batch = writeBatch(db);
      count = 0;
      bytes = 0;
    }
  }
  if (count) pending.push(batch.commit());
  await Promise.all(pending);
}

/** Deletes every document the user owns. */
export async function eraseCloud(uid) {
  const ops = [];
  for (const name of ['items', 'photos', 'looks']) {
    const snap = await getDocs(col(uid, name));
    snap.forEach((d) => ops.push({ col: name, id: d.id, remove: true }));
  }
  await commit(uid, ops);
  await deleteDoc(doc(db, 'users', uid));
}
