# AlloFlow Async-B + Poll Subtype + Routing-Rule Bug — Honest Memo for Aaron

## Bottom line up front

All three of your direct questions resolve cleanly, and the honest answer to each is shorter than the surrounding noise has suggested.

1. **Is Async-B doable?** Yes, LOCAL-ONLY, with documented limits. The predicate engine is already a pure function in disguise. The persistence layer precedents exist. The FERPA carve-out is structurally clean. The cost is real but bounded.
2. **Does the quiz-subtype path you proposed exist?** Yes — `quizMode` is a real resource-level discriminator with exactly 4 strategies today, defined in `quiz_mode_strategies.js`, consumed by one composer and one student view. Adding `poll` is the right shape, with one honest gotcha: polls need a new item type because every existing item assumes a `correctAnswer` key.
3. **Is the routing-rule persistence bug real?** Yes, confirmed on disk, no runtime check needed for the persistence gap itself. The CDN module IS readable; the bug is in source, not a build slip. There is a separate runtime check I do recommend (Firebase SDK offline persistence) for a different reason.

## Question 1 — Async-B feasibility

The forensic trace identifies 8 gates between you and a local-only Async-B; only 5 actually need code changes. Gates 7 (`saveHistory`) and 8 (`mode==='async'` enforcement) already fail-pass for the no-session case. Gate 6 (StudentQuizOverlay mount) needs a synthetic `sessionData` shim — which is the largest single risk in the plan because the overlay is a CDN module that destructures `sessionData.quizState.*` and any unshimmed leaf crashes silently.

The five real gate lifts are mechanical:
- Lift `_matchPred` / `_findMatchedThen` to module scope as `matchRoutingRule(rules, response)`. Zero closure references to teacher/session/firestore inside the matcher bodies — this is a trivial cut/paste, not a refactor.
- OR-merge a localStorage hide source into `getFilteredHistory` inside the existing try/catch fail-open block.
- Add `handleSubmitLocalPoll` as a sibling to `handleSubmitLiveAnswer` (NOT a modification of the existing function — that path correctly hard-returns without a session).
- Branch the StudentQuizOverlay mount predicate on `quizMode==='poll'` with a synthetic sessionData shim.
- Branch the auto-router useEffect at AlloFlowANTI.txt:11437 — keep the teacher/session path identical, add a parallel branch when `(!activeSessionCode && currentItem?.subtype === 'poll')`.

**The honest blockers are not in the Async-B path itself; they are upstream and lateral.**

Upstream: the routing-rule persistence bug (Question 3) means rules currently live only in `window.__alloQuizRoutingRules` and never reach the student. Until that's fixed, no rules can be routed against in async mode. Phase A in the plan is therefore a hard prerequisite for Phase D.

Lateral: three pre-existing student-side Firestore writers fire on triggers that Async-B will be embedded in. The main sketch initially dismissed this with "Async-B has activeSessionCode===null by definition" — but the adversarial review correctly noted this only holds for pure-async tabs. A student who uses Async-B AND joins a live session in the same tab trips `syncProgressToFirestore` (every 60s), the roster name/xp mirror (on any XP change), and the latent `saveToCloud` leak (Trap #8, gated only on `isCloudSyncEnabled` with no `isTeacherMode` check). The plan promotes the trigger-isolation work from documentation to actual code as Phase F (~70 LOC), and Phase 0 ships the `saveToCloud` fix as a standalone PR independent of Async-B.

The cost-honest total, including Phase 0 prereqs, Phase E pedagogical hardening, Phase F trigger isolation, lang packs, and golden masters, is approximately **1,350 LOC across ~58 hours**, staged into 9 independently-mergeable phases. The 38-hour figure in the main sketch was the unhardened path; the adversarial review's "~3x hours" framing is closer to reality once concurrent-session merge cost and the trigger-isolation work are honestly accounted.

## Question 2 — Does the `quizMode` subtype path exist?

Yes, and it's exactly the shape you described. The forensic confirmation is unambiguous:
- 4 strategies live in `quiz_mode_strategies.js` at lines 30-125: `exit-ticket` (default), `pre-check`, `formative`, `review`.
- The discriminator is a single string on the resource at `content.mode`, stamped at `generate_dispatcher_module.js:2119-2131` and re-read at `view_quiz_module.js:771` and `:2548`.
- One composer (QuizPanel sidebar at `view_sidebar_panels_module.js:1696-1711`), one student view (view_quiz_module).
- Per-mode prompt framing, item-type mixes, intro banners, completion copy, aggregation hints.

Adding `poll` as a 5th subtype is a strategy-table entry plus ~5 branch points across the dispatcher, composer, and student view. **The non-obvious gotcha is the per-item shape**: every existing `STRUCTURED_ITEM_TYPES` entry (mcq/tf/match/sequence/numeric/order/fill-blank/short-answer/self-explanation/sequence-sense/relation-mismatch) assumes a `correctAnswer` key. Polls have no correct answer. So adding poll honestly implies adding a new item type (`likert`, `opinion-mcq`) AND a sibling render branch in view_quiz_module that doesn't grade — call it ~240 LOC in Phase B, dominated by the score-suppression sweep across 5-8 distinct render sites.

This is not a strategy-table tweak. It's the strategy-table tweak PLUS a new item-type render path. Mis-scoping this is the most likely source of "shipped a poll but it shows 0/5 incorrect" regressions, which is why Phase B explicitly grep-audits `/correctAnswer|isCorrect|score/` in view_quiz_module before claiming completion.

## Question 3 — Is the routing-rule persistence bug real?

**Yes, confirmed real on disk, no runtime check needed.** The forensic evidence is direct:
- `teacher_module.js:1114` — TeacherLiveQuizControls' destructured props contain NO callbacks for saving (no `onSave`, `onUpdateQuestion`, `onUpdateRoutingRules`).
- `teacher_module.js:1121-1125` — routing-rule state is a local React useState that writes only to local memory and to `window.__alloQuizRoutingRules`.
- `teacher_module.js:1129-1177` — all four mutators (`addQuizRoutingRule`, `removeQuizRoutingRule`, `updateQuizRoutingRule`, `toggleQuizRoutingRuleHiddenId`) call only `setQuizRoutingRulesByQ`. Repo-wide grep for `setGeneratedContent`/`onSave`/`onUpdateQuestion`/`persistLesson`/`saveResource` inside teacher_module.js returned zero matches.
- `teacher_module.js:1261-1411` — the Firestore writes (handleStartQuestion, handleRevealResults, etc.) touch quizState fields but never `routingRules`.
- `AlloFlowANTI.txt:11441-11446` — the runtime consumer explicitly treats `question.routingRules` and the window mirror as TWO DIFFERENT sources via `questionRules || (Array.isArray(winRules[qIdx]) ? winRules[qIdx] : [])`. That's proof they are never reconciled.
- `teacher_source.jsx:1418` — the same pattern in the source, so this is not a build-artifact mismatch. The bug is in the source-of-truth.

**The CDN module concern is unfounded.** teacher_module.js IS on disk and readable; the forensic team read 1,114-1,177 line-by-line. The CDN load mechanism is for delivery, not for storage opacity. No runtime check is required to verify the persistence gap.

**However, there is a separate runtime check I do recommend, for a different reason.** The plan's FERPA story rests on the invariant that "no localStorage→Firestore bridge exists" (Firestore-trap forensic). The grep for `offlineQueue`/`pendingWrites`/`flushQueue`/`syncOnReconnect` came back clean at the app layer. But Firebase SDK has its own per-tab IndexedDB-backed offline cache (`enableIndexedDbPersistence` / `enableMultiTabIndexedDbPersistence`). If AlloFlow has enabled this anywhere, Firestore writes made while offline are queued LOCALLY and flushed on reconnect — which is an SDK-level exception to the "no bridge" invariant. **This is the runtime/config check worth doing before merge.** It's a five-minute grep of the firebase init code.

**There is also a second, subtler bug compounding the first.** The editor never reads `question.routingRules` into state on mount, so a teacher viewing a question that DOES have pre-authored rules sees an empty rules panel. The runtime consumer prefers `question.routingRules` over the window mirror, so once rules are authored, the inline editor's edits are SILENTLY IGNORED at routing time — even though they still appear in the panel UI. Phase A2 (seed local state from question.routingRules on mount/question-change) fixes both bugs in one effect.

## What changes vs. the main sketch

Five places where I'm explicitly walking back the main sketch:

1. **D8 trigger-isolation goes from doc-only to code (Phase F).** The activeSessionCode gate is insufficient for mixed-mode (Async-B + live session in same tab). Without explicit `isAsyncBContext` short-circuits at AlloFlowANTI.txt:11198-11206 and 9090-9104, Failure F is a real PII escape pathway via studentNickname + flagSummary in `studentProgress`.

2. **D2 stores poll answers in a SEPARATE IDB key, NOT in `studentResponses`.** The main sketch listed this as a Mitigation in failure_modes; it must be the default. If poll answers land in `studentResponses`, the next time the student joins a session, `syncProgressToFirestore`'s flagSummary path serializes a derived view of them upward.

3. **D9 `saveToCloud` fix ships in Phase 0 as a standalone PR.** This is Trap #8 — a pre-existing latent leak independent of Async-B. The main sketch lists it as defense-in-depth at the end; honest sequencing puts it first because any poll-answer-bearing code that lands in `history` before this fix is exfiltrating to `artifacts/{appId}/users/{user.uid}/data/teacherHistory` for any student with cloud sync toggled on.

4. **E1's anti-single-tick guardrail is structurally insufficient.** The main sketch's "delay routing until poll-complete" still IS single-item routing, just delayed. Phase E hardens to authoring-time block: routing rules targeting likert items require >=2 likert items AND >=2 distinct questionIdx references via an aggregation primitive. If aggregation is out of scope for V1, the block is "refuse to save single-Likert-routing rules" with an explicit measurement-reliability error. This aligns with your CBM-style relabel discipline — the rule grammar IS the measurement claim.

5. **Free-text drafts get schema-tagged `tier:2, neverExport:true`** plus a defensive unit test (`tests/no_tier2_export.test.js`) that grep-asserts no Firestore-writing module references the draft key prefixes. The local draft store crosses into Tier-2 territory the moment open-response polls land; the only defense today is convention. A defensive test makes it structural.

## The honest pedagogical concern

Single-Likert-tick routing is the integrity violation hiding under the implementation work. The forensic correctly flagged it in spirit, the main sketch added E1 as a guardrail, but E1 only delays the firing to end-of-poll — it doesn't address the underlying claim. The existing 7 predicate ops (`eq`, `in`, `gte`, `gt`, `lte`, `lt`, `between`) match against a SINGLE question's response. There is NO aggregation primitive. A teacher can author a 5-item poll with a rule that fires on Q3.likert.value===1 and hides 4 resources, with no requirement that Q3 be corroborated by Q1, Q2, Q4, or Q5. The rule language structurally encourages single-tick routing because that's all it can express.

This is a question I want to put to you directly before recommending the full implementation: **is the aggregation primitive in scope for V1?** Without it, the choices are:
- Ship Phase A (bug fix) only; defer poll subtype until aggregation lands.
- Ship Phase A + poll subtype + Phase E authoring-time block (single-Likert routing refused at save with a measurement-reliability error), and accept that polls in V1 are voice-only with no routing.
- Ship aggregation as Phase B-prime (a new vocabulary entry) and accept the additional ~150 LOC + golden masters.

My honest recommendation is option 2 for V1 (ship poll-as-voice without routing) and option 3 (add aggregation) as a V1.1, because option 1 leaves the bug fix orphaned from any use case and the routing-rule editor never gets tested in production.

## Reversibility map

- Phase 0: FULLY_REVERSIBLE (single-line `isTeacherMode` gate addition; golden masters are additive).
- Phase A: FULLY_REVERSIBLE (callback prop is optional; old window-mirror path remains as fallback for one release).
- Phase B: MOSTLY_REVERSIBLE (new strategy entry + new item types are additive; the score-suppression branching in view_quiz_module is a coverage-risk for regressions but each touch is locally revertable).
- Phase C: FULLY_REVERSIBLE (composer chrome is gated on `quizMode==='poll'`).
- Phase D: PARTIAL (the matchRoutingRule lift is reversible by inlining; the localStorage schema, once populated, requires a migration to remove; the CDN module asyncBLocal branch requires coordinated revert).
- Phase E: FULLY_REVERSIBLE (guardrails are additive validation).
- Phase F: FULLY_REVERSIBLE (each isAsyncBContext gate is a single-conditional addition).
- Phase G: FULLY_REVERSIBLE (lang strings + a help-key entries are additive).
- Phase H: FULLY_REVERSIBLE (window flag flip).

## Concurrent-session and source-of-truth discipline

Per `feedback_concurrent_sessions_shared_tree`: this plan touches AlloFlowANTI.txt in 12+ distinct line ranges, plus teacher_module.js / teacher_source.jsx (build-coupled), plus view_quiz_module.js, view_sidebar_panels_module.js, generate_dispatcher_module.js, and 49 lang packs. Maximum conflict surface. Run `git status && git log -5 && git remote -v` before each phase commit. Stage own files explicitly by path; do not push others' unpushed commits.

Per `project_alloflow_source_of_truth`: AlloFlowANTI.txt is canonical for App.jsx-equivalent code. teacher_module.js is reverse-compiled from teacher_source.jsx — Phase A edits go to teacher_source.jsx FIRST. The StudentQuizOverlay source path is NOT named in the forensic and must be identified before Phase D ships (otherwise the next reverse-compile reverts the asyncBLocal branch).

## What I'd ship first if you only have a week

Phase 0 + Phase A. That gets you:
- `saveToCloud` Trap #8 closed (latent pre-existing leak fixed).
- Routing-rule persistence bug fixed (the second, subtler "pre-authored rules are invisible" bug is fixed simultaneously by the seeding effect).
- Question reordering no longer breaks rules (re-keyed by question.id).
- Stable rule.id + rule.version stamping (foundation for any future stale-hide pruning).
- Golden-master suite pinning current matchRoutingRule behavior (foundation for any future lift).

This is roughly 330 LOC and ~11 hours. It ships independently of Async-B and independently of poll subtype. It also gives you a clean ground state from which to decide whether poll-as-voice (Phases B+C without D) is worth shipping, or whether to push directly to local-only Async-B with the full 9-phase plan.

The honest contrarian framing: you don't have to commit to Async-B to derive value from this analysis. Phase 0 + Phase A is worth shipping on its own merits, and the decision about whether to proceed to poll subtype + Async-B can be made after the rule-persistence editor is observably working on a real classroom.