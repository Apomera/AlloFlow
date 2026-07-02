# AlloFlow Live Session Protocol

**Status:** v1.0 — 2026-07-01. Written from a verified read of the code (not aspirational).
Sections marked **[SHIPPED 2026-07-01]** were implemented alongside this spec; sections marked
**[ROADMAP]** are recommended and not yet built.

**Audience:** any agent or human touching live sessions. Read this before adding a live activity,
changing session-doc writes, or "fixing" reconnect behavior.

**Key files:**
`AlloFlowANTI.txt` (canonical shell: session lifecycle, Tier-1 gate, mount sites) ·
`live_polling_module.js` (hand-maintained, no source JSX) ·
`concept_pictionary_source.jsx` → build with `node _build_concept_pictionary_module.js` ·
`firestore_sync_module.js` (pure sanitizers/size guards) ·
`module_scope_extras_module.js` (session asset chunking) ·
`phase_o_misc_handlers_source.jsx` (session creation) ·
`view_session_modal_source.jsx` (session modal / hard end).

---

## 1. Architecture at a glance

One Firestore **session document** is the coordination bus; **WebRTC data channels** are the
student-content bus. Every live feature is one of three transport patterns:

| Feature | Transport | Student content in Firestore? |
|---|---|---|
| Session shell (roster, groups, mode, pacing) | Firestore session doc | Codename + xp only (Tier-1) |
| Resource sync / teacher push | Firestore (manifest + chunked assets) | No (teacher content) |
| Live Polling | WebRTC star (teacher = host) | **Never** (signaling only) |
| Concept Pictionary | WebRTC star (separate signaling collection) | **Never** (role/round metadata only) |
| Live Quiz | Firestore `quizState.allResponses` | Structured answers only (see §5) |
| Interactive organizers / visual supports / StoryForge | Firestore payload fields | Teacher-authored |
| Bridge (family comms) | Firestore `bridgePayload` | Teacher free text — documented exception |
| Arcade Pictionary, Adventure | Local only | No |

**Paths** (all under `artifacts/{appId}/public/data/`):

- `sessions/{code}` — the session doc. `code` = 5 chars (was 4 until 2026-07-01), A–Z minus
  confusables + 2–9.
- `signaling/{code}/peers/{uid}` — polling WebRTC handshake docs (SDP + ICE + codename), deleted ~750ms after connect.
- `pictionary-signaling/{code}/peers/{uid}` — same shape, separate collection so both games can coexist.
- `session-assets/…` (via `getSessionAssetRef`) — chunked teacher assets + resources manifest (see §4).
- `conceptMastery/{uid}` — cross-session per-concept attempt metadata (status enums, no answer content).

---

## 2. State machines

These are the *de facto* machines in the code. Anything not on an edge below is a bug, not a feature.

### 2.1 Teacher session

```
idle ──startClassSession()──▶ live ──(session modal "End")──▶ hard-ended (doc DELETED)
                                │──(quiz controls "End")────▶ soft-ended (isActive:false, status:'ended', doc kept)
                                │──(tab close/pagehide)─────▶ hard-ended (best-effort deleteDoc)
                                └──(tab crash / network)────▶ orphaned (doc lingers; students stuck until they leave)
```

- Creation is a full-overwrite `setDoc` (phase_o `startClassSession`), so a reused code never
  inherits `status:'ended'` from a previous life.
- **Invariant:** every end path must be *observable by students*. Hard end → doc-not-found.
  Soft end → terminal fields. Both are now handled (§2.2). The orphaned path has no signal —
  see §8 roadmap (presence heartbeat).

### 2.2 Student session

```
not-joined ──joinClassSession(code)──▶ joined (roster.{uid} written; onSnapshot live)
  joined ──doc updates──▶ joined (sessionData refreshed)
  joined ──doc deleted──▶ exited (toast "session ended"; activeSessionCode=null; ALL session UI unmounts)
  joined ──isActive===false OR status==='ended'──▶ exited (same cleanup)   [SHIPPED 2026-07-01]
  joined ──permission-denied──▶ exited (listener unsubscribed)
```

The soft-end edge was the **zombie-session bug**: `handleEndLiveSession` (quiz teacher controls)
soft-ends without deleting, and the student snapshot callback only checked `docSnap.exists()`.
Students kept stale session UI indefinitely. The terminal-state check now lives at the top of the
snapshot callback in AlloFlowANTI.txt and is pinned by `tests/session_soft_end_terminal.test.js`.

**Rule for new end paths:** either delete the doc or set `isActive:false` / `status:'ended'`.
Nothing else counts as ending a session.

### 2.3 Live activity (poll / Pictionary round)

```
draft ──broadcast/startRound──▶ accepting ──close/resolve──▶ terminal (closePoll / roundResolved)
                                   │──results──▶ results-shared (pollResults)
                                   └──host panel closes──▶ terminal (hostClosed)   [SHIPPED 2026-07-01]
```

**Invariant (terminal-event rule):** an activity shown on a student screen may only disappear via an
explicit terminal message (`closePoll`, `roundResolved`, `roundSync{active:false}`, `hostClosed`) or
session exit. Never rely on the data channel silently dying — that is exactly the stuck-overlay bug.

### 2.4 Guest transport connection

```
connecting ──dc open──▶ connected ──drop──▶ reconnecting (auto-rejoin, backoff 2/5/10/20/30s, max 8)
connecting ──10s timeout──▶ failed (polling: export-file fallback; pictionary: visible Retry)
reconnecting ──rejoin ok──▶ connected (host replays state; see §6)
```

[SHIPPED 2026-07-01] Both guests auto-rejoin; both hosts accept **re-offers** (a fresh offer for a
uid they already track replaces the stale peer). Stale-peer cleanup **no longer deletes the
signaling doc** — that deletion raced the reconnecting student's fresh offer and destroyed it.

---

## 3. Data-tier model (what may touch Firestore)

Formalizes the existing `SESSION_TIER1_LEAVES` gate (AlloFlowANTI.txt, `writeToSession()`):

| Tier | Definition | Examples | Transport |
|---|---|---|---|
| **0** | Ephemeral student content — never stored anywhere | poll responses, free text, strokes, guesses, hidden concept | WebRTC only |
| **1** | Operational metadata, structurally non-PII | roster codename/xp/groupId/role, `pictionaryRound`, `interactiveOrganizer`, `livePolling` presence, help signals (`roster.{uid}.signal`/`signalAt` — enum from `LIVE_SIGNAL_OPTIONS`, no free text), mode, `quizState` phase | Firestore via `writeToSession()` |
| **2** | Teacher-authored content, synced with intent | `resources` (manifest), `bridgePayload`, organizer payloads | Firestore, size-guarded |
| **3** | Student responses/voice/free text | quiz free-text answers, fluency audio | **Blocked** — stripped by sanitizers or Tier-1 refusal |
| **4** | Real PII | real names, contact info | Never; codenames are dropdown-curated so students can't free-type |

Known nuances (do not "rediscover" these as bugs):

- `writeToSession()` validates **key paths** (last dotted segment), not nested object values.
  A Tier-1 leaf whose *value* is an object (e.g. `pictionaryRound`, `livePolling`) is trusted by
  construction — keep such objects host-managed and enum/timestamp-only.
- `quizState.allResponses.{uid}.{qIdx}` is written by a **raw `updateDoc`** (bypasses the gate,
  documented in code): only structured answers (mcq/tf/match/sequence/numeric/order/likert) include
  `answer`; free-text items write `{submitted:true}` metadata only. Keep it that way.
- `bridgePayload` is the deliberate, documented Tier-2 free-text exception (de-identified sender,
  24h TTL, revert path documented at the allowlist). Long-term fix is WebRTC migration.
- `fluency-record.audioRecording` (child voice = biometric-class) is stripped in
  `sanitizeHistoryForCloud` before any cloud write.

**Rule:** a new live feature that moves student-generated content uses WebRTC (Tier 0). If it truly
needs Firestore, it must be reduced to Tier-1 metadata or go through the documented-exception
process (justification comment at the allowlist + revert path + TTL).

---

## 4. Session doc size: manifest + chunked assets (already built)

The 1 MiB Firestore limit is handled by **two independent guards** — earlier analysis that called
this unsolved was wrong:

1. **Externalization at session start** (`uploadSessionAssets`, module_scope_extras):
   data-URL images are replaced with `ref::{assetId}` pointers and written as **chunked docs** under
   session assets; `compactLargeSessionResources(…, { alwaysExternalize: true })` writes the
   resources array itself out as a JSON **manifest** (chunked if needed) and leaves
   `__alloResourcesManifestRef` in the session doc. Students reverse this via
   `hydrateResourcesManifest` + `hydrateSessionAssets` on every resources change.
2. **Trim-guard on live updates** (`prepareSessionResourcesForWrite`, firestore_sync_module):
   any `resources` array routed through `writeToSession()` is sanitized (binary fields nulled,
   strings capped at 120k chars), then oldest-dropped to ≤ 850 KiB, with an honest
   `syncTruncated`/`syncNotice` compact fallback.

**Correction (verified 2026-07-01):** the live update path (`syncResourcesToSession`, debounced
1.5s on history change) ALSO goes through `uploadSessionAssets` manifest externalization before the
trim-guard, and the teacher gets a toast when trimming occurs. The remaining gap is student-side:
a student whose hydration missed the target resource fails silently (see §4.1 delivery acks).

### 4.1 Resource targeting & pacing (verified)

Who sees what, in precedence order (student `onSnapshot` consumer):

1. **Teacher-paced (`mode:'sync'`) + `currentResourceId`** — written *implicitly* whenever the
   teacher opens a resource during a live session (three call sites, incl. STEM manipulatives).
   Students follow continuously (a locked follow: navigating away re-syncs on the next snapshot —
   that lock is the feature). `currentResourceId:'adventure-sync'` is a special case that mirrors
   adventure state.
2. **Group override `groups.{gid}.resourceId`** — set from the Groups modal
   (`handleSetGroupResource`, with pushing/success UI). In sync mode it replaces the class target
   for that group (locked). In student-paced mode it is a **one-time jump**: each push writes a
   `groups.{gid}.resourceAt` nonce and students consume each `group|resource|nonce` key exactly
   once [SHIPPED 2026-07-01 — previously every unrelated snapshot re-yanked grouped students who
   had navigated away, so student-paced mode wasn't student-paced for them].
3. **Per-student push `roster.{uid}.resourceId`** [SHIPPED 2026-07-01] — outranks group and class.
   Sent/cleared from the Live Session Center's Students rows (`handleSetStudentResource`, pushes
   the teacher's currently open resource). Locked-follow in sync mode; consume-once via
   `roster.{uid}.resourceAt` in student-paced mode. Subtractive targeting
   (`hiddenResourceIds` from quiz rules) still exists alongside.
4. **Delivery acknowledgment** [SHIPPED 2026-07-01] — students write id-only
   `roster.{uid}.viewingResourceId` + `viewingAt` (Tier-1, ref-guarded against repeat writes); the
   dock's Students section shows ● on it / ○ elsewhere / – no signal against each student's
   resolved target.

---

## 5. WebRTC message envelope

Current wire format (both games): `{ type: string, payload: object }`, JSON over an ordered
reliable data channel, star topology (teacher relays).

**Message types — Live Polling:**
`poll` · `closePoll` (id-less payload = "close whatever is showing") · `pollResults` (anonymous
aggregate; free text suppressed) · `response` (guest→host) · `hostClosed` [SHIPPED 2026-07-01].

**Message types — Concept Pictionary:**
`roundStart` (concept only to drawers) · `roundResolved` · `roundSync` `{active:false}` [SHIPPED] ·
`stroke` / `strokeUndo` (host validates sender owns the stroke) / `strokeHistory` (late-join replay)
· `canvasClear` · `guess` (guest→host) · `hostClosed` [SHIPPED].

**Dedup/idempotency today:** responses upserted by `uid` (`upsertPollResponse`); stale `closePoll`
ignored via `shouldApplyPollClose(activePoll, payload)`; strokes carry `strokeId`; round state
carries `roundId` + `startedAt` so countdowns sync clock-free.

**[ROADMAP] Unified envelope for the next activity** (do NOT retrofit the shipped games until a
third activity forces the shared `LiveTransport` extraction):

```js
{ v: 1, type: 'activity:start' | 'activity:close' | 'response:submit' | 'results:share'
        | 'state:sync' | 'host:closed' | 'presence:update' | '<activity>:<verb>',
  activityId, msgId, seq, ts, payload }
```

Rules to carry over: per-uid dedup, id-less close = close-all, full-state replay on (re)connect,
terminal events for every teardown path.

---

## 6. Reconnect and late-join (as shipped)

**Signaling handshake:** guest full-overwrites `…/peers/{uid}` with `{offer, codename, createdAt}`;
host answers via merge; both sides delete the doc ~750ms after `connected`. 10s guest timeout →
`onFailed`.

**Late join / rejoin — the host replays authoritative state on every `dc.onopen`:**
- Polling: active poll re-sent; **no active poll → id-less `closePoll`** (clears stale overlays).
- Pictionary: `strokeHistory` replay + `roundStart` (concept only if drawer); **no round →
  `roundSync {active:false}`**.

**Student reload / drop:** guest overlay auto-rejoins (backoff 2/5/10/20/30s, capped at 8 attempts);
host replaces the stale peer on re-offer (compares `offer.sdp`) without touching the fresh
signaling doc.

**Teacher closes the panel:** host broadcasts `hostClosed`, defers peer teardown ~300ms to flush.
Polling students force-clear any active poll (shared results stay readable); Pictionary students
clear the round and the overlay auto-closes unless the resolution reveal is on screen.

**Teacher reopens the panel (polling):** the HostPanel writes a Tier-1 presence marker
`livePolling: { hostActive, hostOpenedAt }` on open/close. The shell passes it into `GuestOverlay`
(`hostActive` gates dialing; `hostOpenedAt` is a nonce that re-arms the retry budget). This bounds
signaling churn: guests only dial while a host is actually listening, and a whole class stops
retrying when the panel closes. Old shell + new module degrades to bounded retries; new shell + old
module degrades to legacy always-on. Pictionary needs no marker: its guest overlay only exists
while `pictionaryRound.active`/role assignment says so, and `hostClosed` closes it.

**Failure modes table:**

| Failure | Student sees | Recovery |
|---|---|---|
| Wi-Fi blip mid-poll | "Connection lost — reconnecting…"; submit says response NOT sent | auto-rejoin → host re-syncs poll state |
| Student reloads tab | overlay reappears on next poll/round | fresh offer → host re-offer replacement |
| Teacher closes panel | poll/round clears (terminal event) | presence marker / round metadata re-opens flow |
| Teacher soft-ends session | toast "session ended", full session exit | terminal-state check (§2.2) |
| Teacher hard-ends / tab close | same, via doc-not-found | existing behavior |
| Teacher tab crashes | overlays clear on channel death via bounded rejoin → failed + Retry | heartbeat [ROADMAP] for faster/cleaner signal |
| UDP blocked (school network) | polling: file-export fallback; pictionary: failed + Retry | TURN server [ROADMAP §8] |

---

## 7. Gemini Canvas constraints (why the code is shaped like this)

- **No build step**: `AlloFlowANTI.txt` is pasted whole; CDN modules load from
  `alloflow-cdn.pages.dev/<module>.js?v=<hash>`. ANTI edits and module edits ship together —
  **bump the `?v=` pins when deploying module changes** (line ~4925 for LivePolling; Pictionary
  likewise).
- Modules must tolerate the shell being older/newer than them (see the hostActive compat quadrants
  in §6). New props must default to legacy behavior when absent.
- Firestore writes can fail inside the Canvas sandbox (see the `catch` in `handleEndLiveSession`);
  every session write must be try/caught and the UX must not depend on the write succeeding.
- Fullscreen and some browser APIs no-op in the Canvas iframe — always feature-detect (the
  `useFullscreen` hook is the model).
- STUN only (`stun.l.google.com:19302`), no TURN: peer connections fail on symmetric-NAT/UDP-blocked
  school networks. The polling file-export fallback is the honest degradation; a TURN server is the
  real fix and is a **deployment** decision for the classroom phase (§8).

---

## 8. Classroom-phase roadmap (prioritized)

> Infrastructure items (#1 rules, #3 TURN, App Check) are specified in detail — including a draft
> rules file and a rollout order — in `docs/LIVE_SESSION_HARDENING_PROPOSAL.md` (2026-07-01),
> written for external IT review.

1. **Firestore security rules** — [DRAFTED 2026-07-01, deploy pending] `firestore.rules` now
   exists at the repo root, desk-checked against every student-mode write site; deploy +
   rollback + smoke instructions in `docs/FIRESTORE_RULES_DEPLOY.md`; emulator test matrix still
   owed with IT (proposal §2.2.5). Until published in the Firebase console, any authed client
   that guesses appId + code can still write session state.
   *(Session codes bumped 4→5 chars — ~28.6M combinations — same day.)*
2. **Host-side roster check** — [SHIPPED 2026-07-01] both hosts ignore offers from uids not in the
   session roster (`allowedUids` gate, kept fresh as students join). Defense-in-depth only until
   #1's rules make the roster itself trustworthy.
3. **TURN for school networks** — client hook [SHIPPED 2026-07-01]: both modules read
   `window.__alloRtcConfig` at connection time, so adding TURN is config, not code. The actual
   relay + short-lived-credential minting is an infrastructure decision — see
   `docs/LIVE_SESSION_HARDENING_PROPOSAL.md` §4. Keep the file-export fallback regardless.
4. **Presence heartbeat + roster status** — roster entries persist forever; teacher cannot tell
   connected/disconnected/stuck outside the polling panel. Add `roster.{uid}.lastSeenAt` (Tier-1)
   written on a slow cadence, and a teacher roster view with derived status.
5. **Live resource updates through the manifest path** (§4 gap) — stop silently dropping oldest
   resources on the trim-guard path.
6. **Live Session Center** — [PARTIALLY SHIPPED 2026-07-01] one teacher dock now replaces the
   per-feature floating buttons: Run (Live Poll / Quick Check preset / Pictionary), Guide (pacing
   toggle, groups, session code), Signals (student help signals, see below), and a privacy note.
   Quick Check rides the polling transport via the HostPanel `initialPoll` composer preset.
   **Help signals** shipped with it: students send an enum-only status (`stuck`/`slow`/`repeat`/
   `ready`) as Tier-1 `roster.{uid}.signal` + `signalAt`; the dock lists fresh (<10 min) signals
   with clear buttons. Still open for the full vision: quiz state surface, roster
   connected/disconnected status (needs #4), activity history, per-card privacy badges.
7. **Shared `LiveTransport` extraction** — when the third WebRTC activity appears, lift the
   duplicated host/guest classes (signaling, timeout, re-offer, terminal events, state-sync replay)
   into one module with the §5 envelope. Two implementations is duplication; three is a law.
8. **Bridge → WebRTC migration** — removes the last Tier-2 free-text exception (tracked at the
   allowlist comment).
9. **Per-student resource send** — [SHIPPED 2026-07-01] `roster.{uid}.resourceId` + `resourceAt`
   (Tier-1, id-only), precedence individual > group > class, consume-once in student-paced mode,
   push/clear from the Live Session Center's Students rows. See §4.1(3).
10. **Delivery acknowledgment** — [SHIPPED 2026-07-01] id-only `roster.{uid}.viewingResourceId` +
    `viewingAt` acks with ●/○/– status in the dock's Students section. See §4.1(4). The `viewingAt`
    timestamp doubles as a coarse presence signal until the heartbeat (#4) lands.

---

## 9. Tests and gates (what protects this)

- `tests/live_polling.test.js` — pure helpers: routing rules, rating scales, anonymous summaries
  (codenames/free text never leak into shared results), dedup, stale-close.
- `tests/live_polling_reconnect.test.js` — terminal event, state-sync on connect, re-offer
  replacement, signaling-doc preservation, guest `hostClosed` routing.
- `tests/concept_pictionary.test.js` — protocol smoke (concept only to drawers, stroke ownership,
  late-join replay, timer auto-resolve) + the same reconnect suite.
- `tests/session_soft_end_terminal.test.js` — source pins: soft-end terminal check in ANTI,
  `livePolling` Tier-1 leaf, presence props at the mount site.
- `tests/session_asset_sync.test.js`, `tests/firestore_sync.test.js` — manifest/chunking + sanitizers.
- Gates: `check_render_refs.cjs` (both modules), `check_free_vars.cjs` (RTC globals now known).

**Before further protocol work, add:** a Canvas smoke of one full poll round-trip (two browser
contexts), a jsdom test for GuestOverlay rejoin scheduling (fake timers), and a
network-blocked-path test for the export fallback.

---

## 10. Change discipline

- `concept_pictionary_source.jsx` is the source; always rebuild via
  `node _build_concept_pictionary_module.js` (also syncs prismflow mirror).
  `live_polling_module.js` is hand-maintained — copy to `prismflow-deploy/public/` after editing.
- Any new session-doc field: add to `SESSION_TIER1_LEAVES` **with a justification comment**, or
  keep it out of Firestore entirely.
- Any new teardown path: emit a terminal event (§2.3 invariant).
- Deploying module changes requires bumping the `?v=` pins in ANTI.
