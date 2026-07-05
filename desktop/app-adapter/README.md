# In-app LAN session adapter (STAGED — apply to AlloFlowANTI.txt)

Status: **runtime half SHIPPED + smoke-tested; app half staged here, not yet
inserted** (2026-07-05, Fable). It is staged rather than applied because
another agent held `AlloFlowANTI.txt` at build time. Everything in this folder
is validated and ready: applying is a two-anchor paste.

## What this is

The last open gap from the desktop relay: the web app spoke Firestore-only, so
LAN/School Box students could never complete `joinClassSession`. The adapter
wraps the app's top-level `let`-bound Firestore primitives (same pattern as
`_alloShimInit`) and reroutes ONLY:

- `artifacts/{appId}/public/data/sessions/{code}` → `/api/lan-sessions/…`
  (POST/GET/PATCH/DELETE + SSE `/events` for `onSnapshot`)
- `artifacts/{appId}/public/data/session_assets/{id}` → `/api/lan-docs/…`
  (so `uploadSessionAssets` manifest/chunk externalization works at full
  fidelity, images included)

whenever `localStorage.alloflow_live_session_config` selects a LAN-backed mode
(the desktop command center seeds it for the teacher; the public `/join/{code}`
page seeds it — including the validated join PIN — for students). Everything
else (user docs, WebRTC signaling, conceptMastery) keeps its normal backend.
All ~40 session call sites and the CDN modules inherit the reroute because the
swap happens at the bindings they receive as props / window mirrors.

## How to apply (5 minutes, once ANTI is free)

1. Confirm nobody else is editing `AlloFlowANTI.txt` (AGENT_HANDOFF.md rule).
2. In the CANONICAL `AlloFlowANTI.txt` (repo root — NEVER hand-edit
   `prismflow-deploy/src/App.jsx`):
   - **Anchor 1**: directly after the line
     `let onAuthStateChanged = (auth, cb) => _fbOnAuthStateChanged(auth, cb);`
     paste the entire contents of `lan_session_adapter.snippet.js` (drop the
     header comment block down to `WHY THIS EXISTS` if you like — keep the rest
     verbatim).
   - **Anchor 2**: inside `_upgradeAIBackend()`, directly after
     `        onAuthStateChanged = s.onAuthStateChanged;`
     add:
     `        _applyLanSessionAdapter(); // LAN adapter must outrank whichever backend just landed`
3. Byte-copy root `AlloFlowANTI.txt` → `prismflow-deploy/src/AlloFlowANTI.txt`
   and `prismflow-deploy/src/App.jsx` (they must stay identical).
4. Validate:
   - `node desktop/app-adapter/lan_adapter_harness.cjs` (18 asserts: runs the
     snippet against the real runtime — create/join/roster/deleteField/assets/
     SSE/PIN/opt-out/idempotence)
   - `node desktop/runtime/alloflow-desktop-runtime.cjs --smoke --port 0`
   - rebuild `desktop/app-build` (`npm run desktop:web:build`, backgrounded —
     it takes several minutes) and grep the bundle for `_applyLanSessionAdapter`.

## Known v1 limitations (documented, deliberate)

- **WebRTC signaling is not bridged**: Live Polling / Pictionary / quiz P2P
  still signal via Firestore, so on a cloudless LAN they degrade to their
  documented fallbacks (bounded retries, polling file-export). Session shell,
  roster, pacing, resource sync, quiz Firestore-fallback, help signals, and
  Bridge all work over the LAN bridge. Signaling-over-LAN is the natural v2
  (add `/api/lan-signaling` or ride session-doc fields).
- **No per-field write gate on the bridge**: the public PATCH accepts any
  session-doc field from a PIN-holding student (Firestore rules would scope
  writes per-uid). Same-room classroom + PIN + TTL is the v1 trust model;
  the app-side `writeToSession()` Tier-1 gate still applies to what the app
  itself sends. Revisit for district-server (teacher token exists there).
- Sessions/assets are in-memory with TTL (default 8h) — a teacher-machine
  restart ends the class session, which matches the same-room model.
