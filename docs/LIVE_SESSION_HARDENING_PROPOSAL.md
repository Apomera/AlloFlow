# AlloFlow Live Session Hardening Proposal

**Status:** Proposal v1.0 — 2026-07-01. Written for review by an IT/security professional before
the classroom phase. Companion to `docs/LIVE_SESSION_PROTOCOL.md` (the as-built protocol spec).

> **Proposal snapshot note (2026-07-09):** This July 1, 2026 proposal reflects the live-session security model known at that time. Verify current `firestore.rules`, `docs/LIVE_SESSION_PROTOCOL.md`, Desktop/School Box session behavior, and Firebase/App Check/TURN configuration before treating backend, mitigation, or gap statements below as current.

**What this covers:** the four infrastructure-level gaps that in-app code cannot close on its own —
Firestore security rules, request attestation (App Check), TURN relay for school networks, and
session-code entropy — plus the client-side mitigations already shipped and their honest limits.

---

## 0. Threat model (what we are and aren't defending against)

**Two backends (correction, verified 2026-07-01):** on **Gemini Canvas** the platform injects
`__firebase_config` — a *Google-managed* project we cannot configure (no console, no rules
deploy; platform policy governs it; per-app `artifacts/{appId}` namespacing). Outside Canvas, the
desktop/web-app demo uses the *owned* project **`prismflow-911fe`** (`desktop/web-app/.env`) —
everything in §2/§3 applies to that project, and to whatever owned project hosts the classroom
phase. The classroom phase should run on an owned project regardless: a platform-managed backend
offers no DPA, retention control, or auditability for a district.

AlloFlow's live sessions run on a Firebase project using **anonymous authentication**. All live
data lives under `artifacts/{appId}/public/data/…`. Students' content (poll answers, free text,
drawings, guesses) travels **peer-to-peer over WebRTC** and never touches the backend; Firestore
carries only operational metadata (Tier-1, enforced by an in-app allowlist) plus teacher-authored
content. Details in the protocol spec §3.

Realistic adversaries for a middle-school pilot:

- **A curious student** in the class who opens dev tools: can currently write any Tier-1 field of
  the session doc (rename classmates' codenames, clear signals, flip pacing) because Firestore has
  no server-side rules constraining *which* fields *which* uid may write.
- **A drive-by outsider** who learns or guesses `appId` + a 4-character session code: can read the
  session doc (codenames + xp + metadata — no student content), join the roster, and dial the
  WebRTC host as a fake "guest."
- **Not in scope:** a compromised teacher device, Google/Firebase infrastructure, or students
  photographing screens. Also note the strongest privacy property is architectural and already
  holds: even a fully compromised Firestore yields **no student responses, drawings, voice, or
  free text**, because those never leave the devices.

## 1. What is already shipped in code (and its limits)

| Mitigation | Status | Limit |
|---|---|---|
| Tier-1 allowlist (`writeToSession`) blocks student content from Firestore | LIVE | Client-side only — honest-client guard, not a security boundary |
| WebRTC hosts ignore offers from uids not in the session roster (`allowedUids` gate, polling + Pictionary) | SHIPPED 2026-07-01 | Roster is client-writable until rules land, so an attacker can add themselves first |
| Signaling docs deleted ~750ms after connect; carry only SDP/ICE/codename | LIVE | Brief exposure window; content is connection plumbing, not student data |
| Host presence gating + bounded rejoin budgets (bounds signaling churn/abuse surface) | SHIPPED 2026-07-01 | — |
| `window.__alloRtcConfig` override hook for ICE servers | SHIPPED 2026-07-01 | Enabler only — needs an actual TURN deployment (§4) |
| Anonymous poll aggregates suppress free text; codenames are dropdown-curated (no free-typing) | LIVE | — |

The rest of this document is what requires Firebase-console / infrastructure action.

## 2. Firestore security rules (highest priority)

There is **no rules file in the repo** and, as far as we know, the project runs on permissive
defaults. This is the single biggest gap: rules are the only *server-enforced* boundary.

### 2.1 Draft rules

> **Update 2026-07-01 (later the same day):** the refined, deployable version now lives at
> [`firestore.rules`](../firestore.rules) in the repo root, desk-checked against a full
> enumeration of every student-mode write site in the code (roster.{uid} join/xp/signals/acks,
> quizState.allResponses.{uid}, bridgeReactions.{uid} — nothing else; the one conflicting write,
> students performing the stale-bridgePayload TTL cleanup, was relocated in code so the host
> performs it). Step-by-step deploy/rollback/smoke instructions for Aaron:
> `docs/FIRESTORE_RULES_DEPLOY.md`. Emulator testing (§2.2.5) remains the gold standard and
> should still happen with IT; the in-app smoke matrix covers the demo phase.

The draft below matches the actual data model (paths verified against the code 2026-07-01). It is
a **starting point for review and Firebase-emulator testing, not a paste-and-deploy artifact** —
the nested `Map.diff` constraints in particular need emulator test coverage before enforcement.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function authed() { return request.auth != null; }

    match /artifacts/{appId} {

      // ── Live session documents ────────────────────────────────────────
      match /public/data/sessions/{code} {
        function sessionHost() { return resource.data.hostId; }
        function isHost() { return authed() && sessionHost() == request.auth.uid; }
        // Students need GET by code; LIST would allow enumeration — deny it.
        allow get: if authed();
        allow list: if false;
        allow create: if authed() && request.resource.data.hostId == request.auth.uid;
        allow delete: if isHost();
        // Host may update anything; a non-host participant may only touch:
        //   roster.{their own uid}            (join, xp, signals, viewing ack)
        //   quizState.allResponses.{their uid} (structured quiz answers)
        //   bridgeReactions.{their uid}        (emoji enum)
        allow update: if isHost() || (
          authed() &&
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['roster', 'quizState', 'bridgeReactions']) &&
          (
            !('roster' in request.resource.data.diff(resource.data).affectedKeys()) ||
            resource.data.get('roster', {})
              .diff(request.resource.data.get('roster', {}))
              .affectedKeys().hasOnly([request.auth.uid])
          ) &&
          (
            !('quizState' in request.resource.data.diff(resource.data).affectedKeys()) ||
            (
              resource.data.get('quizState', {})
                .diff(request.resource.data.get('quizState', {}))
                .affectedKeys().hasOnly(['allResponses']) &&
              resource.data.get('quizState', {}).get('allResponses', {})
                .diff(request.resource.data.get('quizState', {}).get('allResponses', {}))
                .affectedKeys().hasOnly([request.auth.uid])
            )
          ) &&
          (
            !('bridgeReactions' in request.resource.data.diff(resource.data).affectedKeys()) ||
            resource.data.get('bridgeReactions', {})
              .diff(request.resource.data.get('bridgeReactions', {}))
              .affectedKeys().hasOnly([request.auth.uid])
          )
        );
      }

      // ── WebRTC signaling (polling + pictionary use the same shape) ────
      match /public/data/{signalingCollection}/{code}/peers/{peerUid} {
        function isSignaling() {
          return signalingCollection in ['signaling', 'pictionary-signaling'];
        }
        function isSessionHost() {
          return get(/databases/$(database)/documents/artifacts/$(appId)/public/data/sessions/$(code)).data.hostId == request.auth.uid;
        }
        // The guest owns their doc (offer/ICE/codename); the HOST must be able
        // to merge the answer + host ICE into that same doc.
        allow read: if isSignaling() && authed() && (request.auth.uid == peerUid || isSessionHost());
        allow create: if isSignaling() && authed() && request.auth.uid == peerUid;
        allow delete: if isSignaling() && authed() && (request.auth.uid == peerUid || isSessionHost());
        allow update: if isSignaling() && authed() && (
          (request.auth.uid == peerUid &&
            request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['offer', 'codename', 'createdAt', 'expiresAt', 'iceFromGuest'])) ||
          (isSessionHost() &&
            request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['answer', 'iceFromHost']))
        );
      }

      // ── Chunked session assets (teacher resources manifest + chunks) ──
      match /public/data/session_assets/{assetId} {
        allow read: if authed();
        allow write: if authed();   // see §2.2 note — tighten with host binding later
      }

      // ── Cross-session concept mastery (see §2.2 design question) ─────
      match /public/data/conceptMastery/{uid} {
        allow write: if authed() && request.auth.uid == uid;
        allow read: if authed();    // teachers read students' docs for retention dashboards
      }

      // ── Per-user private data ─────────────────────────────────────────
      match /users/{uid}/{document=**} {
        allow read, write: if authed() && request.auth.uid == uid;
      }
    }

    // Default deny for anything not matched above.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.2 Known open design questions for the IT review

1. **Session updates by host vs. participant.** The draft distinguishes the host by
   `sessions/{code}.hostId` (already written at session creation). Anonymous uids rotate if the
   teacher clears browser storage — acceptable for per-lesson sessions, but worth confirming.
2. **`session_assets` writes** are authed-only in the draft (any signed-in client could write an
   asset doc). Tightening requires binding assets to a session/host (e.g. an `ownerUid` field
   checked in rules). Low risk (write-only garbage costs the attacker money, leaks nothing) but
   should be on the follow-up list.
3. **`conceptMastery` reads** are authed-only because teachers legitimately read other students'
   docs for the retention dashboard. That means any authed client can read attempt metadata
   (status enums + timestamps, pseudonymous uid, no content). If IT considers that unacceptable,
   the fix is restructuring the feature (per-session copies or a teacher-scoped path), not a rules
   tweak — flag it now, don't block the rest of the rules on it.
4. **Signaling `get()` cost**: the host check does one extra document read per signaling write.
   Negligible at classroom scale.
5. **Emulator tests are mandatory** before enforcement: nested `Map.diff` expressions are easy to
   get subtly wrong, and a wrong rule here bricks live sessions. Minimum test matrix: student
   join, xp sync, signal write, quiz answer, another-student's-field write (must fail), host
   answer-merge on a signaling doc, non-host answer-merge (must fail), session create/delete,
   LIST attempt (must fail).
6. **Canvas sandbox caveat:** some session writes already fail inside Gemini Canvas and the app
   tolerates that (`handleEndLiveSession` catch). After rules deploy, re-run a full Canvas smoke
   to confirm nothing new fails-open or fails-loud.

## 3. Firebase App Check (request attestation)

Rules constrain *who may write what*; App Check constrains *what software* may talk to Firebase at
all (blocks scripted abuse/enumeration from non-app clients).

- Recommendation: **reCAPTCHA v3 (or Enterprise) App Check for web**, enforced on Firestore +
  Auth, after a monitoring period in "metrics only" mode.
- **Critical caveat to test first:** AlloFlow's primary surface is an iframe inside Gemini Canvas.
  App Check attestation inside a sandboxed third-party iframe is exactly where reCAPTCHA
  integrations get flaky. Run it in *monitoring* mode and check the Canvas surface passes before
  ever enforcing. If Canvas can't attest, App Check may only be enforceable on the
  desktop/web-app surface — document whichever outcome the test shows.

## 4. TURN relay for school networks

Today both WebRTC features use STUN only (`stun.l.google.com:19302`). On school networks that
block UDP or use symmetric NAT, peer connections fail and students land on fallback paths (poll
file-export; Pictionary retry). A TURN relay fixes this by relaying traffic over TCP/443 when
direct paths fail.

**Traffic reality check:** AlloFlow's channels carry JSON control messages and stroke coordinates
— kilobytes per student-minute, no audio/video. Even if *every* connection relayed through TURN,
a 25-student class runs in the tens of MB per session. Cost is negligible on any provider; the
decision is operational, not financial.

Options (pricing checked 2026-07 — have IT verify current terms):

| Option | Cost ballpark | Notes |
|---|---|---|
| **Cloudflare Realtime TURN** (recommended first trial) | ~$0.05/GB egress | Fits the existing Cloudflare stack (CDN is already `alloflow-cdn.pages.dev`, KV in use); credentials minted via API from a small Worker |
| Twilio Network Traversal | pay-as-you-go per GB | Mature, easy; per-GB metering |
| Xirsys | free dev tier; paid from ~$33/mo | Fixed monthly tiers |
| Metered TURN | plans around $99/mo for 150GB | Overkill for this traffic profile |
| Self-hosted coturn | ~$6–12/mo VPS | Full control; adds an ops burden (patching, uptime) that a one-person project should probably not take on |

**Credential handling requirement:** TURN credentials must be **short-lived and minted
server-side** (a ~30-line Cloudflare Worker calling the provider's credential API). Do not embed
static TURN credentials in the client — they leak and get farmed as a free relay. The client hook
is already shipped: the Worker's response gets assigned to `window.__alloRtcConfig =
{ iceServers: [...] }` at app boot, and both WebRTC modules pick it up with zero further changes.

## 5. Session-code entropy and join abuse

- Current codes: 4 characters from a ~32-symbol confusable-stripped alphabet ≈ **1.05M
  combinations**. Fine against typos; weak against scripted enumeration *if* an attacker knows the
  `appId` and rules aren't enforced.
- With §2's rules (`list` denied, so guessing requires full-path GETs) plus §3's App Check, the
  practical enumeration surface shrinks dramatically. Codes are also short-lived (per lesson).
- **[SHIPPED 2026-07-01]** codes are now **5 characters** (~28.6M combinations, 31× the old
  space). Moving to 6 remains available if IT wants more margin.
- Not recommended: CAPTCHA or accounts for students — the anonymous-join flow is a deliberate
  FERPA-minimization feature (no student accounts, no PII), and rules+attestation address the
  actual risk.

## 6. Recommended rollout order

1. **Firestore rules** in a staging Firebase project → emulator test matrix (§2.2.5) → deploy to
   prod → full Canvas + prismflow smoke of: join, poll round-trip, Pictionary round, quiz answer,
   group/individual push, signals, end-session (both paths).
2. **App Check in monitoring mode** → verify Canvas attestation → enforce (or document Canvas
   exemption).
3. **Cloudflare TURN trial**: Worker minting short-lived creds → set `__alloRtcConfig` → verify a
   poll on a hotspot-simulated "blocked UDP" network relays successfully.
4. **Session-code length bump** to 5–6 chars (optional, cheap).
5. Revisit §2.2's follow-ups (session_assets host binding, conceptMastery read scope).

Items 1–2 are the ones to put in front of the IT reviewer first; 3 is independent and can proceed
in parallel; 4–5 are cleanup.

---

*Sources for §4 pricing:*
[Cloudflare Realtime TURN docs](https://developers.cloudflare.com/realtime/turn/) ·
[Cloudflare TURN/SFU product page](https://www.cloudflare.com/products/turn-sfu/) ·
[Twilio Network Traversal pricing](https://www.twilio.com/en-us/stun-turn/pricing) ·
[Xirsys pricing](https://xirsys.com/pricing/) ·
[TURN server costs guide (DEV)](https://dev.to/alakkadshaw/turn-server-costs-a-complete-guide-1c4b) ·
[Selecting managed STUN/TURN (webrtc.ventures)](https://webrtc.ventures/2024/11/selecting-and-deploying-managed-stun-turn-servers/)
