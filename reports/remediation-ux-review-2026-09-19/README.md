# Remediation UI/UX and Canvas pacing review — 19 September 2026

**Follow-up:** approved changes are implemented; see [implementation and validation](IMPLEMENTATION.md).

Recommendation: add an advanced control for **proactive request pacing**, after correcting the waiting-state and run-reset defects below. Keep pacing enabled by default for Canvas until a real-provider comparison establishes a better default. A control cannot disable Google's service-side limits.

This was a review, not an implementation pass. Application sources were left unchanged. Existing unrelated edits were preserved.

## Evidence and scope

- Reviewed canonical remediation workspace, review, view, pipeline, and Gemini transport sources.
- Rendered the compiled remediation modal with the current application CSS at 1280 × 900 and 390 × 844 using controlled input/results. No browser JavaScript errors occurred. These are fixture states, not a full upload-to-download production run.
- All **69 existing focused tests passed** across gemini_pacing_stagger, gemini_gate_canvas_hold_signature, gate_canvas_refinements_2026_09_02, and remediation_workspace.
- Added a review-only fake-clock reproduction that demonstrates retained hold state after reset and uncounted proactive waiting. No live AI requests were made.
- The existing browser fixture referenced an obsolete CSS filename; this review harness resolves the currently installed main stylesheet. The existing test file was not modified.

## Findings, in priority order

### 1. P1 — A previous document's hold/probe state survives the next run's reset

`doc_pipeline_source.jsx:8290` resets the main breaker, counters and pacing, but does not clear `_geminiHoldStreak` or `_geminiHoldGateArmed` (introduced near line 7566). The call wrapper at line 9146 sends a probe whenever that flag is set.

Reproduction: after three held authentication failures, the hold streak is 3 and probe flag is true. After `_resetGeminiBreaker()`, authStreak is 0 and storming is false, but holdStreak remains 3 and holdGateArmed remains true. A subsequent run can therefore incur an unnecessary probe, or fail that probe before its document request is attempted, despite the rest of the controller reporting a clean start.

Fix: reset the hold streak, probe flag and pending attempt duration at the same safe run boundary. Preserve the existing rule that an overlapping active run prevents resetting the shared gate. Add a cross-document reset regression.

### 2. P2 — Healthy local queueing is presented as a provider rate-limit cooldown

`doc_pipeline_source.jsx:7971` pulses any owned request that remains queued after five seconds. `_pulsePipelineWatchdog` at line 8835 unconditionally emits `status: throttled` and “Rate-limit cooldown in progress.” The queue may simply be full, or the proactive rolling budget may be delaying it; no provider error is required. The workspace header and activity box then reinforce this explanation.

Fix: expose a structured wait reason: processing another request, preventive pacing, provider backoff, or recovery check. Show a countdown where the gate knows the deadline. Do not describe a timeout/empty response as a confirmed quota limit; “AI service is not responding reliably; retrying more slowly” is more accurate when the cause is inferred.

### 3. P2 — Proactive pacing is substantial and broader than its heavy-document description

`doc_pipeline_source.jsx:8370` defaults paced runs to **five request starts per 180 seconds**, in addition to a concurrency ceiling and stagger. The opening PDF/image audit enables that policy unconditionally at line 19435; it is not limited to large/scanned documents. Remediation separately enables it for scanned documents or at least eight pages around line 28000. The opening-audit comment claiming only a few seconds of added delay understates what can happen after the fifth call.

Reproduction: five fast successful slot admissions, followed by a sixth request, leave that sixth request queued even after another two minutes, with no requests in flight and no cooldown. This demonstrates a real source of local delay; it does not establish whether removing the delay improves completion time under actual Canvas load.

The pacing function only exempts host transports explicitly declaring `pacingExempt`. It does not otherwise select this rolling limit based on Canvas versus direct API. Make the policy transport-aware; local inference should keep its separate serial policy.

### 4. P2 — “Rate-limit waiting budget” does not describe all the waiting users experience

The default is 18 minutes (`doc_pipeline_source.jsx:7631`; host state in `AlloFlowANTI.txt:26477`). The budget reads `_throttleCooldownMsTotal`, while proactive rolling waits in `_geminiPump` do not increase that total. The fake-clock example remains at **0 ms spent** after two minutes of actual preventive waiting.

There is a second accounting concern: breaker trips add the entire scheduled cooldown (lines 8153 and 8184) rather than measuring elapsed waiting. Overlapping scheduled cooldowns can therefore overstate elapsed time. The current control is neither an overall runtime limit nor an exact wall-clock waiting limit.

Fix: display active processing, preventive wait and recovery wait separately. If the control remains a recovery-only budget, name it “Pause after repeated AI service delays” and explain what counts. For a user-facing duration limit, measure actual non-overlapping elapsed waits and show time used/remaining.

### 5. P2 — The result screen repeats navigation and next actions

The rendered partial-result state has header navigation, a preservation-review card, a verification card, a second row of navigation chips, another “Needs review” label, a “What now?” strip, and repair actions above them. Verification honesty is good, but the next decision competes with many equally prominent controls. The partial result also retains a prominent green outer frame.

Fix: one outcome card with verification coverage and one primary next action. For incomplete AI coverage, lead with “Retry missing verification”; for genuine manual findings, lead with “Review N findings.” Group secondary actions into Review, Download and Advanced. Retain evidence, preservation checks and manual controls behind those groups. Make the container tone follow the result state.

### 6. P3 — Advanced settings are legible but too dense and score-focused

The desktop and phone renders show many 10–11 px labels/help strings. The panel mixes audit effort, score target, fix rounds, OCR language, waiting, auto-continue and polish. “Research-grade” and “Near-perfect” imply assurance that a pass count or score alone cannot establish. On mobile, the floating Log control overlaps the auto-continue text in the captured viewport.

Fix: group settings into Quality & effort, Scanned documents, and AI connection & recovery. Increase helper-text size and line height. Use factual labels such as “More audit passes” and “Target: 95/100,” with verification status providing assurance. Move diagnostics into a reserved toolbar area so it cannot cover controls.

## Proposed advanced control

**Extra request pacing** — on by default for Canvas.

Help text: “Space out requests to reduce interruptions. Turning this off removes preventive delays. AlloFlow still slows down when the AI service returns errors or asks it to wait.”

- Off removes the proactive rolling-start budget and extra start spacing for the selected remote transport. Keep bounded concurrency, Retry-After handling, error backoff, cancellation, checkpoint/resume and honest verification requirements.
- Do not change the number of audits, chunks or verification checks when the control changes.
- Freeze the selection for a run; changes take effect on the next run. Save it with batch settings/checkpoints and include it in diagnostics. Make an off setting visible in the run summary.
- Do not route this control through the host's broad `pacingExempt` profile: that profile has other behavior. Use a dedicated user preference.
- Avoid a global “Disable throttling” label. It would imply that Google-enforced limits and browser background behavior can be disabled here.

Google documents that API limits depend on factors including usage tier and that actual capacity varies: [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Those API docs do not establish a reliable quota for the Canvas proxy. The app's fixed five-per-three-minute policy is therefore a local heuristic, not a provider guarantee.

Before changing the default, compare the same representative small, long and scanned documents with pacing on/off. Record total time, actual queue wait, provider errors, retries, completed coverage and preservation results. Prefer the mode that improves time to a verified result, not just request-launch speed.

## Suggested order

1. Correct run reset and wait-reason reporting.
2. Make wait accounting truthful and visible.
3. Add the scoped pacing control and transport-aware defaults.
4. Consolidate results and improve settings typography.

## Artifacts

- `tests.json`: 69 passing existing regressions.
- `gate-review.cjs` / `gate-review.json`: isolated controller reproduction.
- `review.cjs` / `browser-review.json`: current compiled UI harness, text and console findings.
- `settings-desktop.png`, `settings-phone.png`, `results-desktop.png`, `results-phone.png`: screenshots.

No application implementation, deployment, or live-provider performance claim is included in this review.
