# IT Coach follow-up improvements — September 19, 2026

Implemented in the standalone coach, app bridge prompt, shared advice sanitizer, and matching desktop copies. Unrelated Video Studio export changes in the workspace were preserved.

## Improvements

- **Resolution is user-confirmed.** “I did this” records a completed step; “This solved my problem” records resolution of the goal. A model's completion claim asks the user to check the result. Confirmation pauses automatic guidance and speech, cancels pending vision/chat work, and clears pending screenshot review.
- **Observations remain with the step.** Users can save a short account of what changed or which error remains. Notes accompany future requests and appear alongside expected and reported results in support summaries and walkthrough exports. Saving notes is local and makes no AI request.
- **Recent results inform later advice.** Requests include bounded recent step outcomes, with the newest feedback first. Previous sessions remain available for export but do not enter a new task's model context.
- **Unsuccessful steps do not loop unchanged.** An exact repeat of a recent step marked “Still stuck” is suppressed for manual and automatic requests. The user can explain the result in chat or prepare a support handoff. This is an exact-text check, not a guarantee against semantically similar repetition.
- **Clarification and escalation are explicit.** The optional `nextAction` field distinguishes action, clarification, escalation, and verification. Clarification offers “Answer in chat”; escalation offers support notes. These response types clear any model-supplied target and stop automatic progression. Learner restrictions still run before the new field is handled. Older responses without the field continue to work.
- **Feedback invalidates old replies.** Updating an outcome or observation cancels pending AI work so a late answer cannot replace the latest user report.
- **The interface adapts to the situation.** Step-completion controls are hidden when the coach is asking a question, wrong-highlight feedback is hidden without a target, and the observation field follows the existing dark theme and phone layout.

## Validation

- Added 17 tests: 11 runtime cases and six shared sanitizer cases.
- The six focused coach suites pass 171 tests, including screenshot review, provider metadata, and benchmark regressions. The host was slow enough to exceed the default five-second limit in two existing tests; the rerun used a 30-second limit and passed.
- All 21 relevant shared Video Studio coach, shared-block, and mirror checks passed when run separately. Result files are `it-coach-followup-focused-results.json` and `it-coach-followup-shared-results.json`.
- Chromium QA verifies saved observations in summaries, clarification with no highlight, focus moving to chat without sending, explicit resolution, actual cropped/redacted outgoing image pixels, and no horizontal overflow at 390px. Evidence is in `it-coach-browser-review/follow-up-results.json` and `mobile-follow-up.png`.
- Root/desktop copies match, and the targeted whitespace check passes.
- The full shared Video Studio suite has one unrelated export contract failure: it expects the literal `outputContainer: lastExport.outputContainer`, while the separate export work now uses the captured `exported.outputContainer`. That code and assertion were left unchanged.

No live-model accuracy claim, commit, or deployment was made. The Gemini benchmark remains ready for live collection when its browser connection is available.
