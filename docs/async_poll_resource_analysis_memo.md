## Memo: AsyncPollResource decision — does Live Quiz cover it?

### 1. Reframe acknowledgment

Aaron, your second-loop reframe was correct and the forensic confirms it. The actual asks are:

1. **Async polls as a resource-pack item** — packable, stand-alone-accessible, lives in `history`
2. **Likert support** — not just MCQ
3. **Answer-to-resource routing** — student picks option B, certain resources hide/show

The first-loop framing (treat this as a new primitive) was anchored to "polls" as a noun. The codebase reveals "polls" is already a contested name: there's a WebRTC `live_polling_module.js` (ephemeral, peer-to-peer, no persistence, no routing) AND a Firestore-backed Quiz path that already does most of what you're asking for. Naming the new thing "AsyncPollResource" would collide with the WebRTC surface and create a third partially-overlapping rating-input affordance in AlloFlow (alongside Quiz exit tickets, SEL Hub mood checks, reflection fields, and LivePolling itself). That's the *opposite* of the depth-over-breadth discipline.

### 2. Live Quiz coverage with file:line citations

**What Live Quiz already does:**

- **Persistent, packable resource:** Quiz lives as a `history` item of `type: 'quiz'`, serialized to `allo_offline_history` IndexedDB on every change (`AlloFlowANTI.txt:9252-9261`), unit-scoped via `item.unitId` (`9237`, `21401`). When a session goes live, `history.filter(h => h.id)` auto-syncs to `sessions/{code}.resources` debounced 1.5s (`AlloFlowANTI.txt:15981-15996`); student onSnapshot replaces local history wholesale (`8838-8866`). The "pack" is implicit — there is no pack object.
- **Answer-to-resource routing pipeline:** Teacher-authored `question.routingRules[]` with `{when: {op, value}, then: {groupId?, hiddenResourceIds?[]}}`. Auto-router useEffect at `AlloFlowANTI.txt:11436-11519` watches `sessionData.quizState.responses` AND `quizState.allResponses[uid][qIdx]`, converts MCQ option-index to option-text, matches via predicate vocab `eq/neq/gte/gt/lte/lt/between/in` (`11460-11471`), writes `roster.{uid}.hiddenResourceIds` and `roster.{uid}.groupId` via `writeToSession` (`11486-11489`). Student-side filter at `getFilteredHistory` (`21413-21418`) reads its own roster row, builds a Set, and hides matching item IDs. Fail-open semantics.
- **FERPA Tier-1 wire format:** `vote`, `rating`, `choice`, `questionIdx`, `itemType`, `hiddenResourceIds` are all already on the Tier-1 allowlist (`AlloFlowANTI.txt:2303-2306, 2322-2327`). `writeToSession` (`2329-2346`) enforces client-side. **Zero new privacy review needed for a Likert-as-quiz extension.**
- **Async mode infrastructure:** `sessionData.mode === 'async'` skips `currentResourceId` enforcement (`AlloFlowANTI.txt:8988`); `toggleSessionMode` at `15968-15980` toggles between `'sync'` and `'async'` literals only.
- **Student answering UI:** `StudentQuizOverlay` mounts when `!isTeacherMode && activeSessionCode && sessionData` (`AlloFlowANTI.txt:23496`); requires CDN module (`2118-2122`).

**Three structural gaps:**

**Gap A — Routing rules don't persist (LATENT BUG, biting Aaron today):**
The inline routing-rule editor at `teacher_source.jsx:1411-1419, 1459-1474` writes to React useState + `window.__alloQuizRoutingRules` only. There is **no code path** that writes back to `generatedContent.data.questions[qIdx].routingRules`. The reader at `AlloFlowANTI.txt:11445` prefers `question.routingRules` over the window mirror — meaning the round-trip was DESIGNED to persist but the writer half was never wired up. Effect: rules vanish on teacher tab reload and don't travel with the lesson resource. This is biting Aaron's solo clinical authoring TODAY; the failure mode is silent (no error, resources just stop being hidden).

**Gap B — No Likert authoring UI:**
`handleQuizChange` (`AlloFlowANTI.txt:18586`) and `handleQuizBulkOptionChange` (`18627`) edit only `question/options[]/correctAnswer`. No Likert/scale/rating branch. However: `STRUCTURED_ITEM_TYPES` (`15654`) already accepts a broader enum and the Tier-1 allowlist permits `'rating'`. The wire format is ready; the authoring UI is the gap.

**Gap C — Teacher-tab gate on the rule evaluator:**
The auto-router useEffect early-returns at `AlloFlowANTI.txt:11437`: `if (!isTeacherMode || !activeSessionCode || !sessionData?.quizState) return;`. If the teacher tab is closed, no rules ever fire even if students answer. This is the "async without teacher" blocker. **Lifting this gate is NOT a small change** — it would let student tabs write `roster.{uid}.hiddenResourceIds`, which violates the Tier-1 trust model that today assumes only teacher tabs mutate other students' visibility. A malicious client could grief peers. Real fix requires Cloud Functions or first-time Firestore Security Rules buildout in this surface.

### 3. The three shapes analyzed

**Shape 1: DOCUMENT_LIVE_QUIZ_PATTERN_NO_CODE** (avg 8.00, all three judges said DO_NOT_BUILD or BUILD_DIFFERENT_SHAPE)
The proposal honestly returned the negative result with line-cited receipts. Docs-only is non-viable because two of three asks (Likert authoring, async-without-teacher) are structurally absent, not under-documented. Worse: shipping a doc that says "use Live Quiz as polls" would silently misrepresent capability to Lisa, who would discover in the classroom that her routing rules evaporated when she closed her laptop between periods. Credibility bomb. The right move from this proposal is its *recommendation* — point at Shape 2 or 3 — not its assigned deliverable.

**Shape 2: EXTEND_LIVE_QUIZ_SMALL** (avg 7.17, all three judges CONDITIONAL_BUILD or BUILD_DIFFERENT_SHAPE)
Four pieces of unequal weight: (1) Likert as itemType in handleQuizChange, (2) persist `question.routingRules` round-trip writer, (3) lift the teacher-tab gate, (4) loosen StudentQuizOverlay mount gate to honor `mode === 'async'`. Piece 2 is a real shippable bug fix today (~4 hours). Piece 3 is the load-bearing concern: the proposal scopes it at ~80 LOC but the FERPA model violation is structural — not 80 LOC. The judges converged on a sharper carve-out than the proposal's stated v1 scope.

**Shape 3: NEW_ASYNC_POLL_RESOURCE** (avg 8.50 — but the proposal argued AGAINST its own assigned lens)
The highest-scoring proposal explicitly says: don't add the new type. A new `type: 'poll'` discriminator would carry permanent maintenance tax (every type-aware switch, TEACHER_ONLY_TYPES audit, export/import paths, lang pack keys, render-crash gate sweeps), collide with the existing LivePolling module name, and force duplicate authoring UI / response writer / auto-router for capability that Quiz already provides. The expected-value asymmetry is brutal: new-type wins only if (pilot happens AND students use it AND UX gap is load-bearing); Quiz-extension wins if ANY of (pilot happens OR Aaron uses Likert solo OR persistence gap matters).

### 4. Recommendation: EXTEND_LIVE_QUIZ_SMALL, Phase 1A only

Ship two surgical changes:

**1A.1 — Persist routing rules round-trip (~120 LOC, ~4 hours):**
Add a write path in `teacher_source.jsx` near line 1459-1474 (`toggleQuizRoutingRuleHiddenId`) that mirrors the React-state rule change back onto `generatedContent.data.questions[qIdx].routingRules` using the same `setGeneratedContent + setHistory` pattern as `handleQuizChange` (`AlloFlowANTI.txt:18619-18620`). This closes the half-wired round-trip the reader at `11445` already expects. **Independently shippable.** Fixes a present-tense latent bug. No pilot dependency.

**1A.2 — Likert as itemType branch (~80 LOC, ~2 hours):**
Add an `itemType: 'likert'` discriminator in `handleQuizChange`, gate the "correct answer" chrome and score affordance off when `itemType === 'likert'`, and let `handleSubmitLiveAnswer` (`15650`) route the `rating` payload (already Tier-1 allowlisted at `2306`). Authoring UI shows a scale-endpoint label pair and a step count (3/5/7). Non-evaluative header copy via lang-pack key.

**Total Phase 1A: ~200 LOC, ~6 hours. Reversible.**

**Explicitly defer to Phase 1B (pilot-contingent):**
- Lifting the teacher-tab gate (Gap C). Requires Cloud Functions OR a real Firestore Security Rules buildout. **Not v1.**
- Loosening the StudentQuizOverlay mount gate. Safe but only matters once Gap C is solved.
- Likert-driven routing UX disambiguation (when-to-use copy for Lisa).
- Integrity guardrails: minimum-item-count before routing fires, non-diagnostic copy guards.

**Explicitly NOT building:**
- New `type: 'poll'` resource.
- Per-student persistence at `artifacts/users/<uid>` for true overnight async. (Different architecture conversation; out of scope for any "small extension" framing.)

### 5. What changes if no pilot

The pilot-acceptance-pending status sharply changes the calculus on each piece:

- **Phase 1A.1 (rule persistence) is pilot-independent.** It fixes a bug biting Aaron's own clinical authoring. Ship regardless.
- **Phase 1A.2 (Likert authoring) is partially pilot-independent.** Aaron can build Likert resources into packs solo. Marginal solo value but real and reversible. Ship.
- **Phase 1B is pilot-dependent.** Without a real classroom pulling on async-without-teacher, lifting the FERPA model gate is paying architecture debt for an empty room. Wait.
- **The new resource type is anti-pilot.** Permanent maintenance tax for a use case you can't validate solo. Don't ship even if pilot happens — it's the wrong shape.

The "wait for pilot signal" option enum value is wrong here because it conflates the present-tense bug with the future-tense feature. Splitting the authorization respects the depth-over-breadth discipline: do the bug fix now, defer the speculative work.

### 6. Concrete next steps

1. **This week:** Ship Phase 1A.1 (persist `question.routingRules`). Independently valuable. Test by authoring a quiz with routing rules, closing the teacher tab, reopening, confirming rules survive AND travel into the resource-pack auto-sync.
2. **Within 2 weeks:** Ship Phase 1A.2 (Likert itemType). Include the non-evaluative-chrome guardrails. Author one Likert resource into your clinical workflow and dogfood the round-trip.
3. **Wait on conference acceptance for Phase 1B.** Target: early September 2026 (per the proposal's own watch-signal).
4. **If conference accepts:** Sit with Lisa BEFORE writing Phase 1B code. The when-to-use disambiguation between (Live Quiz + Likert routing) / (Live Polling WebRTC) / (SEL Hub mood checks) / (Quiz exit ticket MCQ) is a UX-design problem that needs Lisa's input, not architecture work.
5. **If conference declines or goes silent past October:** Revisit. The Phase 1A work was for you and stands on its own. Phase 1B re-justification waits for a different user signal (a second teacher, an external pull, or a clinical workflow that requires it).

**Verification gates (per your existing discipline):**
- Run `dev-tools/check_render_refs.cjs` and `check_lang_json.cjs` after 1A.1 and 1A.2.
- Add golden-master tests for the persist round-trip (author rule → reload → confirm rule present in `generatedContent`).
- Pin the new behavior in the Live Quiz pattern doc AFTER it ships, not before.

This is the smallest move that respects: the depth-over-breadth bar, the scientific-integrity guardrail on Likert-as-placement, the FERPA-by-design discipline on the Tier-1 trust model, your own present-tense clinical workflow needs, and the pilot uncertainty. It also closes a latent bug you didn't know was biting you.