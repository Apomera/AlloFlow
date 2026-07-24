# Device Storage Bridge (Canvas-persistent, on-device)

**Status 2026-07-13: built, unwired, awaiting the two-session Canvas probe.**

## Why

The Gemini Canvas iframe runs the app on an **ephemeral origin**: its
localStorage and IndexedDB do not survive to the next session. That is why
several features either lean on Firestore or are disabled behind
`isCanvasEnv`. Firestore in Canvas is the Google-managed `__firebase_config`
project — no console access, so not reviewable for FERPA purposes.

The bridge gives the app **persistent, on-device storage from inside Canvas**
with zero cloud involvement:

- `storage_bridge.html` (repo root → served at
  `https://alloflow-cdn.pages.dev/storage_bridge.html`) runs on the stable
  CDN origin and owns an IndexedDB there. It has **no backend and makes no
  network requests**. Deliberately NOT on the prismflow deployment.
- `allo_device_storage_module.js` is the app-side adapter
  (`window.alloDeviceStorage`): backends `direct` (own-origin IndexedDB for
  the self-hosted shell/desktop), `bridge-popup` / `bridge-iframe` (Canvas),
  `memory` (fallback).
- Opened directly (no opener), the bridge page is the **review UI**: list,
  export (JSON), erase — per namespace or everything. That page *is* the
  FERPA inspection/amendment/destruction story; data never leaves the device.

## Origin is permanent

Storage is bound to `alloflow-cdn.pages.dev`. If the CDN domain ever moves,
shipped data stays under the old origin — a migration handshake (old bridge →
new bridge) must ship BEFORE the old origin dies. Do not host the bridge on
a shared origin (e.g. cdn.jsdelivr.net) — every jsdelivr customer shares that
origin and could read the students' data.

## Security model

Canvas app origins are opaque (`"null"`), so the bridge cannot pin an origin.
Instead: the opener mints a random nonce into the bridge URL *fragment*
(`#allo-ds=<nonce>`, never sent to a server); the bridge only answers
messages that (a) come from its opener/parent window reference and (b) echo
that nonce. Replies go to `event.source` only. Protocol tag: `ds1` — keep
`storage_bridge.html` and `allo_device_storage_module.js` in sync.

## The probe (do this first — two Canvas sessions, no DevTools)

Popup vs hidden-iframe is an open question: `window.open` needs a user
gesture but is proven from Canvas (veraPDF / Video Studio pattern); the
iframe needs no gesture but relies on Chrome storage partitioning keyed to
(top-level site = gemini.google.com, frame origin = the CDN) surviving
Canvas reloads, and on Canvas CSP allowing the frame at all.

A TEMPORARY bootstrap rides `text_utility_helpers_module.js` (already in
every surface's loadModule list — Cloudflare serves current content for
existing module URLs, so it reaches the Canvas app on its next reload
without republishing the monolith). Remove it when the module gets its own
loadModule line.

1. Push to main so Cloudflare Pages serves the new files. Verify with
   `curl -I https://alloflow-cdn.pages.dev/storage_bridge.html` →
   `content-type: text/html` (a Pages miss returns the SPA index as 200 —
   the lame.min.js lesson).
2. Open the Canvas app (fresh load so the updated module comes down), click
   once anywhere in the app, then press **Ctrl+Alt+Shift+D**. A small
   "Device storage probe" panel appears bottom-right. Click **Run probe** —
   a bridge window flashes briefly, then both channel verdicts render in
   the panel. First run reports "first run on this device".
   (Fallback if the chord is swallowed: DevTools console →
   `window.__alloOpenDeviceStorageProbe()`.)
3. Close Canvas completely, start a **fresh session**, repeat step 2.
   - `popup: PERSISTS across sessions` ⇒ popup channel is viable.
   - `iframe: PERSISTS across sessions` ⇒ the no-gesture channel works —
     prefer it and keep the popup as the review UI + fallback.
   - `popup: FAILED: allo/popup-blocked` ⇒ allow popups for the Canvas site
     (district policy may need `alloflow-cdn.pages.dev` allowlisted).
   - `iframe: FAILED: allo/bridge-timeout` ⇒ Canvas CSP blocks the frame;
     popup-only it is.

## Integration plan (after the probe)

1. Wire `loadModule('DeviceStorage', …/allo_device_storage_module.js)` in
   AlloFlowANTI.txt + the `MODULES` list in build.js. (Deferred on 2026-07-13
   only because ANTI had heavy concurrent-session churn.)
2. `alloDeviceStorage.init({ surface: isCanvasEnv ? 'canvas' : 'stable',
   mode: <probe winner> })` at boot.
3. First consumer: **persona interview resume** (namespace `persona_sessions`,
   debounced snapshot + "Resume interview?" offer). Transient
   `withConnection()` on save/restore points if popup; free reads/writes if
   iframe.
4. Then migrate the `isCanvasEnv`-gated / non-persistent features one at a
   time: karaoke audio cache, Lingua picture cache, guided-mode progress,
   teacher history, project drafts. Namespace per feature (`^[a-z0-9_.-]{1,64}$`).
5. Student-facing copy: "saved on this device" + a shared-computer caveat;
   keep codenames (no real names) in keys and values.

## Files

- `storage_bridge.html` — bridge + review UI (repo root, CDN-served)
- `allo_device_storage_module.js` — adapter (repo root + desktop/web-app/public mirror)
- `tests/device_storage_bridge.test.js` — protocol contract + memory-backend tests
