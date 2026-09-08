# IT support enhancements — September 8, 2026

Implemented locally in AlloBot Screen Coach. The main page, shared Video Studio module, shared popup helpers, and their desktop copies are synchronized. Existing unrelated Video Studio popup edits were preserved.

## What changed

- Screenshots carry an immutable canvas, timestamp, dimensions, and change signature. Responses are discarded when the shared screen changes during inference. Saved step images annotate the analyzed canvas rather than a later video frame. Subsequent screen changes hide stale highlights in the main, floating, and desktop surfaces. Screen-change detection considers local changes as well as average brightness.
- The first-use action now focuses Start watching before asking for consent, and asks for a stated goal. The standalone AI setup opens visibly. Find available models uses the saved endpoint; Test saved AI settings sends a synthetic image to check image-reading capability. The selected model is used for both vision and chat.
- A current-step card includes the expected visible result and analyzed-image time. I did this, Still stuck, and Wrong highlight record user feedback and pause automatic progression. Export is available outside the advanced controls.
- Optional support intake captures issue category, application/version, device/browser, exact error, expected/actual behavior, and attempted fixes. Common-issue hints favor reversible checks. Chat and screen prompts include this context, and identify when administrator help may be needed.
- Chat includes the goal and last coaching step as historical text, without silently requesting another screenshot. Check my screen now explicitly requests a new image. Both bridge and standalone chat use a shared structured-response policy and learner checks. The full chat answer is inspected rather than only its first 400 characters. Pending answers are cancelled when task context changes; educator notes are cleared when switching to learner mode.
- Chat keeps Send focusable while busy, offers Cancel answer, and explicitly labels answers with no web sources as unverified model guidance. Localhost, app-forwarded processing, and remote search/microphone routing are described without claiming that a local endpoint guarantees local processing.
- Session notes and user-confirmed outcomes survive stopping screen sharing and remain available for local export or a copyable support summary. Earlier sessions are not fed into a new model request. Retaining step images requires the explicit image-retention option. Discard clears notes and retained images. Closing the page clears in-memory state.
- Spoken replies are read in chunks instead of being silently truncated at 500 characters. Microphone resumption waits for speech completion; its watchdog checks actual speaking/pending state. Stop speaking is available. Unsupported speech input is disabled upfront. Guidance and speech language can be English, Spanish, French, or Portuguese; the surrounding interface remains English.

## Validation

- **317 tests passed** across `tests/it_coach.test.js`, `tests/it_coach_runtime.test.js`, and `tests/video_studio.test.js`.
- Added **22 behavioral regressions** covering first use, stale responses, immutable screenshot annotation, later screen changes, small menu changes, floating-preview invalidation, consent withdrawal, desktop preparation races, chat task context, learner output handling, full-length answer checks, source disclosure, cancellation/focus, role transitions, synthetic vision testing, model discovery, long spoken answers, retained export, and discard.
- `git diff --check` passes for the changed source, desktop copies, and tests.
- Browser inspection at desktop and 390px phone width. A simulated support session using a synthetic canvas and stub AI verified visible current guidance, expected outcome, chat with the prior-step context and exactly one vision request, search fallback wording, and visible/enabled export plus a user-outcome summary after Stop watching. The phone layout measured 390px content width in a 390px viewport.
- No real screen content was sent to a live AI provider during validation. Real-model guidance accuracy, browser speech-service behavior, and native desktop overlay positioning still require live evaluation. The learner classifier remains a conservative model classification plus phrase-based backstop, not a guarantee of semantic correctness.

## Follow-up opportunities

A curated real-model task benchmark, full interface localization, and verified downstream routing remain follow-ups. Crop/redaction and app-reported provider/model labels were implemented in the second pass below. No deployment was performed.


## Second pass: screenshot review and provider transparency

- Optional Review screenshot before sending freezes a frame locally before any send consent or AI call. Users can select a crop or cover up to 20 private areas using dragging or keyboard-accessible percentage fields. Undo and Reset are available, and the outgoing image has its own preview.
- Sending requires both approval of the edited image and the existing privacy confirmation. Edits reset image approval. Cancelling, ending the share, changing the goal, or changing the app's AI configuration clears pending review images. A changed shared screen prevents an outdated reviewed image from being sent.
- Cropping and opaque black redaction happen in the actual canvas encoded for the model. Retained step images use that edited canvas. Crop-relative model targets map back to full-screen coordinates; targets overlapping hidden areas are suppressed. Freshness comparisons apply the same crop and masks to the current screen.
- The authenticated app bridge reports a whitelist of backend, provider, text model, vision model, and fallback model labels. API keys and endpoint URLs are not included. Configuration changes invalidate pending coach context and screenshot consent. The UI describes these as app-reported settings, not proof of the final processing destination.
- The affected host bridge was rebuilt using the existing first-wave module builder. All five root/desktop pairs match: coach HTML, screenshot helper, Video Studio module, Video Studio popup, and host bridge module.

### Second-pass validation

- **340 tests passed, 0 failed** across the coach contract, runtime, image geometry, provider profile, and shared Video Studio suites. This adds 23 tests to the first pass. Results: it-coach-test-results.json.
- Reproducible browser QA: run node dev-tools/it_coach_review_browser.cjs. It intercepts page assets locally and uses a synthetic shared canvas and stub AI; no real screenshots or questions are sent to a live model.
- Real Chromium canvas/JPEG checks verified a 640 × 720 crop, opaque redaction pixels in the outgoing image (allowing normal JPEG rounding), one explicit vision request, a displayed suggestion, and no horizontal overflow at 390px. Mobile screenshot visually inspected. Evidence: it-coach-browser-review/results.json and desktop-review.png/mobile-review.png.
- The broader first_wave_cdn_extraction suite's existing startup-host assertion fails because its expected extracted component reference is absent in the already-modified host. Its rebuild parity and runtime export tests pass. The focused provider suite independently verifies the changed host module's source build, desktop mirror, safe-label whitelist, and live configuration reads. The unrelated startup host was left unchanged.
- Model guidance quality and native desktop overlay placement were not assessed against a live AI service. Screen freshness remains a sampled visual comparison, not an exact pixel-change guarantee.
