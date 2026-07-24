# Deploying the Firestore Rules (step-by-step)

> **Superseded deployment procedure (2026-07-09).** Do not paste these rules manually and do
> not roll back to unknown console rules. Keep Firestore in production-mode deny by default.
> When intentionally enabling live sessions, follow [DEPLOY_YOUR_OWN.md](../DEPLOY_YOUR_OWN.md)
> and deploy the versioned rules plus TTL configuration with
> `firebase deploy -c firebase.live-sessions.json --only firestore:rules,firestore:indexes`.
> (`firebase.live-sessions.json` exists at the repo root as of 2026-07-12 — it points the CLI at
> `firestore.rules` + `firestore.indexes.json`, whose fieldOverrides declare the `expiresAt` TTL
> policies for `session_assets`, signaling `peers`, and `_alloflowRateLimits`. The app already
> writes `expiresAt` on those docs (24h live / 30d assignments); until the TTL policy is deployed
> to an owned project, expired docs simply linger and are ignored/overwritten — verify the policy
> shows "Active" under Firestore → TTL in the console after deploying.)
> App Check monitoring/enforcement and emulator coverage are release requirements. The historical
> checklist below remains only as behavioral context.
>

> **Deployment snapshot note (2026-07-09):** This checklist was written against the 2026-07-01 live-session paths. Before using it, compare `firestore.rules`, `docs/LIVE_SESSION_PROTOCOL.md`, and the current Firebase project settings; do not assume the "today" statements below still describe the live demo project without checking the console.

For Aaron. The rules file is [`firestore.rules`](../firestore.rules) at the repo root.
Written 2026-07-01 against the live-session write paths verified the same day.
Background/threat model: `docs/LIVE_SESSION_HARDENING_PROPOSAL.md`.

## First: which Firebase are you on? (important — verified 2026-07-01)

AlloFlow runs against **two different Firebase backends** depending on surface
(`App.jsx` ~line 495):

1. **Gemini Canvas** — the platform *injects* `__firebase_config`: a **Google-managed Canvas
   project**. It is not yours, you have no console for it, and **these rules cannot be deployed
   there.** Access control on that surface is Google's platform policy (apps are namespaced under
   `artifacts/{appId}/…` with platform-issued auth). Nothing for you to do — and nothing you
   *can* do — at the database layer for Canvas.
2. **desktop/web-app (the public demo site)** — uses the owned project **`prismflow-911fe`**
   (see `desktop/web-app/.env`). **This is where these rules deploy**, at
   [console.firebase.google.com](https://console.firebase.google.com) → project `prismflow-911fe`
   → Firestore Database → Rules. Whatever rules it has today are whatever was set when the
   project was created (possibly open "test mode").

Why this still matters even though Canvas is the primary surface: the demo site is public and its
project is reachable by anyone with its (client-shipped) config; and more importantly, the
**classroom phase should run on an owned project anyway** — a Google-managed Canvas backend means
no data-processing agreement, no retention control, and no audit trail, which a district will not
accept. These rules are the ready-made security layer for that project, whether it's
`prismflow-911fe` or a fresh one for the pilot.

**The one-sentence version:** today anyone with the demo's Firebase config (which ships in the
client) can write anything to `prismflow-911fe`; after this deploy, only the teacher who created a
session can control it, students can only touch their own roster/quiz/reaction entries, and
session codes can't be listed out of the database.

## Before you deploy

1. Open [Firebase console](https://console.firebase.google.com) → **`prismflow-911fe`** →
   **Firestore Database → Rules**.
2. **Copy everything currently in the editor** into a new file `docs/firestore.rules.PREVIOUS`
   in the repo (or anywhere safe). This is your instant rollback.
3. Note: deploying rules does NOT touch data. It only changes what future reads/writes are
   allowed. Rollback is pasting the old text back and hitting Publish (takes ~1 minute).

## Deploy

4. Paste the full contents of `firestore.rules` into the editor, replacing what's there.
5. Press **Publish**. Rules go live within a minute.

## Smoke test (do this right after, ~10 minutes, two devices/browsers)

Teacher device (the one that starts the session) + one student device (incognito window works).

| # | Action | Expect |
|---|---|---|
| 1 | Teacher: start a live session | Code appears (now 5 characters), students can join |
| 2 | Student: join with the code | Roster shows the student on the teacher device |
| 3 | Teacher: open Live Session Center → run a Quick Check; student answers | Response arrives (this is WebRTC — should be unaffected, but confirms signaling docs still work) |
| 4 | Student: send a help signal (✋) | Appears in the teacher dock |
| 5 | Teacher: push a resource to the student (→ button) | Student jumps to it; status dot turns ● |
| 6 | Teacher: run a live quiz question; student answers | Answer lands in the teacher dashboard |
| 7 | Teacher: Pictionary round with the student as drawer | Strokes flow both ways |
| 8 | Teacher: end the session (both the session modal way and the quiz-dashboard way, on two separate runs) | Student exits cleanly both times |
| 9 | Student: in Adventure democracy mode, cast a vote | Vote registers (tally moves on other devices) |
| 10 | Student (dev tools, optional adversarial check): try `updateDoc` on another student's roster entry or on `mode` | **Fails** with permission-denied |

*(2026-07-02 audit note: democracy voting and collaborative escape-room team play were added to the
student-writable rules after a niche-feature sweep — an earlier rules draft would have blocked
them. The escape-room team sync also had a broken Firestore path in code, fixed the same day, and
its team-assignment UI doesn't exist yet — see the protocol spec's findings — so escape-room
collaboration can't be fully smoke-tested until teams can actually be assigned.)*

If anything in 1–8 fails: paste `docs/firestore.rules.PREVIOUS` back, Publish, and note exactly
which step failed — that's a one-line fix in the rules, not a reason to abandon them.

Console → Firestore → **Rules Playground** (in the Rules tab) can also simulate reads/writes
without touching real data, if you want to poke at it before the two-device test.

## Things to know (honest caveats)

- **Where failures surface:** every session write in the app has a `.catch` — a rules rejection
  shows up as a toast/console warning, never a crash. That's why the smoke matrix above is
  behavioral, not console-watching.
- **Teacher identity = the browser.** "Host" is the anonymous Firebase user that created the
  session. If the teacher's browser storage is wiped mid-session (or Canvas hands out a fresh
  storage partition), the teacher loses host rights on that session — in practice you'd just
  start a new session, which is what a reload forces today anyway.
- **Gemini Canvas is unaffected by this deploy** — it runs on Google's own injected project (see
  the "which Firebase" section above), so test the rules on the desktop/web-app site, not in
  Canvas. Canvas behavior stays exactly as it is today.
- **Not covered by this deploy:** App Check (separate, see proposal §3 — do rules first),
  TURN (§4), and the two accepted soft spots: `session_assets` is authed-write and
  `conceptMastery` is authed-read (proposal §2.2 explains both and the follow-ups).
- **Emulator tests:** the gold-standard validation is the Firebase emulator test matrix in
  proposal §2.2.5 — worth doing when your IT person is involved. The rules were desk-checked
  against every write site in the code (enumerated 2026-07-01), and the smoke matrix above
  exercises each of them live, which is reasonable coverage for the demo phase.
