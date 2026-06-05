## Where polls live now — and whether to build a polls-as-resource library

**TL;DR.** Do not build a polls library. Build a small discoverability + pre-stage compose fix (the `fix-discoverability-only` proposal, with three baked-in safety conditions). Before writing any code, decide one thing: **do you want polling to be its own primitive, or is it a special case of Live Quiz?** The completeness critic surfaced a Live Quiz overlap that none of the three proposals or twelve judge verdicts engaged with, and it is load-bearing for this decision.

---

### 1. Where polls live now (lifecycle-cited)

A poll's entire lifecycle in the current implementation is volatile and tied to one React component instance (`HostPanel`). Nothing teacher-authored survives the dialog.

**Compose.** Four sibling `useState` hooks in HostPanel hold the composer buffer: `pollType`, `pollPrompt`, `pollOptions`, `composerRules` (`live_polling_module.js:439-443`). `groups` and `newGroupName` are adjacent (`:444-445`). The composer buffer is fully decoupled from any "poll" object until broadcast — there is no draft persistence, no autosave, no localStorage key. Closing the modal mid-compose loses the prompt immediately.

**Broadcast.** `broadcast()` synthesizes a fresh poll literal `{id:'poll-'+Date.now(), type, prompt, options, routingRules}` (`live_polling_module.js:559-567`) and hands it to `PollingHost.broadcastPoll`, which (a) stashes it on `this.activePoll` (`:216`) so late-joining peers get it on `dc.onopen` (`:172-174`), (b) `dc.send`s it to every connected peer over RTCDataChannel (`:217-222`), and (c) is mirrored into HostPanel's `activePoll` React state plus `activePollRef` for closure access (`:442, 452-455, 569`). Nothing is written to Firestore.

**Response.** Student responses arrive over RTCDataChannel and accumulate in HostPanel's `responses` keyed by pollId (`:438, 494-500`). Routing decisions live in a separate `routingByPoll` keyed `{pollId:{uid:groupId}}` (`:449, 484-488`).

**Routing.** The ONLY Firestore writes from a response are two derived Tier-1 fields: `roster.<uid>.groupId` when a routing rule fires (`:477-483`), and `groups.<id>.name` when a teacher adds a group (`:547-551`). Raw response payloads never touch Firestore.

**Session-end.** `closePoll()` nulls `this.activePoll` and the React `activePoll`, but does NOT clear `responses[pollId]` or `routingByPoll[pollId]` from React state (`:225-235, 573-577`). `host.stop()` closes peer connections and the React state vanishes via component unmount (`:249-258, 508-511`).

**Between sessions.** Grep of `live_polling_module.js` for `localStorage|sessionStorage|indexedDB|cookie` returns ZERO matches outside Firestore signaling plumbing. Signaling docs at `artifacts/<appId>/public/data/signaling/<sessionCode>/peers/<uid>` are auto-deleted ~750ms after RTC `connected` (`:189, 327`) or on leave (`:243, 396`). The session doc itself is deleted on tab close (`AlloFlowANTI.txt:6716-6730`). The fallback path (`:409-424`) is a user-initiated file download on the student device — not app storage.

The header comment (`:1-12`) states the design intent: "Application data... flows browser-to-browser over RTCDataChannel and never persists on any server." The implementation holds that promise strictly.

**Sibling check.** Concept Pictionary (`concept_pictionary_module.js`) refuses to persist its own non-PII round log even though it could (`:832, 1113` — UI literally says "Session-only. Closes with this dialog; nothing persists."). View Session Modal is a 119-line stateless renderer (`view_session_modal_module.js:1-119`). The WebRTC sibling family holds an unusually disciplined posture: no teacher-authored content survives the dialog, even when it's safe.

---

### 2. The discoverability finding (the real problem the user is sensing)

The teacher-workflow trace is unambiguous: **a brand-new teacher cannot discover Live Polling exists from cold-open.**

- LaunchPad (`AlloFlowANTI.txt:26401-26408, 26415-26436`) offers four modes (full / guided / learning_tools / educator) — none mention polling.
- OnboardingCoach has zero references to polling (grep confirmed).
- The FAB at `position:fixed; bottom:1rem; right:1rem; zIndex:9999` (`AlloFlowANTI.txt:25755-25763`) is the ONLY entry point. It is gated `isTeacherMode && activeSessionCode` — invisible until the teacher has (a) generated content (history.length > 0 hard-reject at `phase_o_misc_handlers_module.js:10-13`), (b) navigated to QuizView and clicked Start Live Session (`AlloFlowANTI.txt:24945, 15834-15966`).
- Even after the FAB appears and the teacher opens HostPanel, the Broadcast button is disabled until `pollPrompt.trim() && guests.length > 0` (`live_polling_module.js:689`) with no inline explanation — a teacher cannot draft while waiting for students.

The "polls as a resource" felt-need is almost certainly a workaround for this triple cliff: no LaunchPad presence, no compose-before-session, no compose-before-first-student. If the cliff is removed, the need for a library may dissolve.

---

### 3. The three proposals

**Proposal A — Build the polls library (`build-it-resource-library`).** Curated 12-poll starter constant + `alloflow_poll_templates` user layer + JSON export/import + window-mirror for Canvas survival + new PollsLibraryPanel mountable before session start + golden-master tests. ~14 hours, ~650 LOC. Judges averaged 6.13. ONE `DO_NOT_BUILD` (the cost lens), three `CONDITIONAL_BUILD` with substantial required fixes: write the 12 polls and have Aaron defend each before building infrastructure; drop routing rules from templates entirely; reframe away from invented "Engagement/Representation/Action-Expression check" categories that mis-use UDL; ship the V0.5 alternative the proposal itself names; do the overlap analysis with Research Hub framings and SEL Hub savedStations.

**Proposal B — Don't build it, fix the entry path (`dont-build-it-against`).** Three small fixes: LaunchPad/OnboardingCoach surfacing, ungate Broadcast with inline explanation, paste-from-clipboard button. ~35 LOC, ~3 hours. Judges averaged 8.88, all four `STRONG_BUILD`. Required fixes: the "staged poll" race needs a real design decision (the simplest honest version is "auto-broadcast on first guest connect," which is different from "draft and stage"); clipboard API must degrade gracefully in Canvas iframes; LaunchPad tile must walk the prereq chain, not bounce off existing toasts.

**Proposal C — Quick Poll doorway, no persistence (`fix-discoverability-only`).** Educator Hub tile + OnboardingCoach mention + relax HostPanel mount gate to `isTeacherMode` (compose-only mode possible) while keeping FAB gate unchanged + inline helper string replacing the grey-disabled Broadcast button. ~45 LOC, ~3 hours. Judges averaged 9.00, all four `STRONG_BUILD`. Required fixes: gate `PollingHost` instantiation on `sessionCode` (compose-only must not start the WebRTC layer); split the FAB and HostPanel JSX conditions explicitly with a comment so a future contributor doesn't re-unify them and silently regress the FAB; the compose-only empty state must show the `history.length > 0` precondition up front, not as a post-click toast; render-crash gate must pass after the mount-gate change.

---

### 4. The recommendation: ship Proposal C with three conditions, do not build the library

**Pick `fix-discoverability-only` as the spine.** It scored highest across all four judge lenses (FERPA coherence, pedagogical value, cost/payoff, feature-bloat overlap), preserves the FERPA-by-design posture that the entire WebRTC sibling family deliberately holds, costs ~3 hours, and directly addresses the diagnosed injury (cold-open discoverability + the compose-before-session cliff). It is materially better than Proposal B because Proposal B's "draft a prompt while waiting for guests" only works AFTER a session is running — Proposal C lets a teacher compose Sunday night, which is the actual prep use case the polls library was trying to serve.

**Graft from Proposal B:** the inline helper-string fix on the Broadcast button (`live_polling_module.js:689`). Replacing "disabled grey button" with "Share session code XXXX with students — broadcast unlocks when 1+ student joins" is ~5 LOC and removes the third cliff. This is the one piece of B that C doesn't already include.

**Do NOT graft from Proposal A.** No curated starter set, no user-authored localStorage layer, no export/import, no window-mirror. Every judge lens that gave A a passing `CONDITIONAL_BUILD` required either dropping routing rules from templates, deferring the user-authored layer until pilot signal, or pre-vetting 12 starter polls that no one has written. The cost lens scored A a `DO_NOT_BUILD` for a 2-teacher pilot.

**The three baked-in conditions on Proposal C (from judge required-fixes):**

1. **Split the gates explicitly.** FAB keeps `isTeacherMode && activeSessionCode`. HostPanel relaxes to `isTeacherMode` alone. The two render sites must carry a code comment marking this divergence as intentional, or a future cleanup will silently re-unify them and regress the FAB.
2. **Gate `PollingHost` instantiation on `sessionCode`, not on `isOpen`.** The compose-only mount must mount React composer state ONLY. The WebRTC layer, signaling doc writes, and `this.activePoll = poll` path (`live_polling_module.js:172-174, 216`) must remain gated on a truthy `sessionCode`. Otherwise a stale composer prompt could broadcast to a fresh session's first guest. Concrete: add `sessionCode &&` guard to the useEffect at `live_polling_module.js:457-512`.
3. **Surface the `history.length > 0` precondition in the empty state, not after click.** A brand-new teacher who clicks the Hub tile from an empty workspace must see "Add a resource first — polls launch from a live session" inline, not after typing a prompt and hitting a `session.error_no_resources` toast.

**Plus the pedagogical re-copy Aaron's lens added:** the tile copy leads with formative purpose, not architecture. "Quick formative check during a lesson. Anonymous responses, peer-to-peer, nothing stored" — not "FERPA-by-design — nothing stored" (Aaron's exact judge note: "formative" is load-bearing for Lisa).

---

### 5. What Aaron should decide BEFORE any code is written

**Is polling its own primitive, or is it a special case of Live Quiz?**

This is the single highest-leverage decision and it was missed across all twelve judge verdicts. The completeness critic surfaced it as the largest hole in the analysis.

Live Quiz already supports persistent teacher-authored questions with routingRules (`AlloFlowANTI.txt:11425-11500`), already calls `window.AlloModules.LivePolling.evaluateRoutingRules` (the routing logic is shared at `live_polling_module.js:817`), already writes `roster.<uid>.hiddenResourceIds` (a capability polls don't have), already lives on `generatedContent.data.questions[idx].routingRules` which IS persistent via the lesson resource, and already has a window-mirrored editor store (`window.__alloQuizRoutingRules`). A "poll template" is functionally a strict subset of an authored quiz question.

If polls and Live Quiz are the same primitive, the right move is to teach teachers that a 1-question quiz IS a poll, and the discoverability fix becomes "surface polling AS a quiz mode in the Hub tile" rather than "polling as separate doorway." If they're meaningfully different — perhaps polling's brevity, anonymity model, or fire-and-forget rhythm are pedagogically distinct from quizzing — then Proposal C ships as-described and the polls library question is permanently parked.

You should be able to answer this in 30 minutes by writing a 1-page comparison table (rows: persistent storage / routingRules / hiddenResourceIds / broadcast / share / tied-to-lesson; columns: Live Quiz today, Polls today, Polls+library hypothetical). If Live Quiz covers 80%, build NOTHING and write a 1-paragraph "use a 1-question quiz" pattern note in the educator docs instead.

---

### 6. Concrete next steps (in order)

1. **Today / this week: answer the Live Quiz overlap question.** Write the 1-page comparison table. If Live Quiz subsumes polls, stop here — document the pattern and close the question. If not, continue.
2. **Talk to Lisa Hatch (20 minutes).** The completeness critic flagged this as the single largest stakeholder gap: all 12 judges spoke FOR her without consulting her. Ask: How do you prep poll prompts today? Do you keep them in a doc? Would you want to load them in AlloFlow, or is on-your-feet polling the point? Would you draft Sunday night, or only during class? Her answer determines whether even Proposal C's compose-only mode is the right shape.
3. **Implement Proposal C with the three baked-in conditions** (split gates, gate `PollingHost` on `sessionCode`, surface `history.length > 0` in empty state) + the inline Broadcast helper graft from Proposal B. ~50 LOC, ~3 hours.
4. **Add a pilot instrumentation plan.** Count 5 events: Hub tile clicks, sessions started, polls broadcast, polls composed-but-not-broadcast, sessions ended with zero polls. Without measurement, the August-December pilot teaches nothing. This is ~20 LOC against whatever existing teacher-event telemetry path is FERPA-clean (audit before adding).
5. **Set a pilot decision criterion in writing.** "If Aaron or Lisa hand-types the same poll prompt 3+ times in a week of pilot use, revisit a persistence layer (start with localStorage-only recents-list, `bl_opdef_saved` pattern at `behavior_lens_module.js:14844`, capped at 20)." Otherwise the persistence layer never ships. Lumen-style "refuse, don't warn" discipline applied to feature decisions.
6. **Before merge:** run the render-crash gate (`dev-tools/check_render_refs.cjs` + `check_lang_json.cjs`); confirm any new ui_strings keys are added to all 49 lang packs (lest the check_lang_json gate fails per the Phase T–AA work); confirm you're not pushing concurrent-session unpushed commits (per the concurrent-sessions-shared-tree feedback). The lang-pack cost was not scoped in any proposal.
7. **Update the module header comment at `live_polling_module.js:1-12`** to explicitly enumerate the new pre-session compose state: "HostPanel composer state may exist before sessionCode is set (compose-only mode). PollingHost / WebRTC / Firestore signaling never start without sessionCode." This becomes the spec for future contributors.

---

### 7. Open questions for Aaron the analysis could not resolve

These need your judgment before #1 of next steps.

- Is polling pedagogically distinct from a 1-question quiz, or is "Live Polling" really a misnomer for "low-ceremony quiz mode"? This is the Live Quiz overlap question.
- Has Lisa Hatch indicated she keeps poll prompts somewhere today (Google Doc, lesson plan, slide deck)? If yes, the right answer is paste-from-clipboard plus the discoverability fix, never a library. If no, the felt-need was probably code-reading speculation.
- Did the polls-as-resource question come from a felt teacher need (someone said something) or from your own code-reading hypothesis? The completeness critic flagged that nobody asked.
- What's the AlloFlow scientific-integrity bar for curated poll content if you ever build the library — peer review by whom, refresh cadence, sourcing requirements? The Lumen NORM_SPINE "ship empty and refuse" precedent suggests "don't ship curated content without a review process you'd defend in a PLC."
- Should the Hub tile appear in `learning_tools` mode at all, or teacher-mode paths only (`full` / `guided` / `educator`)? The proposals diverged on this.

---

### Confidence flag (completeness critic)

**The completeness critic rated overall confidence LOW and identified Live Quiz overlap as the largest unexamined gap.** I am explicit: this memo's recommendation (ship Proposal C, do not build the library) is robust against most of the open questions, but it is NOT robust against "polls and Live Quiz are the same primitive." If they are, even Proposal C is partly wasted effort because the right shape is a Hub tile that opens a 1-question quiz, not a HostPanel mount-gate change. **Spend 30 minutes on the comparison table before any keys are pressed.** If you can't answer that question quickly, talk to Lisa first and let her workflow tell you.