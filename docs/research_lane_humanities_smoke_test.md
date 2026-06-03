# Tier 4 Humanities lane (Inquiry Studio) — manual smoke test

**Run this in the deployed Gemini Canvas** once `deploy.sh` ships commit `e8f29790` (or successor) to the CDN. Companion to `docs/research_lane_humanities_design.md`.

The most consequential tests are starred ★. If short on time, see the "highest priority" section at the bottom.

## A. Hub still works (regression first)
1. Open Learning Hub Modal → 7th tile → Research Hub opens
2. **DevLevelSelector** defaults to "6–8", **CostMeter** hidden (no AI used)
3. All three lane tiles render: Scientific, Engineering, **Humanities** (📚, rose/pink) — **none should show the "shipping next" placeholder badge**
4. Click Scientific → workspace loads (regression check for Tier 2 against substrate v:4)
5. Back to selector → click Engineering → workspace loads (regression check for Tier 3 against substrate v:4)
6. Back to selector → click Humanities → workspace loads (NOT placeholder)
7. Browser console: should see `[CDN] ResearchLaneHumanities registered (Tier 2)` on first hub open

## B. Frame the Question — contestability + standpoint
8. PositionalityCard renders in edit mode
9. ★ Try "as a student" for positionality → red "boilerplate" error blocks save (POSITIONALITY_DENYLIST)
10. Type "I am a senior with a grandmother in a 1968 yearbook photo who never asked to be online" → saves
11. Type a definitional question "What year was the library built?" → "Probe my question for contestability" AI button is gated (anti-definitional regex)
12. Type "Should our library digitize 1962-1989 yearbooks given alumni redaction requests?" → contestability rationale ≥80c → enable
13. Add only one stakeholder → AI button still gated (need ≥2 distinct)
14. Add a near-duplicate second stakeholder (tokenJaccard >0.6) → AI button still gated
15. Add genuinely distinct second stakeholder → distinctness passes
16. Add only 2 plausible answers → button still gated for 6-8+ (need ≥3)
17. Add 3 plausible answers, mark one as working position → enable
18. Pick a stakes audience chip → enable
19. ★ Click "Probe my question for contestability" → AI returns 3 question-array categories, no causal markers, no question echoes title verbatim

## C. SIFT Triage — the load-bearing stage
20. Add a source with URL `https://nytimes.com/...`
21. Try probing the source via AI → blocked (sift.tier === 'unvetted' not enough; need lateral work first)
22. Open Stop gate, write first reaction <40c → red
23. Write first reaction ≥40c → Stop checkmark
24. ★ Open Investigate gate. Try independent reference `https://nytimes.com/different-article` → red "Same host" error blocks save
25. Try "wikipedia is reliable" as lateral evidence → LATERAL_BOILERPLATE_DENYLIST refuses
26. Type valid independent ref from a different host, write lateral evidence ≥40c, add 2 who-made-it facts where one is missing a year → still blocked
27. Make both facts contain proper-noun AND year → Investigate checkmark
28. Open Find gate. Add a second source from same host as first → that source is NOT clickable as independent coverage (greyed out)
29. Add a third source from a different host → clickable. Toggle on → Find checkmark
30. Open Trace gate. Fill contextualizationNote ≥30c, mark `isOriginal` OR provide originalContextCitation → Trace checkmark
31. All 4 gates green → tier selector becomes available → pick `secondary_corroborated` → tierHistory appends
32. ★ AbsentVoicesLedger renders proportional-growth nudge "Add an absent voice" (floor = ⌈sources/2⌉)
33. Try adding an absent voice with one-word `whoseVoiceText` → red (need ≥4 distinct content words)
34. Add valid absent voice with whyAbsentChip from closed enum → saves
35. ★ Click "Probe this source laterally" on an unvetted source → AI returns questions with NO scholar names (test by inspection), NO quoted text, NO imperative verbs (try/use/should), absent-voice chips suggested are ONLY from the closed enum

## D. Counter-Framings — chip taxonomy lockdown
36. Add framing. Try writing a custom label without picking a chip → save blocked
37. Pick `structural_economic` chip. Write `whatItForegrounds` = "this is about feelings" → red "anchor word missing" (need class/labor/wage/market/etc.)
38. Rewrite with "class" or "labor" → anchor passes
39. ★ Click "Surface a framing chip I have not used" → AI returns chip ids ONLY from FRAMING_TAXONOMY enum (verify in response: no invented chips); NO capitalized multi-word proper noun pairs that aren't on the whitelist (anti-scholar-name guard)
40. Build any single `claimEvidenceLinks` entry in Warrant Lab → return to Stage 3 → AI button now refuses ("warrant chain started" lockout — Engineering timing graft)

## E. Warrant Lab — tokenJaccard live meter + framing probes
41. Author humanitiesPosition ≥60c with multi-word `positionalityLinkText` verbatim from positionality (≥3 content words ≥12c)
42. Try "It is complicated" as position → THESIS_PLATITUDE_DENYLIST refuses
43. Add a claimEvidenceLink. Type warrant as a near-copy of the claim → ★ tokenJaccard meter renders RED (≥0.50)
44. Rewrite warrant with "since" or "because" + distinct content → meter goes GREEN, marker check ✓
45. Try qualifier "in general" → scope marker check ✗
46. Rewrite qualifier with "only when" or "provided that" → ✓
47. Try rebuttal "but free speech" → REBUTTAL_SHAPE_RE check ✗
48. Rewrite with "One might object that... however..." → ✓
49. ★ For each framing, click a probe verdict button (`warrant_survives` / `warrant_contracts` / `warrant_fails`) → prompt asks for studentRationale ≥60c
50. If you mark ALL framings `warrant_survives` → the warrant_questioner sub-trigger C should fire on next AI call (returns `pressure_test_questions_by_framing`)

## F. Positionality Reckoning — ★ NO-AI verification (CRITICAL)
51. ★ Workspace shows the **red banner** "NO-AI STAGE" with educator-pinned message
52. ★ Scan the entire workspace — **there is no AI button anywhere on this stage**
53. ★ Open browser DevTools → React component inspector → check `ctx.ask` on the active stage component → it should be `null` (structural lockout, not just UI)
54. Try `positionality.obscuring` = "nothing" → POSITIONALITY_OBSCURES_DENYLIST refuses
55. Try visibility and obscuring with identical text → "too similar" error (tokenJaccard ≥0.55)
56. Fill all 5 fields ≥100c each, distinct, with ≥2 new content tokens vs prior snapshot → enables Save Snapshot
57. Pick epistemic status from EPISTEMIC_STATUS_OPTIONS → save
58. `positionalitySnapshots[]` gains v:1 entry. Snapshot history strip renders horizontally

## G. Compose — CONTESTATION_RANGE_CHECK + Foreclosure Coda
59. Stage 6 workspace. With `stakesAudience` = "policymakers", try clicking `op_ed` → disabled with title hint "incompatible by CONTESTATION_RANGE_CHECK"
60. ★ Only `policy_memo` is clickable for policymakers audience → pick it
61. Or change audience to "named_public" — all 4 genres become clickable (most permissive cell)
62. ★ ForeclosureCoda panel auto-assembles from `positionalitySnapshot.obscuring` + `absentVoices` + `humanitiesPosition.whatThisClaimDoesNotSpeakTo` — visible immediately, before any composition
63. Write `bodyText` with word count below the per-genre floor (e.g. 100 words for op_ed) → Save Composition blocks with alert
64. Hit the word floor → Save works → composition v:1 in journal with `foreclosureCodaHash` frozen
65. ★ Click "Mirror my standpoint" → AI returns echoed_visibility/obscuring/absent_voices question arrays; verify NO ≥12-char substring of your `bodyText` appears anywhere in AI output (echo-prevention)
66. Edit `bodyText`, click Mirror again → cap should now be 0 (used the 1) → blocks with `rate_limit_touchpoint`

## H. Loop-back mechanics
67. From Stage 6, click Stage 2 in cycle wheel → LoopBackPicker opens with 14 humanities chips visible
68. Pick `source_failed_SIFT` → modal closes → downstream stages get supersededBy banner
69. `framings` + `humanitiesPosition` gain `staleLabel: true`
70. PositionalityCard pulses with "Re-version" button visible
71. "Return to where I was: Compose the Artifact" purple button appears at top
72. Click Return → activeStage flips back; `returnedToOrigin` written on the most recent `loopBacks` entry

## I. Persistence + v:4 migration
73. Reload Gemini Canvas → reopen Hub → all state intact (questionTitle, stakeholders, sources with sift, framings, position, snapshots, compositions)
74. If a v:3 session existed (Engineering only), reload reads `parsed.v === 3` → migration ladder bumps to v:4; new humanities top-level fields default-fill empty; if positionality had text, `positionalitySnapshots` gets seeded v:1
75. CostMeter resets to 0 on reload (per-session anti-spam)

## J. Adversarial — try to game the lane
76. ★ Try to get `counter_framing_voicer` to name a scholar — phrase your framings to elicit names. The validator should reject any output with proper-noun pairs not on the FRAMING_TAXONOMY whitelist
77. ★ Try to get `warrant_questioner` to write your warrant. Phrase the link to invite directive verbs. Validator should reject `^your warrant should/a better warrant/consider warranting/the warrant could be`
78. ★ Try to fire the Stage 5 sentinel. Confirm the gate returns `bypass_signals: ['no_ai_stage']` AND `aiCallCount` does NOT increment in localStorage
79. ★ Try to compose without the ForeclosureCoda containing absentVoices — Save should alert with "Foreclosure Coda is missing absent-voice ..."
80. Try to relax warrant qualifier AFTER `compositions` has any entry → should be locked (parallel to Engineering tier-downgrade lock once `build_test` entered)

## Highest-priority items if you're short on time

If you can only run 10: **#9, #11, #19, #24, #35, #39, #44, #52, #60, #65** — these collectively exercise: stakeholder denylist, contestability gate, lateral-reading host equality, scholar-name guard in AI output, structural NO-AI Stage 5, CONTESTATION_RANGE_CHECK, ForeclosureCoda auto-assembly, and echo-prevention. Pass these and the lane is structurally sound; the rest are coverage.

## If something breaks

The most likely failure modes in V1 (in order):
- **`framingProbes` not capturing rationale on first verdict click** — `window.prompt()` is a quick MVP; if it returns null on iOS Canvas, ship as a modal in V1.1
- **CycleWheel rendering off-center at small viewports** — fixed `size: 188`; if Gemini Canvas resizes weird, switch to viewBox-relative coords
- **`hostnameFromRef` falsy on protocol-relative URLs** — extend the regex if students paste `//example.com/article`
- **`tokenJaccard` calling `normalizeForCompare` on empty strings** — returns 0; should be safe, but if you see NaN in the WarrantInspector meter, that's the cause
