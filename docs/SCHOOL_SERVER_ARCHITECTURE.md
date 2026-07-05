# School Box District/Server Architecture

Status: DESIGN (handoff step 7). Author: Claude (Fable), 2026-07-05. Implements the
vision in `ALLOFLOW_DESKTOP_LOCAL_FIRST_VISION_2026-07-04.md`; extends the running
foundation in `desktop/runtime/alloflow-desktop-runtime.cjs` + `desktop/schoolbox/`.

## Core rule (inherited, non-negotiable)
The school owns the data boundary. Aaron is never the vendor of record. Cloud use is
explicit, school-owned, never a hidden default for student data.

## The three tiers (already contracted in runtime-contract.json liveSession.modes)
1. **schoolbox-lan** (SHIPPED): teacher desktop hosts; students join over LAN;
   PIN-latched share listener; in-memory sessions with TTL. Same-room only.
2. **district-server** (THIS DOC): a school/district-hosted School Box server that
   is a *superset of the LAN bridge contract* — same session document API
   (`/api/lan-sessions/{code}` GET/PATCH/events + join pages + PIN gate), served
   from school infrastructure so remote/multi-room classes work.
3. **byo-firebase** (contracted): school's own Firebase tenant; config-only.

## District server = the desktop runtime, re-hosted
KEY DECISION: do NOT write a new server. Extract the existing, smoke-tested pieces
(LAN session store, share listener allowlist, PIN latch, join/presenter pages) into
a headless node service (`schoolbox-server`) deployable via the docker stack already
seeded in `desktop/schoolbox/` (compose + nginx + pocketbase). Rationale: the
student-safe allowlist and PIN gate are already validated by `--smoke`; parity by
construction, one contract to maintain.

- **Persistence**: swap the in-memory `lanSessions` Map behind a tiny store
  interface: `memory` (default, TTL 8h, nothing survives restart) or `pocketbase`
  (already in the stack) for schools wanting same-day resume. NEVER long-term
  student records: sessions expire (default TTL 24h hard cap), rosters are
  nicknames + uids only, exports are explicit teacher actions to LOCAL files.
- **Auth model**: teacher actions (create/end session) require a teacher token
  (per-school shared secret or pocketbase account — school's choice); students
  remain code+PIN only (no student accounts, no PII). The public allowlist stays
  byte-compatible with `handlePublicLanApi`.
- **Transport**: nginx TLS (school cert) in front; SSE for events (already in
  the contract) — no websockets dependency.
- **Keys**: NO AI keys on the server. AI stays client-side (teacher's app / desktop
  keychain). The server never proxies Gemini. This keeps the server's data surface
  to: session codes, nicknames, ephemeral session docs.
- **Logs**: access logs redact query strings (join PINs travel as `?pin=`) —
  nginx `log_format` must strip args; app logs already avoid PII.
- **App side**: `alloflow_live_session_config.lanApiBase` simply points at the
  district server URL instead of the teacher laptop — the SAME config seed the
  join page already writes. The pending in-app LAN adapter (the known gap) is the
  shared prerequisite for both tiers and should be built FIRST.

## What a school must configure (the whole checklist)
1. A host (any docker-capable box) + DNS name + TLS cert.
2. `docker compose up` from `desktop/schoolbox/` (server profile).
3. Teacher secret (env) + optional session TTL/PIN policy.
4. Firewall: 443 in from school network(s) only. No internet exposure required.

## Build order (next sessions)
1. **In-app LAN adapter** — **runtime half SHIPPED 2026-07-05** (incl. new
   `/api/lan-docs/{key}` asset bridge); app half validated (18-assert harness)
   and staged at `desktop/app-adapter/` awaiting a free `AlloFlowANTI.txt`
   (two-anchor insert, instructions in that folder's README).
2. Extract `schoolbox-server` from the runtime (share-listener code path + store
   interface); smoke test = existing `--smoke` asserts run against the container.
3. Compose profile + nginx redaction config + teacher-token gate.
4. Command-center "District server" wizard step 3 (URL + token + test button).
5. Pilot doc for King Middle IT.

## Explicitly out of scope
Grades/LMS integration, student accounts, cross-school federation, any analytics
that outlive a session. FERPA language stays modest per house rule.
