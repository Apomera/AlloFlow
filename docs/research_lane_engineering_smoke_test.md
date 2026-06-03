# Tier 3 Engineering lane (Constraint Forge) — manual smoke test

**Run this in the deployed Gemini Canvas** once `deploy.sh` ships the Engineering lane to the CDN. Companion to `docs/research_lane_engineering_design.md`.

Each numbered item is one observation; cross it off as you go.

## A. Hub still works (regression check first)
1. Open Learning Hub Modal → click the 7th tile → Research Hub opens.
2. **CostMeter** is hidden (no AI calls used yet); **DevLevelSelector** shows "6–8" default.
3. The three lane tiles render: Scientific Inquiry (no placeholder badge), Engineering Design (no placeholder badge — was there last deploy), Humanities (placeholder badge until Tier 4 deploys).
4. Click Scientific → workspace loads (was already shipping; just verifying I didn't break it with the substrate v:3 patch).
5. Back to lane selector.

## B. Engineering lane loads
6. Click Engineering Design tile → the lane workspace renders (NOT the "shipping next" placeholder).
7. Header shows hex-ring cycle wheel with 6 stages: Define, Develop, Plan, Build, Optimize, Share.
8. Educator panel collapsible visible above the wheel.
9. Active stage = `define_problem`.

## C. Define Problem — structural gates
10. **StakeholderCard** renders in edit mode at the top.
11. Try entering "students" as stakeholder name → red error "Too generic — pick a specific person, not a category."
12. Enter a real name (e.g. "Ms. Patel"), pick `accessNote = "direct"`, `epistemicStatus = "interviewed"`, justification ≥40 chars → Save button enables → save succeeds.
13. Try adding a criterion with no unit → save disabled. Add one with unit = "potato" → red "Unit not recognized" error.
14. Add a valid criterion (e.g. name "final serve temperature", unit "°C", target 55, direction "maximize", kind "physical-safety").
15. Try adding a constraint with target = "good" → save disabled. Add one with source = "budget" and target = 1500 → yellow "is this threshold binding?" banner appears; can't save without checking the box.
16. Add 2 hard constraints with valid units. **ConstraintCoverageBar** shows them as untested-hard (red dots).

## D. Constraint excavator AI (first touchpoint)
17. With ≥2 criteria + ≥2 hard constraints + stakeholder + exemplar viewed → click "Surface constraints I may have missed".
18. AI panel renders with **SuggestionBadge** + 4 question categories (missing_dimension, stakeholder_voice, measurability, binding_threshold).
19. **CostMeter** appears showing AI questions remaining.
20. Try clicking the button again → blocked at PER_TOUCHPOINT_CAP=2 after second use.

## E. Develop Candidates — anti-magical gate
21. Click Develop tile in cycle wheel → loop-back picker should NOT appear (forward navigation is direct).
22. Try saving a candidate with `constraintsPunted` empty → red "Claims to satisfy every constraint — punt at least one" inline error blocks save.
23. Save 3 distinct candidates, each punting ≥1 constraint, with different materials.
24. **Decision matrix grid** renders with 3 candidates × N criteria. Dominated rows greyed.
25. Fill ALL cells with score + reason. Reasons must differ within candidate → if two reasons are identical, gate should block at AI invocation.

## F. Plan Test — no AI by design + trade-off declaration
26. Click Plan → workspace shows trade-off slider + protocol per criterion.
27. **No primary "Ask AI" button** on this stage (confirm the `plan_no_ai_note` text is visible).
28. Trade-off declaration: write text mentioning ONE criterion only → token count shows 1 → still blocked because needs 2 distinct names.
29. Write declaration mentioning gained + sacrificed by name → count shows 2.
30. Trade-off slider: pick two distinct constraints, set rank, set `whoseInterestThisServes`. Cannot save with `whoseInterestThisServes` = stakeholder name verbatim.

## G. Build & Test — measurement + tier lock
31. Click Build → workspace shows **BuildLogTimeline** (empty), **ConstraintCoverageBar**, build-version logger.
32. Save build v1. Try editing an existing hard constraint and downgrading to soft → **input disabled** with "Hard → softer is locked after Build" note.
33. Log test runs (numeric measured values per criterion). At least one should pass, one should fail (you control this).
34. **ConstraintCoverageBar** updates: green for measured-pass, red for measured-fail.

## H. Optimize — failure loop + AI critic timing
35. Click Optimize → see failed test run available.
36. Add failure-log entry: pick the failed run, mode text ≥25c, cause ≥30c, changed variable (from/to), predicted effect ≥25c.
37. **AI critique BEFORE retest**: with `retestRunId` still null, click "What failure modes am I missing?" → AI fires with no imperative verbs (try/use/add/change should NOT appear in any question).
38. Loop back to Build → log a retest with <5% change from original → reconcile button should still appear but indicate the delta is too small.
39. Log a retest with >5% change → attach retest → reconcile prediction-vs-reality.

## I. Communicate — triple-anchored claims + safety override
40. Click Share → rationale ≥160c, accountability statement ≥120c.
41. Add 2 design claims. Verify labels: `meets_criteria`/`partial`/`not_yet` should all be available.
42. **Epistemic block test**: loop back to Define, change stakeholder `epistemicStatus` to `"invented"`, return → the `"meets_criteria"` label should disappear from the enum (only `partial` / `not_yet` selectable).
43. **Safety override test**: have an unmet safety constraint → must label all claims `partial`/`not_yet` regardless.
44. Click "Questions my stakeholder would ask" → AI returns per-claim probes + follow-up questions, no approval verdicts.

## J. Loop-back mechanics
45. Click an earlier-stage cycle node → **LoopBackPicker** modal opens with engineering chips (`constraint_missed`, `stakeholder_voice_changed`, etc.).
46. Pick chip → modal closes → downstream stages get superseded-by banner; criteria/constraints/designClaims get `staleLabel`.
47. After editing upstream, persistent "Return to where I was" button appears.

## K. Persistence
48. Reload Gemini Canvas → reopen Research Hub → all your inquiry journal state should still be there (criteria, constraints, candidates, builds, runs, claims).
49. CostMeter resets to 0 (per-session anti-spam, documented).

## What to do mid-test

- Open the browser console. Watch for any `[ResearchLaneEngineering]` warnings or errors during register. Should see `[CDN] ResearchLaneEngineering registered (Tier 2)` on first hub open.
- If a stage gate misbehaves (e.g. blocks when it shouldn't), the `aiHistory` array in localStorage has `gate_reason` + `bypass_signals` which reveal which check failed.

## After smoke test

If anything breaks, send the symptom + (if possible) the specific item number above. The fixes most likely to be needed in V1 (in order of probability):
- Computed property syntax `[c.id]: ...` if your Gemini Canvas runtime is older than ES2020 → easy esbuild target downgrade
- DevLevelSelector default mismatch with the dev-floor map → 1-line fix
- Pareto-dominance hint rendering when criteria scores are all unset → null check
- LoopBack chip preload (`stakeholder_reframe`) not pre-selecting → small UX fix
