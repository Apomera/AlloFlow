# Standalone IT Coach: extraction scope

**Date:** 2026-08-11
**Status:** P1, the learner guardrail, and P2/P3 are built and committed locally.
P0 (live smoke) and P4 (discoverability) are open. See section 8.

**Decisions taken (Aaron, 2026-08-11):**
- **Audience:** both, posture-switched. One tool, educator and learner postures,
  per provenance section 13.1.
- **Learner guardrail:** navigation-only. The coach helps with the software and
  never advances schoolwork visible on the screen.
**Subject:** promoting Screen Coach out of the Video Studio popup into a standalone tool that guides a user through any website, including sites that have nothing to do with AlloFlow

---

## 1. What already exists, verified

Screen Coach shipped in two commits on 2026-08-04 (`1232faf87` beta, `8b81820ba` v2) and is
**live**. `https://alloflow-cdn.pages.dev/video_studio/video_studio.html` is byte-identical to
the working tree (md5 `d4921fbaa5`), as are all three desktop mirrors. The CDN serves the repo
root directly, so the push was the deploy.

Working today, inside the Video Studio popup:

| Capability | Where |
|---|---|
| Watch without recording (`getDisplayMedia` video only, no MediaRecorder, nothing saved) | `video_studio/video_studio.html:14198` |
| Browser "Stop sharing" ends the session (`track.onended`) | `:14209` |
| Goal box, one suggestion at a time, or auto every 12s | `:14330`, `:14377` |
| Last 3 suggestions sent as context, last 8 shown | `:14350`, `:14366` |
| Highlight box drawn over the preview | `drawCoachTarget:14286` |
| Reply clamped, degenerate box collapses to null rather than a wrong arrow | `vsSanitizeCoachAdvice`, `video_studio_module.js:2927` |
| Document Picture-in-Picture "float on top" mirror with the box and a guidance bar | `:14235` |
| Spoken guidance via `speechSynthesis` | `:14318` |
| Consent checkbox enforced **before** the frame is read, test-pinned in that order | `:14332`, `tests/video_studio.test.js:3360` |
| One downscaled JPEG per suggestion (max 1280px wide, q0.7) | `grabCoachFrame:14307` |
| Advisory-only contract in both the prompt and the UI copy | `video_studio_module.js:3828`, popup `:496` |
| Command `open_screen_coach`, aliases include "coach me" and "help me use another site" | `allo_commands_source.jsx:858` |

Tests: `tests/video_studio.test.js:3327-3396` cover the sanitizer plus structural pins on the
consent ordering, teardown, watch-only mode, and PiP.

**The capture is already site-agnostic.** The prompt says so outright ("it may be any website or
application"). Nothing about the coaching loop assumes AlloFlow is the coached surface.

## 2. The four things that make it not standalone

**2.1 The AI leg runs through the parent window.** `bridgeRequest` returns
`{error:'needs the AlloFlow window'}` when there is no opener (`:8190`), and the vision call is
the app's `window.callGeminiVision` (`video_studio_module.js:3825`). Open the popup by URL and
the coach is inert. This is the only true blocker.

Worth noting that the popup shell already anticipates this: with no opener it labels itself
"Standalone mode (no AlloFlow window)" in `#linkState` (`:4755`) and keeps running. Capture,
preview, overlay, and PiP all work in that state. It is only the AI leg that has nowhere to go.

**2.2 The highlight is on our mirror, never on their page.** The box is painted on
`#coachOverlay` above `#previewVideo`, or in the PiP window. A popup page cannot reach into a
cross-origin tab, so a real in-page overlay would require a browser extension or a bookmarklet.
That is a different product with a different distribution story, and it is out of scope here.
What we have instead is the floating-mirror model: the user works in their own tab and glances
at a small always-on-top window. That model is already built and is the right one to commit to.

**2.3 It is buried.** The user must open Video Studio, a 14k-line recording and editing surface,
and find a card at the top of the Record tab. There is no Educator Hub card for the coach
(confirmed absent).

**2.4 No i18n.** The popup has no `t()` layer at all, so a standalone page inherits English-only.

## 3. Proposed architecture

### 3.1 Transport: reuse `AIProvider`, do not re-implement

`ai_backend_module.js` is already a plain `<script>` module that sets `window.AIProvider`
(`:3206`) and exposes `analyzeImage(prompt, base64Data, { mimeType })` (`:2516`), which routes
across `gemini | openai | claude | ollama | localai | lmstudio | alloflow-local | custom`.
It is not React, not bundled, and has no AlloFlow dependency at the call site.

This is the whole answer to gap 2.1. The standalone page loads that one module, holds its own
backend config, and calls `analyzeImage` directly. Keep the bridge path when an opener exists,
so the coach launched from inside AlloFlow keeps using the app's configured key and the user
never enters a key twice.

Resolution order: opener bridge if present, else the page's own configured backend, else an
honest "no backend configured" state with a link to set one up.

**The local-backend option is the headline, not a footnote.** With `ollama` the vision model
defaults to `moondream` (`:1390`) and the request goes to `http://localhost:11434`. That means an
IT coach where the screenshot never leaves the machine. Given that the surfaces a school user
most wants coaching on are exactly the ones we least want screenshotted to a cloud vendor (SIS,
gradebook, IEP system, state reporting portal), a working no-egress mode is arguably the reason
this tool should exist at all. Cloud backends stay available and stay behind the consent tick.

### 3.2 The page

New `it_coach/it_coach.html`, self-contained, same posture as the Video Studio popup (top-level
page, no framing, its own origin path on the CDN).

Code to lift, essentially verbatim:

| From | Lines | Notes |
|---|---|---|
| Coach card markup | popup `494-509` | drop the recording-specific copy |
| `#coachOverlay` canvas + `.stage` CSS | popup `514`, `60-62` | unchanged |
| Coach logic block | popup `14178-14387`, about 210 lines | unchanged except the two items below |
| `$`, `announce`, `setStatus`, `#live` region | popup `4142-4143`, `235` | about 5 lines, copy them |
| `vsSanitizeCoachAdvice` | `video_studio_module.js:2927-2944` | see 3.3 |

Two edits inside the lifted block:

- `coachCaptureActive()` currently accepts "watching **or** recording" (`:14190`). Standalone has
  no recorder, so it collapses to the watch stream alone.
- `runCoachSuggest` swaps `bridgeRequest(...)` for the transport resolver in 3.1.

Everything else, including the consent ordering, the teardown path, the PiP mirror, and the
history window, moves as-is.

### 3.3 The sanitizer needs a home

`vsSanitizeCoachAdvice` lives only in the module today; the popup trusts an already-sanitized
reply. A standalone page calls the model directly, so it must sanitize its own reply or the
clamping is silently lost, which is the exact failure the null-when-unsure rule exists to
prevent. Two options:

- **(a)** Promote it into a `[VS_SHARED]` block so the sync gate keeps the copies identical. This
  matches the existing convention and the existing test.
- **(b)** Let the standalone page carry its own copy and pin equality in a test.

Recommend (a): the shared-block gate already exists and already catches drift.

### 3.4 What it deliberately will not do

State these in the UI, not just in a doc:

- It cannot click, type, or navigate. It advises, the human acts. (Already the prompt contract.)
- It cannot draw on the site being coached. The highlight is on the mirror.
- Box positions are estimates. Already said in the card copy, keep it.

## 4. Effort

Roughly 250 lines of lift plus a new backend-config panel and its persistence. The genuinely hard
parts, meaning the consent flow, the watch-only capture lifecycle, the sanitizer, the overlay
renderer, the PiP mirror, and the advisory prompt discipline, are done and shipped. This is an
extraction and a transport swap, not a rebuild.

Suggested phases:

- **P0** Live smoke of the existing coach (section 6). Blocking: if the box estimates are poor,
  the design changes before any extraction, not after.
- **P1** Promote the sanitizer to a shared block. Small, independently safe.
- **P2** `it_coach.html` with the bridge transport only, launched from the app. Proves the lift
  without touching key handling.
- **P3** Standalone backend config, cloud plus local, with the resolution order in 3.1.
- **P4** Discoverability: Educator Hub card, and decide whether `open_screen_coach` points at the
  new page or keeps the Video Studio panel.
- **P5** i18n, if this ships to non-English users.

## 5. One tension to resolve on purpose

`docs/PROCESS_PROVENANCE_DESIGN_2026-08-04.md` section 13.1 states that there is exactly one
agent in AlloFlow, that Screen Coach is one of AlloBot's postures rather than a product, and that
nothing gets a second entry point to learn. A standalone IT Coach is a deliberate exception. It
is defensible, because the entire point is helping people on surfaces that are not AlloFlow and
where AlloBot has no presence, but it should be a decision rather than drift. The cheapest way to
honor both is to keep the standalone page visually and verbally AlloBot: same mascot, same voice,
same "direct about the tool" posture from the section 13.1 table.

## 6. Live smoke, still owed, needs a human

Nobody has watched this run. Vision quality and box accuracy are untested, and the share-picker
plus a real key means it cannot be automated here. Checklist:

1. Open AlloFlow, run "coach me", confirm Video Studio opens with the coach card expanded.
2. Click **Watch without recording**, pick a non-AlloFlow tab, for example a district SIS login or
   any site with a clear toolbar. Confirm the status line says watching and not recording.
3. Ask for a suggestion **without** ticking consent. Confirm it refuses and focuses the checkbox.
4. Tick consent, set a real goal, click **Suggest next step**. Judge two things separately:
   is the advice correct, and does the amber box actually land on the control it names.
5. Click **Float on top**. Confirm the mirror shows the box and the guidance bar, and that it
   stays visible while you work in the other tab.
6. Turn on **Auto every 12s**, perform the suggested step, confirm the next suggestion advances
   rather than repeating (the history window is doing its job).
7. Hit the browser's own **Stop sharing**. Confirm the session ends, the overlay clears, and the
   PiP window closes.
8. Reach the goal. Confirm `done:true` stops the auto loop and the status shows the completion tick.

Record for each suggestion whether the box was **on target, near, or wrong**. That ratio decides
whether the highlight ships as a headline feature or gets demoted to a subtle hint.

## 7. What was built, 2026-08-11

Three commits, all local, none pushed.

**`dcd64f0c8` P1: sanitizer into the shared block.** `vsSanitizeCoachAdvice` moved inside
`[VS_SHARED]` in both the module and the popup, so the existing sync gate guards every copy.

**`3abbd13d0` The learner guardrail.** The coach reply gained a `kind` field
(`navigation | content | unknown`) and the sanitizer gained `opts.posture`. Under
`posture: 'learner'` an academic-content reply is replaced whole, guidance and target box
together, because a highlight drawn around the right answer is the answer. An unclassified
reply counts as content. Enforcement sits in the clamp rather than only in the prompt: a
prompt is a request, and this needed to be a guarantee. The popup reads
`?allo_posture=learner`, defaults to educator, and the URL can only restrict.

**`it_coach/it_coach.html` P2 + P3: the standalone page.** Watch-only capture, overlay,
floating mirror, consent gate, spoken guidance, goal and history, all lifted from the popup.
Its own backend settings, local options listed first, persisted to `localStorage`.

Two things worth knowing about the page:

- **It loads the clamp, it does not copy it.** `video_studio_module.js` already exposes its
  pure helpers on `window.AlloModules.VideoStudio` when React is absent, which is how the
  tests reach them. The page uses that same door, so there is no third copy of the guardrail
  to rot. If the clamp fails to load the page disables the coach rather than running without it.
- **No bridge transport yet.** Section 3.1 proposed preferring the opener bridge so a user
  launched from AlloFlow would not enter a key twice. That is not built: the module's AI bridge
  validates its sender through a handshake the standalone page does not perform, and widening
  that trust check is not a change to make casually. The page is local-transport only for now,
  which is a smaller and more honest v1.

Tests: `tests/it_coach.test.js` (9) plus the coach cases in `tests/video_studio.test.js` (209
green, including the ambiguous-reply and educator-unrestricted paths).

## 8. Still open

- **P0 live smoke.** Unchanged and still owed, section 6. Nobody has watched any of this run.
- **P4 discoverability.** Nothing links to the page yet; it is reachable by URL only. Where it
  belongs (Educator Hub card, a student surface, or a teacher-issued link) is open question 3
  below, and wiring it touches ANTI, so it wants a deliberate pass rather than a drive-by.
- **Desktop mirror.** Not mirrored into `desktop/web-app/public`, because nothing links to it
  yet and an unreachable page is dead weight in the bundle. Do it with P4.
- **i18n.** The page is English-only, like the popup.

## 9. Open questions

1. ~~Audience?~~ **Answered:** both, posture-switched. Built.
2. ~~Local backend from day one?~~ **Answered by the build:** yes, and the picker lists local
   options first. A cloud key still works and still warns that it sits unencrypted in the browser.
3. Does `open_screen_coach` **move** to the new page, or do both surfaces stay? Still open, and
   it blocks P4.
4. Does the standalone page keep the AlloBot identity per section 5, or present as its own thing?
   Currently it is titled "AlloBot Screen Coach", following section 13.1. Say if that is wrong.
5. New, raised by the learner decision: **posture on the standalone page is a contract, not an
   access control.** Learner is the default and only the URL can widen it, so a student cannot
   click their way out, but anyone who edits the address bar can. Making it real needs the
   app-launched flow where roles are known. Is the URL contract enough for a pilot?
