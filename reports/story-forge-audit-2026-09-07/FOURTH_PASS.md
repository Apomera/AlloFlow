# Story Forge: reliable AI feedback and recovery

Implemented and rebuilt locally; not deployed.

- AI feedback is validated before rendering or marking a draft reviewed. Invalid objects, missing written feedback, invalid scores, duplicate criteria, malformed vocabulary feedback, and oversized collections are rejected with a recovery message. Text fields are bounded.
- The displayed total is calculated from validated five-point criterion scores instead of trusting a potentially contradictory total returned by the service.
- Feedback requests capture the draft's review context. Results from before edits, project-context changes, closure, or cancellation cannot replace the active review. A cancelled request cannot clear the loading state of a newer request.
- Added visible preparation status, Cancel feedback, Retry feedback, and Return to self-check. Recovery choices share one compact card. Cancellation stops application of the response; it does not promise to abort an underlying service request or refund usage.
- Existing writing and manual review remain available after malformed responses or network failures.

## Verification

Six new behavioral unit tests validate feedback normalization and rejection boundaries. Full-suite results are saved in `fourth-pass/tests.json`.

`verify-fourth-pass.cjs` exercises malformed responses, rejected requests, cancellation, late cancelled results during a newer request, calculated totals, edits during feedback, and manual self-check recovery. All browser assertions passed without JavaScript errors. The mobile recovery screen was visually inspected.

The existing comic browser regression also passed, including dialogue and vocabulary in feedback and zero automated accessibility violations on its tested surface. Browser tests use synthetic content and controlled responses in isolated Chromium, not a live AI service or deployed host.
