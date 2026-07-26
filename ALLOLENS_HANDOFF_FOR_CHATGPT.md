# AlloLens Command Center — Handoff for ChatGPT / Codex

_Authored 2026-07-24 by Claude (Opus 4.8) for a ChatGPT/Codex instance picking this thread up cold. Self-contained on purpose: you do not share my session or memory. Nothing here has been deployed. Prototypes are standalone files outside the repo; nothing has been integrated into the app yet._

---

## TL;DR

AlloLens is a proposed AlloFlow capability that gives teachers Brisk-style reach into arbitrary on-screen material **without a browser extension**. Two working standalone prototypes exist. The core insight: you cannot cross the browser same-origin wall from web content, so instead the **human is the bridge** — screen capture reads any screen (pixels, not DOM), the AI transforms it, and the teacher pastes the result wherever they need it. A second mode ("Guide Me") uses the same capture as an on-screen navigation coach. Decision so far: build **educator-first**; a learner mode is a gated phase 2 on a local (zero-egress) model.

---

## Read these first (source of truth, all at repo root)

1. **`UDL_REACH_AND_STRATEGY_HANDOFF.md`** — the full reach roadmap (Part I) and a Machiavellian strategic shadow-work lens (Part II, explicitly a stress-test, not the mission). Part I is the spec this work implements.
2. **`ALLOFLOW_CRITIQUES_ANSWERED.md`** — ten adversarial critiques steelmanned and answered. Context for the values/guardrails.
3. This file — the concrete state and next steps for AlloLens specifically.

---

## Where things stand right now

**Two prototypes (standalone HTML, NOT in the repo, live in `C:\tmp`):**

- `C:\tmp\allolens-capture-prototype.html` — **Rung 1, the capture command center (educator).** Session-persistent `getDisplayMedia` (one display-picker per session, silent frame grabs after), a review-before-send gate, two action groups (**Make Accessible**: level / gloss / questions / differentiate; **Guide Me**: on-screen navigation coach with an optional goal field). Makes a **real Gemini `generateContent`** call (needs a Gemini API key pasted in box 0; model field defaults to `gemini-2.5-flash`). Make-Accessible output is shaped as an AlloFlow **resource** `{id, type, title, body, ...}` and has a `SessionTransport.publishResources` delivery stub. Includes a sensitive-data + DPA disclaimer.
- `C:\tmp\allolens-docs-prototype.html` — **Rung 2, Google Docs in-place write-back.** Google Picker + `drive.file` scope + Docs `batchUpdate` + Drive comments. Needs Aaron's OAuth Client ID + API key. The transform is a local stub; `runAlloFlowTransform()` is the seam.

**To run either:** serve from localhost (capture and OAuth both need a secure/registered origin, not `file://`): `python -m http.server 8080` in `C:\tmp`, then open `http://localhost:8080/<file>`. For the Docs one, register `http://localhost:8080` as an Authorized JS origin on the OAuth client.

**Naming (proposed, Aaron's call, not settled):** umbrella name **AlloLens** with two modes, **Make Accessible** and **Guide Me**. Alternatives if leading with the coach identity: AlloGuide, AlloSidekick. Aaron flagged the "Guide Me" mode reads like on-demand IT support and wants it elevated, not treated as a side feature.

---

## Verified codebase facts (grounded by reading the source — do not re-derive)

- **`session_transport_module.js`** is the delivery seam. `createFirebaseTransport` and `createMailboxTransport` expose the same interface: `capabilities()`, `publishResources(history)`, `publishPolicy()`. `selectTransportKind({mailboxActive})` picks the backend. One shared filter `studentSafeResources(history, teacherOnlyTypes)` requires each item to have an `id` and a `type` and to not be a teacher-only type. `followResource` (the "class follows me here" pointer) rides the shared session doc on both transports. **Implication:** AlloLens should be a *producer of resources* and call `publishResources`; do not build a new delivery layer.
- **`apps_script/session_mailbox/Code.gs`** (VERSION 9) is a **teacher-deployed Apps Script Web App** (`Execute as: Me / Access: Anyone`) on the teacher's own Google account. Auth is **capability tokens** (admin token / QR join-secret / HMAC participant token), no student logins, no per-user OAuth. It writes only to one `"AlloFlow Class Mailbox"` Drive folder. This is a *third* auth model, distinct from Firebase and from the Docs `drive.file` OAuth — it is **not** redundant with the Docs path and does **not** shortcut its OAuth.
- **The `drive.file` scope** (Docs prototype) is deliberately not a restricted scope, so it avoids the CASA security assessment. Do not widen it to full Drive without a very good reason.
- **The FERPA fork (the one real decision):** a cloud-vision capture (`callGeminiVision`) introduces an egress path that mailbox's "nothing leaves the teacher's account" posture deliberately avoids. A local model preserves it. This is a posture decision, not a features decision.

---

## Decided vs. open

**Decided (by Aaron this session):**
- Build **educator-first**; learner mode is gated phase 2 on a local model, teacher-enabled + student-opt-in (AlloFlow's existing toggle pattern), no delivery.
- No browser extension. Reach = a set of sanctioned connectors (Google Picker, LTI, capture) unified by AlloFlow transforms. The arbitrary-webpage long tail stays extension-only and is out of scope.
- Guide Me is a first-class mode, not a side feature.

**Open (Aaron's call — do not assume an answer):**
- Cloud vs. local for capture (the FERPA fork).
- Final name.
- Whether/when to start learner mode.
- Whether to build the LTI connector (higher reach) before or after this.

---

## Suggested next steps (ranked)

1. **Map `type: 'lens_capture'` to AlloFlow's real resource taxonomy** so Make-Accessible output round-trips through `SessionTransport.publishResources` for real (not the stub). Verify the chosen type is NOT in `TEACHER_ONLY_TYPES`. This is the first genuinely in-repo task.
2. **Integrate the capture core into the app behind `ctx.callGeminiVision`**, reusing Video Studio's existing capture plumbing rather than new `getDisplayMedia` code. Keep the cloud/local call behind one function so the FERPA fork is a one-line swap later.
3. **Harden the Guide Me prompts** against a couple of real edtech screens (Classroom, an SIS, a district portal). It refers to on-screen labels by name and is told not to invent anything not visible — keep that constraint.
4. **Do NOT** start the supervised computer-use spike (Rung 4 in the strategy doc). It is explicitly gated behind King Middle pilot reliability. Leave it alone.

---

## Traps when you touch the real repo (learned the hard way)

- **Pin the exact `AlloFlowANTI.txt` path and verify line count before editing.** There are multiple copies (repo root, `desktop/web-app/src/`, built mirrors under `desktop/.../public/`). Editing the wrong one is a known failure. Grep for the registration/reachability of a symbol before "fixing" it — the fossil tree has dead duplicates.
- **Keep generated CDN module / source pairs in sync.** When both a source (`*_source.jsx`) and a built module (`*_module.js`) exist, edit both or the build will drift.
- **`Code.gs` must stay backtick-free** — it ships embedded in the app as a template literal. If you touch the mailbox for delivery, no backticks.
- **Always `node --check` any JS you write; apply edits yourself, no mutating agent fan-outs.**
- **One working tree, shared with Aaron and Claude.** Use pathspec commits only; never `git amend`, `git reset --relative`, or bare `git stash`. Treat uncommitted changes as someone else's work. Add a Work Log row in `AGENT_HANDOFF.md` before editing.
- **Do not deploy** unless Aaron explicitly asks. Gemini Canvas is the deploy target; `AlloFlowANTI.txt` is the orchestration hub.

---

## Ground rules for this thread

- The prototypes are validation instruments, not the product. The go/no-go question is whether the differentiated transform (leveling/differentiation/Guide) is good enough that a teacher will capture-and-paste for it. Feel the real output before building more.
- Keep privacy language modest and configuration-dependent, matching the repo convention ("FERPA-aligned/supports", not absolute compliance). The disclaimer in the capture prototype is the accurate baseline: a DPA governs *how* data is processed and does not remove the need to avoid capturing passwords/PII.
- When in doubt on an open item, ask Aaron rather than assume — several of the open items are posture decisions that are his to make.
