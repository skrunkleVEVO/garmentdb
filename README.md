# GarmentDB // Digital Closet & AI Stylist

A mobile-first React PWA: catalog your clothes once, track their status (Active / In Laundry / Packed for Trip), and get Gemini 2.5 Flash to build streetwear fit packs from what's actually clean and available. The fit packs are weather-aware. Live Open-Meteo data for Kelowna, or any city you pick, appears in the header as `KELOWNA: 11°C • 85% HUMIDITY • 75% RAIN PROBABILITY`. When rain is likely, the stylist benches suede and canvas sneakers and reaches for boots and shell layers. Data is saved on the device, and you can optionally sync it through Firebase (Google sign-in + Firestore).

## Run locally

```bash
npm install
npm run dev
```

To try it on your phone over Wi-Fi, open the network URL that `npm run dev` prints. City weather works anywhere, but "Use my current location" needs HTTPS.

## Deploy (GitHub Pages)

The site is hosted on GitHub Pages. Firebase is used only for sign-in and data (Firestore). `.github/workflows/deploy.yml` builds `dist/` and publishes it on every push to `main`.

First time only (PowerShell, from this folder). Free GitHub Pages needs a public repo:

```powershell
gh repo create garmentdb --public --source . --remote origin
gh api -X POST repos/{owner}/garmentdb/pages -f build_type=workflow
```

Every release:

```powershell
npm run build; if ($?) { git add -A; git commit -m "Release GarmentDB"; git push -u origin main }
```

The live URL is `https://<your-github-user>.github.io/garmentdb/`.

## Cloud sync (Firebase)

1. In the [Firebase console](https://console.firebase.google.com/), open your project and do the following:
   - **Build → Firestore Database → Create database** (production mode).
   - **Firestore → Rules:** paste in `firestore.rules`, then click **Publish**.
   - **Build → Authentication → Sign-in method:** enable **Google**.
   - **Authentication → Settings → Authorized domains:** add `<your-github-user>.github.io`.
2. Go to **Project settings → Your apps → Web app** and copy the config into `src/firebase.config.js`. These values aren't secret; the rules are what protect the data.
3. Push. In the app, go to **Settings → Cloud sync → Sign in with Google**.

Sync is two-way and works offline. Pieces, photos (inline in Firestore, so you don't need Storage or the Blaze plan), statuses, saved looks and preferences all follow your Google account. The Gemini key stays on each device.

Then open the URL on your phone:
- **iPhone:** Safari → Share → *Add to Home Screen*
- **Android:** Chrome ⋮ → *Install app*

## Gemini key

Get a free key at <https://aistudio.google.com/apikey> and paste it into **Settings**. The key is kept in this browser's `localStorage` and sent only to `generativelanguage.googleapis.com`. Backups never include it. Note that `localStorage` isn't encrypted, so anyone with access to your unlocked browser could read the key. A free-tier key keeps that risk low.

## Structure

```
public/
  manifest.webmanifest   PWA manifest (standalone, portrait, dark)
  sw.js                  Service worker: offline app shell, APIs bypass the cache
  icons/                 App icons (svg, 192, 512, maskable, apple-touch)
src/
  App.jsx                State, actions, header + packing toggle, routing between tabs
  index.css              Tailwind + .glass / .input / .btn-* design tokens
  main.jsx               Entry + service worker registration
  hooks/usePersistentState.js
  hooks/useCloudSync.js  Two-way Firestore sync (merge, offline, photos)
  hooks/useWeather.js    Auto-refreshing weather (on load, every 30 min, on app focus)
  lib/
    constants.js         Categories, fits, statuses, color swatches, defaults
    storage.js           localStorage (items + per-photo keys), backup/restore
    image.js             Client-side photo compression + dominant color guess
    gemini.js            Fit-pack generation (structured JSON) + photo auto-tagging
    cloud.js             Firebase Auth (Google) + Firestore reads/writes
    weather.js           Open-Meteo forecast + city search, rain/humidity rules for the stylist
    pwa.js               Install prompt + SW registration
  components/
    LocationSheet.jsx  BottomDock.jsx  Closet.jsx  ItemSheet.jsx  ItemFields.jsx
    AddItemsModal.jsx  Stylist.jsx  OutfitCard.jsx  SavedLooks.jsx
    Settings.jsx  ui.jsx (Glass, Sheet, Chip, Segmented, Photo…)
```

## Storage notes

Photos are downscaled to 640 px JPEGs (about 40–70 KB each), and each photo is stored under its own key. Changing an item's status only rewrites the small items list, not the photos. Browsers give `localStorage` about 5 MB, which is roughly 80–120 pieces. Settings shows a usage meter, and **Export backup** saves everything (photos included) to a JSON file you can import on another device.

## Firestore layout

```
users/{uid}               { settings: { unit, styleNotes, location, packingMode }, updatedAt }
users/{uid}/items/{id}    { id, name, category, color, fit, status, createdAt, updatedAt }
users/{uid}/photos/{id}   { dataUrl, updatedAt }   same id as the item, ~60–90 KB JPEG
users/{uid}/looks/{id}    saved outfit
```

`hooks/useCloudSync.js` does a three-way merge using a per-device record of what it last saw in the cloud. That way an edit made on this device and a delete made on another device are never confused.
