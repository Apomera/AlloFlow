# In-app LAN session adapter (APPLIED - reference and recovery notes)

Status: **applied to the canonical app source and smoke-tested**. The adapter
was originally staged here on 2026-07-05 because another agent held
`AlloFlowANTI.txt`, then later landed in `AlloFlowANTI.txt`,
`desktop/web-app/src/AlloFlowANTI.txt`, and `desktop/web-app/src/App.jsx`.
Keep this folder as the reference snippet, harness, and recovery path if a
future regeneration wipes the app-side bridge.

> **Current-verification note (2026-07-09):** Treat this folder as a recovery/reference copy, not the source of truth. Before changing or reusing it, verify the current LAN bridge in `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx`, and `desktop/runtime/alloflow-desktop-runtime.cjs`.

## What this is

This closed the last open gap from the desktop relay: the web app spoke
Firestore-only, so LAN/Desktop students could not complete `joinClassSession`.
The adapter wraps the app's top-level `let`-bound Firestore primitives (same
pattern as `_alloShimInit`) and reroutes ONLY:

- `artifacts/{appId}/public/data/sessions/{code}` to `/api/lan-sessions/...`
  (POST/GET/PATCH/DELETE plus SSE `/events` for `onSnapshot`)
- `artifacts/{appId}/public/data/session_assets/{id}` to `/api/lan-docs/...`
  (so `uploadSessionAssets` manifest/chunk externalization works at full
  fidelity, images included)

The reroute is active whenever `localStorage.alloflow_live_session_config`
selects a LAN-backed mode. The desktop command center seeds that config for the
teacher. The public `/join/{code}` page seeds it, including the validated join
PIN, for students.

Everything else (user docs, WebRTC signaling, conceptMastery) keeps its normal
backend. All session call sites and CDN modules inherit the reroute because the
swap happens at the bindings they receive as props / window mirrors.

## How to validate or recover it

First confirm the adapter markers are still present in all three source copies:

- `AlloFlowANTI.txt`
- `desktop/web-app/src/AlloFlowANTI.txt`
- `desktop/web-app/src/App.jsx`

Expected markers:

- `function _applyLanSessionAdapter()`
- `_applyLanSessionAdapter(); // Boot wrap`
- `_applyLanSessionAdapter(); // LAN adapter must outrank whichever backend just landed`

If a future generated-file pass removes the adapter, recover it this way:

1. Confirm nobody else is editing `AlloFlowANTI.txt` (AGENT_HANDOFF.md rule).
2. In the canonical repo-root `AlloFlowANTI.txt`, directly after the line
   `let onAuthStateChanged = (auth, cb) => _fbOnAuthStateChanged(auth, cb);`,
   paste the entire contents of `lan_session_adapter.snippet.js`. You may drop
   the header comment block down to `WHY THIS EXISTS`, but keep the executable
   code verbatim.
3. Inside `_upgradeAIBackend()`, directly after
   `        onAuthStateChanged = s.onAuthStateChanged;`, add:
   `        _applyLanSessionAdapter(); // LAN adapter must outrank whichever backend just landed`
4. Byte-copy root `AlloFlowANTI.txt` to
   `desktop/web-app/src/AlloFlowANTI.txt` and `desktop/web-app/src/App.jsx`.
   They must stay identical. Do not hand-edit `App.jsx` independently.
5. Validate:
   - `node desktop/app-adapter/lan_adapter_harness.cjs`
   - `node desktop/runtime/alloflow-desktop-runtime.cjs --smoke --port 0`
   - `cd desktop` then `npm run web:build`
   - confirm the bundle still contains `_applyLanSessionAdapter`

## Known v1 limitations

- **WebRTC signaling is not bridged**: Live Polling / Pictionary / quiz P2P
  still signal via Firestore, so on a cloudless LAN they degrade to their
  documented fallbacks. Session shell, roster, pacing, resource sync, quiz
  Firestore-fallback, help signals, and Bridge all work over the LAN bridge.
  Signaling-over-LAN is the natural v2.
- **No per-field write gate on the bridge**: the public PATCH accepts any
  session-doc field from a PIN-holding student. Same-room classroom plus PIN
  plus TTL is the v1 trust model; the app-side `writeToSession()` Tier-1 gate
  still applies to what the app itself sends. Revisit for district-server.
- Sessions/assets are in-memory with TTL (default 8h). A teacher-machine
  restart ends the class session, which matches the same-room model.
